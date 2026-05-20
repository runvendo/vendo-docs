#!/usr/bin/env node
/**
 * build-integrations.mjs — monorepo-sourced generator for the per-provider
 * integration pages under `content/docs/integrations/`.
 *
 * Source-of-truth model
 * ---------------------
 *
 *   `$VENDO_MONOREPO/packages/integrations/<slug>/catalog.json` drives the
 *   catalog-facing fields (name, description, category, supported_profiles,
 *   default_profile, proxy_base_url, marketing.about, docs_url, logo_url).
 *
 *   `$VENDO_MONOREPO/packages/integrations/<slug>/integration.ts` drives the
 *   runtime env-var contract via its `connectionEnvVars: ConnectionEnvVarMap`
 *   export. This replaces the legacy prod `integrations.env_bootstrap` DB
 *   column, which has lagged the in-repo source since the `connectionEnvVars`
 *   rewrite landed (see PR notes around `262_hermes_release_3_0_6.sql`).
 *
 *   The DB dependency has been dropped entirely. The script runs against a
 *   vanilla monorepo clone — no Infisical / psql / prod credentials needed.
 *
 * Hand-written prose between `{/* PROSE-START *\/}` and `{/* PROSE-END *\/}`
 * is preserved across re-runs. The link list inside index.mdx between
 * `{/* LIST-START *\/}` / `{/* LIST-END *\/}` is auto-rewritten.
 *
 * Outputs are committed to git — Cloudflare Pages does not run this script at
 * build time. Re-run locally whenever the monorepo's
 * `packages/integrations/<slug>/{catalog.json,integration.ts}` change.
 *
 * Usage:
 *   VENDO_MONOREPO=/path/to/vendo node scripts/build-integrations.mjs
 *
 * Defaults `VENDO_MONOREPO` to `/Users/yousefh/Desktop/Cool Code/vendo` if
 * unset (the canonical local checkout). `VENDO_INTEGRATIONS_DIR` is still
 * honored for back-compat — if set it takes precedence and should point at
 * `packages/integrations/` directly.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const OUT_DIR = join(REPO_ROOT, "content", "docs", "integrations");
const INDEX_PATH = join(OUT_DIR, "index.mdx");
const META_PATH = join(OUT_DIR, "meta.json");

const PROSE_START = "{/* PROSE-START — hand-edited; the generator preserves this block */}";
const PROSE_END = "{/* PROSE-END */}";
const LIST_START = "{/* LIST-START — replaced by scripts/build-integrations.mjs */}";
const LIST_END = "{/* LIST-END */}";

const DEFAULT_MONOREPO = "/Users/yousefh/Desktop/Cool Code/vendo";

const INTEGRATIONS_DIR = (() => {
  if (process.env.VENDO_INTEGRATIONS_DIR) return resolve(process.env.VENDO_INTEGRATIONS_DIR);
  const monorepo = process.env.VENDO_MONOREPO
    ? resolve(process.env.VENDO_MONOREPO)
    : DEFAULT_MONOREPO;
  return join(monorepo, "packages", "integrations");
})();

if (!existsSync(INTEGRATIONS_DIR)) {
  console.error(
    `ERROR: integrations dir not found at ${INTEGRATIONS_DIR}. Set VENDO_MONOREPO to the path of the vendo monorepo, or VENDO_INTEGRATIONS_DIR to packages/integrations/ directly.`,
  );
  process.exit(1);
}

// ---------- 1. Walk monorepo for enabled catalogs ---------------------------

function discoverIntegrations() {
  // Each subfolder of `packages/integrations/` is one slug (or a non-slug like
  // `composio` / `lib` / `litellm-aliases` — those don't have a catalog.json
  // and are skipped). For every slug with an enabled catalog.json we also
  // require an integration.ts so we can extract connectionEnvVars.
  const entries = readdirSync(INTEGRATIONS_DIR);
  const out = [];
  for (const entry of entries) {
    const folder = join(INTEGRATIONS_DIR, entry);
    const stat = statSync(folder, { throwIfNoEntry: false });
    if (!stat || !stat.isDirectory()) continue;
    const catalogPath = join(folder, "catalog.json");
    if (!existsSync(catalogPath)) continue;
    let catalog;
    try {
      catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
    } catch (err) {
      console.warn(`WARN: failed to parse ${catalogPath}: ${err.message}`);
      continue;
    }
    if (!catalog || catalog.enabled !== true) continue;
    if (catalog.slug !== entry) {
      console.warn(
        `WARN: ${catalogPath} declares slug="${catalog.slug}" but lives in folder "${entry}" — skipping.`,
      );
      continue;
    }
    const integrationTsPath = join(folder, "integration.ts");
    let envVars = null;
    if (existsSync(integrationTsPath)) {
      try {
        envVars = parseConnectionEnvVars(readFileSync(integrationTsPath, "utf8"));
      } catch (err) {
        console.warn(`WARN: failed to parse connectionEnvVars in ${integrationTsPath}: ${err.message}`);
      }
    } else {
      console.warn(`WARN: ${integrationTsPath} missing — env-vars table will be empty.`);
    }
    out.push({ catalog, envVars });
  }
  out.sort((a, b) => a.catalog.slug.localeCompare(b.catalog.slug));
  return out;
}

// ---------- 2. Parse connectionEnvVars from integration.ts ------------------

/**
 * Extract the `connectionEnvVars` object literal from a TypeScript source
 * string. We're not running a full TS parser — the structure is always:
 *
 *   const connectionEnvVars: ConnectionEnvVarMap = { ... };
 *
 * with plain object literals nested inside (string keys / string values /
 * boolean values). We brace-balance from the `=` to the matching `}` and
 * then strip the TS-only bits before `JSON.parse`-ing.
 *
 * Returns a `Record<profile, Record<envName, descriptor>>` where descriptor
 * is `{ source: { type, path? }, isSecret }`.
 */
function parseConnectionEnvVars(tsSource) {
  const re = /const\s+connectionEnvVars\s*:\s*ConnectionEnvVarMap\s*=\s*/;
  const match = re.exec(tsSource);
  if (!match) throw new Error("no `const connectionEnvVars: ConnectionEnvVarMap = ` declaration found");
  let i = match.index + match[0].length;
  // expect an opening brace
  while (i < tsSource.length && /\s/.test(tsSource[i])) i++;
  if (tsSource[i] !== "{") {
    throw new Error(`expected '{' at offset ${i}, got ${JSON.stringify(tsSource[i])}`);
  }
  const start = i;
  // brace-balance walk that respects strings + line comments
  let depth = 0;
  let inString = null; // null | '"' | "'"
  let inLineComment = false;
  let inBlockComment = false;
  while (i < tsSource.length) {
    const ch = tsSource[i];
    const next = tsSource[i + 1];
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") { inBlockComment = false; i += 2; continue; }
      i++;
      continue;
    }
    if (inString) {
      if (ch === "\\") { i += 2; continue; }
      if (ch === inString) { inString = null; i++; continue; }
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") { inString = ch; i++; continue; }
    if (ch === "/" && next === "/") { inLineComment = true; i += 2; continue; }
    if (ch === "/" && next === "*") { inBlockComment = true; i += 2; continue; }
    if (ch === "{") { depth++; i++; continue; }
    if (ch === "}") {
      depth--;
      i++;
      if (depth === 0) break;
      continue;
    }
    i++;
  }
  if (depth !== 0) throw new Error("unbalanced braces walking connectionEnvVars literal");
  const literal = tsSource.slice(start, i); // includes outer { }

  // Now convert the JS object literal → JSON. The structure uses single-token
  // identifier keys (KEY: { source: ... }), single quotes, and trailing
  // commas in some places. To stay robust against future tweaks we just
  // `Function`-eval it — the source is committed monorepo TS, not untrusted
  // input. (If you're auditing this: yes, we are evaling a string from a
  // local file path you control. We are not fetching it from the network.)
  let parsed;
  try {
    // `new Function` is significantly cheaper than spawning a tsx subprocess
    // and avoids a runtime dependency. The object literal is pure JS — no
    // imports, no types, no statements other than the `return`.
    parsed = new Function(`return (${literal});`)();
  } catch (err) {
    throw new Error(`failed to evaluate connectionEnvVars literal: ${err.message}`);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("connectionEnvVars did not evaluate to an object");
  }
  return parsed;
}

// ---------- 3. Render helpers ----------------------------------------------

const PROFILE_LABELS = {
  vendo_managed_pool: {
    label: "Vendo-managed pool",
    description:
      "Vendo holds the upstream credential and bills per call against the tenant's Vendo balance. No tenant signup with the provider required.",
  },
  byok_static: {
    label: "Bring your own key",
    description:
      "Tenant uploads a static credential (token / API key). Vendo stores it encrypted and uses it at request time.",
  },
  oauth_app_install: {
    label: "OAuth (app install)",
    description:
      "Tenant grants permission via the provider's OAuth flow. Vendo stores the access token encrypted and calls the provider API directly.",
  },
  oauth2: {
    label: "OAuth2",
    description:
      "Tenant grants permission via OAuth2. Tokens refresh automatically when supported by the provider.",
  },
  composio_managed: {
    label: "Composio-managed",
    description:
      "Connection brokered through Composio. Tenant connects via the embedded Composio OAuth flow; Vendo issues a Composio session at request time.",
  },
};

function profileSection(profiles, defaultProfile) {
  const list = Array.isArray(profiles) ? profiles : [];
  if (list.length === 0) return "_No auth profiles registered._\n";
  let md = "| Profile | Default | How it works |\n| --- | --- | --- |\n";
  for (const p of list) {
    const info = PROFILE_LABELS[p] || { label: p, description: "_Undocumented auth profile._" };
    const isDefault = p === defaultProfile ? "Yes" : "";
    md += `| \`${p}\` (${info.label}) | ${isDefault} | ${info.description} |\n`;
  }
  return md;
}

/**
 * Render a human-readable label for a ConnectionEnvVarSource, matching the
 * `type` discriminator in `packages/integration-types/src/index.ts`.
 */
function formatSource(source) {
  if (!source || typeof source !== "object") return "—";
  switch (source.type) {
    case "credential":
      return "connection credential (encrypted at rest)";
    case "metadata":
      return `connection metadata: \`${source.path}\``;
    case "vendo_api_key":
      return "Vendo-issued API key (`vendo_sk_*`)";
    case "proxy_base_url":
      return "Vendo proxy base URL (`https://<slug>-proxy.vendo.run/v1`)";
    default:
      return `\`${source.type}\``;
  }
}

/**
 * Render the env-vars table for a single integration. `envVars` is the
 * parsed object from integration.ts — keyed by profile, then env-var name.
 *
 * Most integrations ship the same env vars under every supported profile
 * (e.g. anthropic's `byok_static` and `vendo_managed_pool` both inject
 * `ANTHROPIC_API_KEY` + `ANTHROPIC_BASE_URL`). We de-dupe across profiles
 * by env-var name, joining the profile list for any var that differs.
 */
function envVarsSection(envVars, supportedProfiles) {
  if (!envVars || typeof envVars !== "object") {
    return "_No environment variables injected._\n";
  }
  const profiles = Array.isArray(supportedProfiles) && supportedProfiles.length > 0
    ? supportedProfiles
    : Object.keys(envVars);

  // Collect: for each env-var name, the set of profiles that declare it and
  // the descriptors. If the descriptor is identical across all profiles
  // that declare it, render a single row; otherwise render one row per
  // (var, profile) pair.
  const byName = new Map(); // name -> Array<{profile, descriptor}>
  for (const profile of profiles) {
    const map = envVars[profile];
    if (!map || typeof map !== "object") continue;
    for (const [name, descriptor] of Object.entries(map)) {
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push({ profile, descriptor });
    }
  }
  if (byName.size === 0) return "_No environment variables injected._\n";

  const rows = [];
  // Deterministic ordering — sort var names lexicographically.
  const names = [...byName.keys()].sort();
  for (const name of names) {
    const entries = byName.get(name);
    // Group entries with structurally-identical descriptors so the table
    // doesn't repeat the same row N times for N profiles.
    const groups = new Map(); // key -> { profiles, descriptor }
    for (const e of entries) {
      const key = JSON.stringify(e.descriptor);
      if (!groups.has(key)) groups.set(key, { profiles: [], descriptor: e.descriptor });
      groups.get(key).profiles.push(e.profile);
    }
    for (const { profiles: gProfiles, descriptor } of groups.values()) {
      const secretFlag = descriptor && descriptor.isSecret ? "Yes" : "No";
      const profileList = gProfiles.length === profiles.length
        ? "all"
        : gProfiles.map((p) => `\`${p}\``).join(", ");
      rows.push({
        name,
        profiles: profileList,
        source: formatSource(descriptor && descriptor.source),
        secret: secretFlag,
      });
    }
  }

  let md = "| Variable | Profiles | Source | Secret |\n| --- | --- | --- | --- |\n";
  for (const row of rows) {
    md += `| \`${row.name}\` | ${row.profiles} | ${row.source} | ${row.secret} |\n`;
  }
  return md;
}

// Auth-mode dispatch.
//
// Two canonical SDK paths today:
//   - `vendo.token(slug)` — Vendo resolves the credential and returns the
//     value of the env var the upstream SDK expects. Used by everything
//     that talks to the upstream API directly (or via a Vendo proxy
//     subdomain): vendo_managed_pool, byok_static, oauth_app_install, oauth2.
//   - `vendo.data.execute(ACTION, args)` — Vendo brokers the call through
//     Composio against the tenant's connected account. Used by every
//     composio_managed provider; tool authors never see the raw credential.
//
// `default_profile` is the source of truth for which shape is canonical
// for this provider. A provider that supports both (uncommon today) still
// has a single default we render against; the auth-modes table below
// surfaces the alternatives.

function isComposioManaged(profile) {
  return profile === "composio_managed";
}

// Token-based quickstart — used for everything except composio_managed.
function tokenQuickstart(slug, tokenComment) {
  const varName = slug.replace(/[^a-zA-Z0-9_]/g, "_");
  const py = `import vendo

# ${tokenComment}
token = vendo.token("${slug}")

# Use \`token\` wherever you would have used the provider's API key —
# pass it to the official SDK or set it as the env var the SDK reads.
print(token)`;
  const ts = `import { Vendo } from "@vendodev/sdk";

const vendo = new Vendo();
// ${tokenComment}
const ${varName}Token = await vendo.token("${slug}");

// Use \`${varName}Token\` wherever you would have used the provider's API
// key — pass it to the official SDK or read it as the env var the SDK expects.
console.log(${varName}Token);`;
  const swift = `import VendoSDK

let vendo = Vendo()
// ${tokenComment}
let token = try await vendo.token("${slug}")

// Use \`token\` wherever you would have used the provider's API key.
print(token)`;
  return { py, ts, swift };
}

// Composio-action quickstart — used for composio_managed providers.
// We render an example action name in the shape <SLUG_UPPER>_<VERB> to hint
// at the convention; the real action name list lives at composio.dev. The
// `args` object is intentionally generic so the page never asserts a
// schema it can't verify.
function composioActionQuickstart(slug, providerName) {
  const actionPlaceholder = `${slug.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_<ACTION>`;
  const py = `import vendo
from vendo.errors import NotConnected, UpstreamError

# Vendo brokers the call through Composio against the tenant's connected
# ${providerName} account. Browse the action catalog at composio.dev for the
# full list of action names.
try:
    result = vendo.data.execute(
        "${actionPlaceholder}",
        { /* action-specific arguments — see composio.dev */ },
    )
except NotConnected as e:
    # Tenant hasn't connected ${providerName} — send them through the connect flow.
    connect_url = vendo.connect_url(e.slug)
except UpstreamError as e:
    # Composio or ${providerName} returned an error.
    raise`;
  const ts = `import { Vendo, NotConnected, UpstreamError } from "@vendodev/sdk";

const vendo = new Vendo();

// Vendo brokers the call through Composio against the tenant's connected
// ${providerName} account. Browse the action catalog at composio.dev for the
// full list of action names.
try {
  const result = await vendo.data.execute(
    "${actionPlaceholder}",
    { /* action-specific arguments — see composio.dev */ },
  );
} catch (e) {
  if (e instanceof NotConnected) {
    const connectUrl = vendo.connectUrl(e.slug);
  } else if (e instanceof UpstreamError) {
    throw e;
  }
}`;
  const swift = `import VendoSDK

let vendo = Vendo()

// Vendo brokers the call through Composio against the tenant's connected
// ${providerName} account. Browse the action catalog at composio.dev for the
// full list of action names.
do {
  let result = try await vendo.data.execute(
    "${actionPlaceholder}",
    [ /* action-specific arguments — see composio.dev */ ]
  )
} catch let error as NotConnected {
  let connectUrl = vendo.connectUrl(slug: error.slug)
} catch {
  throw error
}`;
  return { py, ts, swift };
}

function quickstartFor(defaultProfile, slug, providerName, tokenComment) {
  if (isComposioManaged(defaultProfile)) {
    return composioActionQuickstart(slug, providerName);
  }
  return tokenQuickstart(slug, tokenComment);
}

// Render the "Reading the credential at runtime" section.
//
// IMPORTANT — there are two different access paths depending on auth profile:
//
//   - Token-based profiles (vendo_managed_pool, byok_static, oauth_app_install,
//     oauth2): Vendo writes the env var into the deployment's environment at
//     boot via `deployment_env_vars` (kind='integration'). The upstream SDK
//     auto-discovers it. `vendo.token(slug)` reads the same value with
//     resolution-chain semantics (works in OSS mode too).
//
//   - composio_managed: Composio holds the upstream credential — Vendo never
//     gets a long-lived copy. The env_bootstrap row declares the SDK's
//     credential-projection shape, NOT a Railway env var. `process.env.X` is
//     undefined in the running container. To read the credential, call
//     `vendo.token(slug)` (live fetch from credentials.vendo.run) or the
//     canonical `vendo.data.execute(ACTION, args)`.
function runtimeAccessSection(envVars, providerName, composio, slug) {
  // Collect every env-var name across every profile, then pick the primary
  // — i.e. the first one that isn't a *_BASE_URL companion. Same heuristic
  // as the old env_bootstrap.primary, applied to the new ConnectionEnvVarMap.
  const names = new Set();
  if (envVars && typeof envVars === "object") {
    for (const map of Object.values(envVars)) {
      if (!map || typeof map !== "object") continue;
      for (const name of Object.keys(map)) names.add(name);
    }
  }
  const varName = [...names].find((n) => !n.endsWith("_BASE_URL"));
  if (!varName) return "";
  if (composio) {
    return `## Reading the credential at runtime

${providerName} is composio-managed, so Vendo never holds a long-lived copy of the upstream credential — Composio does. That means \`process.env.${varName}\` is **not** populated in your running container; the env-var row above describes the SDK's credential-projection shape, not a Railway env var.

To read the credential from your tool, call \`vendo.token("${slug}")\` (the SDK fetches a live access token from Composio at call time) or use the canonical [\`vendo.data.execute\`](/docs/guides/recipes/call-composio-action) path, which handles metering, connected-account resolution, and error normalization for you.
`;
  }
  return `## Reading the credential at runtime

Vendo writes \`${varName}\` (and any companion vars above) into your deployment's environment at boot — the official ${providerName} SDK auto-discovers it, so most code just instantiates the client with no extra wiring. \`vendo.token(slug)\` is the resolution-chain-aware alternative that reads the same value in Vendo mode and falls back to whatever you set in OSS mode; use whichever fits your style. See [Two modes](/docs/concepts/two-modes) for the full resolution chain.
`;
}

function preserveProse(slug, defaultProse) {
  const path = join(OUT_DIR, `${slug}.mdx`);
  if (!existsSync(path)) return defaultProse;
  const existing = readFileSync(path, "utf8");
  const startIdx = existing.indexOf(PROSE_START);
  const endIdx = existing.indexOf(PROSE_END);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return defaultProse;
  return existing.slice(startIdx + PROSE_START.length, endIdx).trim();
}

// ---------- 4. Render: catalog-driven page ----------------------------------

function renderPage(catalog, envVars) {
  const slug = catalog.slug;
  const proxy = typeof catalog.proxy_base_url === "string" && catalog.proxy_base_url.length > 0
    ? catalog.proxy_base_url
    : null;
  const tokenComment =
    catalog.marketing && catalog.marketing.tagline
      ? catalog.marketing.tagline
      : "Returned token is the credential for this provider.";
  const examples = quickstartFor(catalog.default_profile, slug, catalog.name, tokenComment);
  const composio = isComposioManaged(catalog.default_profile);

  const proseDefault =
    catalog.marketing && catalog.marketing.about
      ? catalog.marketing.about
      : `${catalog.name} is one of the integrations Vendo brokers. Tool authors bind it to a deployment to get a connection at runtime.`;
  const prose = preserveProse(slug, proseDefault);

  const frontmatter = [
    "---",
    `title: ${catalog.name}`,
    `description: ${(catalog.description || "").replace(/\n/g, " ")}`,
    `category: ${catalog.category || "other"}`,
    `slug: ${slug}`,
    catalog.logo_url ? `logo: ${catalog.logo_url}` : "",
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const callShapeBlock = composio
    ? `## Through Composio\n\nCalls to ${catalog.name} are brokered through Vendo's Composio bridge. Your tool issues a \`vendo.data.execute(ACTION, args)\` call; Vendo resolves the tenant's connected ${catalog.name} account, forwards to Composio, meters one \`composio.action_call\` unit, and returns the result. Your code never sees the upstream credential.\n\nSee [Call a Composio Action](/docs/guides/recipes/call-composio-action) for the full pattern, including \`NotConnected\` handling.\n`
    : proxy
      ? `## Proxy endpoint\n\nCalls to ${catalog.name} are brokered through Vendo's proxy at:\n\n\`\`\`\n${proxy}\n\`\`\`\n\nPoint the official ${catalog.name} SDK at this base URL; Vendo authenticates, meters per call, and forwards upstream. Your code never sees the upstream credential.\n`
      : `## Direct API\n\n${catalog.name} is called directly (no Vendo proxy intermediary). The SDK reads the injected credential from the environment and talks to ${catalog.name}'s API host.\n`;

  return `${frontmatter}

{/* Generated by scripts/build-integrations.mjs from packages/integrations/${slug}/{catalog.json, integration.ts}. Hand-edit only the prose block between PROSE-START and PROSE-END markers. */}

import { Tab, Tabs } from "fumadocs-ui/components/tabs";

${PROSE_START}
${prose}
${PROSE_END}

## Auth modes

${profileSection(catalog.supported_profiles, catalog.default_profile)}

## Environment variables

These are the env vars Vendo injects into your deployment at boot when this integration is bound. Source values are resolved by \`resolveConnectionEnvVars\` in \`packages/integrations/lib/\` from the connection record (credential, metadata) and deployment context (proxy URL, Vendo-issued API key).

${envVarsSection(envVars, catalog.supported_profiles)}

${runtimeAccessSection(envVars, catalog.name, composio, slug)}
${callShapeBlock}
## Quickstart

<Tabs items={["Python", "TypeScript", "Swift"]}>
  <Tab value="Python">
\`\`\`python
${examples.py}
\`\`\`
  </Tab>
  <Tab value="TypeScript">
\`\`\`typescript
${examples.ts}
\`\`\`
  </Tab>
  <Tab value="Swift">
\`\`\`swift
${examples.swift}
\`\`\`
  </Tab>
</Tabs>

## Learn more

- [Concepts: connections & integrations](/docs/concepts) — how connections, bindings, and credentials fit together.
- [Build a tool: SDK](/docs/build-a-tool) — full \`vendo.token\` and \`vendo.data.execute\` semantics.
${composio ? `- [Call a Composio Action](/docs/guides/recipes/call-composio-action) — \`vendo.data.execute\` patterns and error handling.` : ""}
${catalog.docs_url ? `- [${catalog.name} API docs](${catalog.docs_url})` : ""}
`;
}

// ---------- 5. Index landing + meta rewrite ---------------------------------

function rewriteIndexList(allProviders) {
  if (!existsSync(INDEX_PATH)) {
    console.warn(`WARN: ${INDEX_PATH} missing — skipping index list update.`);
    return;
  }
  const existing = readFileSync(INDEX_PATH, "utf8");
  const startIdx = existing.indexOf(LIST_START);
  const endIdx = existing.indexOf(LIST_END);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    console.warn(`WARN: ${INDEX_PATH} is missing LIST-START / LIST-END markers — skipping.`);
    return;
  }
  const list = [
    "",
    "<Cards>",
    ...allProviders.map(
      (r) =>
        `  <Card title="${r.name}" description="${(r.description || "").replace(/"/g, "&quot;")}" href="/docs/integrations/${r.slug}" />`,
    ),
    "</Cards>",
    "",
  ].join("\n");
  const next =
    existing.slice(0, startIdx + LIST_START.length) +
    list +
    existing.slice(endIdx);
  writeFileSync(INDEX_PATH, next);
  console.log(`UPDATED ${INDEX_PATH}`);
}

function rewriteMeta(allProviders) {
  const slugs = allProviders.map((r) => r.slug).sort();
  const meta = {
    title: "Integrations",
    pages: ["index", ...slugs],
  };
  writeFileSync(META_PATH, JSON.stringify(meta, null, 2) + "\n");
  console.log(`UPDATED ${META_PATH}`);
}

// ---------- main ------------------------------------------------------------

const integrations = discoverIntegrations();
console.log(`Discovered ${integrations.length} enabled integrations in ${INTEGRATIONS_DIR}.`);

const allProviders = []; // {slug, name, description} for index + meta
const written = [];

for (const { catalog, envVars } of integrations) {
  const content = renderPage(catalog, envVars);
  const path = join(OUT_DIR, `${catalog.slug}.mdx`);
  writeFileSync(path, content);
  written.push(catalog.slug);
  allProviders.push({ slug: catalog.slug, name: catalog.name, description: catalog.description });
  console.log(`WROTE ${path}`);
}

// Stable ordering for index + meta.
allProviders.sort((a, b) => a.slug.localeCompare(b.slug));
rewriteIndexList(allProviders);
rewriteMeta(allProviders);

console.log("\nSummary");
console.log(`  Integrations rendered: ${written.length}`);
console.log(`  Slugs: ${written.join(", ")}`);
console.log("\nDone.");
