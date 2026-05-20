#!/usr/bin/env node
/**
 * build-integrations.mjs — hybrid generator for the per-provider integration
 * pages under `content/docs/integrations/`.
 *
 * Source-of-truth model
 * ---------------------
 *
 *   `$VENDO_INTEGRATIONS_DIR/<slug>/catalog.json` is **primary** — it's the
 *   committed, version-controlled, code-reviewed reflection of what the proxy
 *   worker actually ships. Every page field that's derivable from the catalog
 *   (name, description, category, supported_profiles, default_profile,
 *   proxy_base_url, marketing.about, docs_url, logo_url) comes from there.
 *
 *   The prod `integrations` DB row is **secondary**, used for:
 *
 *     - `env_bootstrap` — the runtime env-var contract. Not yet authored in
 *       catalog.yaml; comes from migrations. (Follow-up: move this into the
 *       catalog pipeline and drop the DB dependency entirely.)
 *
 *     - `enabled` drift detection — if the DB has a provider enabled that
 *       isn't in the monorepo catalog (composio-managed slugs are the
 *       current example), we render a DB-only fallback page and flag it.
 *       If catalog says `enabled: true` but the DB row is disabled (or
 *       missing), we skip and warn.
 *
 * Hand-written prose between `{/* PROSE-START *\/}` and `{/* PROSE-END *\/}`
 * is preserved across re-runs. The link list inside index.mdx between
 * `{/* LIST-START *\/}` / `{/* LIST-END *\/}` is auto-rewritten.
 *
 * Outputs are committed to git — Cloudflare Pages does not run this script at
 * build time (no prod credentials there). Re-run locally (or via the
 * follow-up scheduled GitHub Action — see TODO at the top) whenever the
 * monorepo catalogs or the DB snapshot changes.
 *
 * Usage:
 *   VENDO_INTEGRATIONS_DIR=/path/to/vendo/packages/integrations \
 *     infisical run --env prod --projectId b366cac7-1716-47a0-9617-f335500f6dee -- \
 *     node scripts/build-integrations.mjs
 *
 * TODO(follow-up #1): scheduled GitHub Action that re-runs this script weekly
 * and opens a PR against `runvendo/vendo-docs` whenever monorepo catalog or
 * DB env_bootstrap drifts from the committed MDX.
 *
 * TODO(follow-up #2): drop the DB dependency once `env_bootstrap` is sourced
 * from `catalog.yaml` in the monorepo build pipeline. Then the docs generator
 * can run against a vanilla monorepo clone with no Infisical / psql.
 */

import { execFileSync } from "node:child_process";
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

const PSQL = process.env.PSQL_BIN || "psql";
const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error(
    "ERROR: DATABASE_URL is unset. Run under `infisical run --env prod -- node scripts/build-integrations.mjs`.",
  );
  process.exit(1);
}

const INTEGRATIONS_DIR = process.env.VENDO_INTEGRATIONS_DIR
  ? resolve(process.env.VENDO_INTEGRATIONS_DIR)
  : null;
if (!INTEGRATIONS_DIR) {
  console.error(
    "ERROR: VENDO_INTEGRATIONS_DIR is unset. catalog.json is the primary source — set it to the path of `packages/integrations/` in the monorepo.",
  );
  process.exit(1);
}
if (!existsSync(INTEGRATIONS_DIR)) {
  console.error(`ERROR: VENDO_INTEGRATIONS_DIR=${INTEGRATIONS_DIR} does not exist.`);
  process.exit(1);
}

// ---------- 1. Walk monorepo for enabled catalogs ---------------------------

function discoverCatalogs() {
  // Each subfolder of $VENDO_INTEGRATIONS_DIR is one slug (or a non-slug like
  // `composio` / `lib` — those don't have a catalog.json and are skipped).
  const entries = readdirSync(INTEGRATIONS_DIR);
  const catalogs = [];
  for (const entry of entries) {
    const folder = join(INTEGRATIONS_DIR, entry);
    const stat = statSync(folder, { throwIfNoEntry: false });
    if (!stat || !stat.isDirectory()) continue;
    const path = join(folder, "catalog.json");
    if (!existsSync(path)) continue;
    let catalog;
    try {
      catalog = JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      console.warn(`WARN: failed to parse ${path}: ${err.message}`);
      continue;
    }
    if (!catalog || catalog.enabled !== true) continue;
    if (catalog.slug !== entry) {
      console.warn(
        `WARN: ${path} declares slug="${catalog.slug}" but lives in folder "${entry}" — skipping.`,
      );
      continue;
    }
    catalogs.push(catalog);
  }
  catalogs.sort((a, b) => a.slug.localeCompare(b.slug));
  return catalogs;
}

// ---------- 2. DB snapshot (env_bootstrap + drift check) --------------------

function fetchDbSnapshot() {
  // Pull every enabled row. We need env_bootstrap for every catalog provider
  // (DB-only field) AND we need to see DB-enabled providers that lack a
  // monorepo catalog (the composio-managed fallback case).
  const sql = `
    SELECT json_agg(row_to_json(t) ORDER BY t.provider) AS data
    FROM (
      SELECT provider, name, category, description, logo_url,
             supported_profiles, default_profile, oauth_client_config,
             env_bootstrap
      FROM integrations
      WHERE enabled = true
    ) t;
  `;
  const out = execFileSync(PSQL, [DB_URL, "-A", "-t", "-c", sql], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const parsed = JSON.parse(out.trim());
  if (!Array.isArray(parsed)) {
    throw new Error("Unexpected DB response shape (expected JSON array).");
  }
  const bySlug = new Map();
  for (const row of parsed) bySlug.set(row.provider, row);
  return bySlug;
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

function envVarsSection(envBootstrap) {
  const vars = envBootstrap && Array.isArray(envBootstrap.vars) ? envBootstrap.vars : [];
  if (vars.length === 0) return "_No environment variables injected._\n";
  let md = "| Variable | Source |\n| --- | --- |\n";
  for (const v of vars) {
    md += `| \`${v.name}\` | \`${v.value_from || "—"}\` |\n`;
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
function runtimeAccessSection(envBootstrap, providerName, composio, slug) {
  const vars = envBootstrap && Array.isArray(envBootstrap.vars) ? envBootstrap.vars : [];
  const primary = vars.find((v) => !(typeof v.name === "string" && v.name.endsWith("_BASE_URL")));
  if (!primary) return "";
  const varName = primary.name;
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

function renderFromCatalog(catalog, envBootstrap) {
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

{/* Generated by scripts/build-integrations.mjs from packages/integrations/${slug}/catalog.json. Hand-edit only the prose block between PROSE-START and PROSE-END markers. */}

import { Tab, Tabs } from "fumadocs-ui/components/tabs";

${PROSE_START}
${prose}
${PROSE_END}

## Auth modes

${profileSection(catalog.supported_profiles, catalog.default_profile)}

## Environment variables

These are the env vars Vendo injects into your deployment at boot when this integration is bound.

${envVarsSection(envBootstrap)}

${runtimeAccessSection(envBootstrap, catalog.name, composio, slug)}
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

// ---------- 5. Render: DB-only fallback (composio-managed) ------------------

function renderFromDbOnly(row) {
  // Composio-managed slugs that don't have a catalog.json in the monorepo
  // yet. Same template but driven entirely off the DB row, with a TODO
  // admonition pointing to the catalog-authoring follow-up.
  const slug = row.provider;
  const composio = isComposioManaged(row.default_profile);
  const examples = quickstartFor(
    row.default_profile,
    slug,
    row.name,
    "Returned token is the credential for this provider.",
  );
  const proseDefault = composio
    ? `${row.name} is wired into Vendo via the Composio bridge. Tool authors call \`vendo.data.execute(ACTION, args)\`; Vendo resolves the tenant's connected ${row.name} account, forwards to Composio, and returns the result.`
    : `${row.name} is one of the integrations Vendo brokers. Tool authors bind it to a deployment to get a connection at runtime.`;
  const prose = preserveProse(slug, proseDefault);

  const frontmatter = [
    "---",
    `title: ${row.name}`,
    `description: ${(row.description || "").replace(/\n/g, " ")}`,
    `category: ${row.category || "other"}`,
    `slug: ${slug}`,
    row.logo_url ? `logo: ${row.logo_url}` : "",
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  return `${frontmatter}

{/* Generated by scripts/build-integrations.mjs from the prod \`integrations\` DB row (no monorepo catalog.json yet). Hand-edit only the prose block between PROSE-START and PROSE-END markers. */}

import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Callout } from "fumadocs-ui/components/callout";

<Callout type="info">
  This page is generated from the prod \`integrations\` DB row. The monorepo
  doesn't yet have a \`packages/integrations/${slug}/catalog.yaml\` so some
  fields (proxy endpoint, marketing copy, docs URL) aren't available. A
  follow-up task tracks promoting it to a first-class catalog entry.
</Callout>

${PROSE_START}
${prose}
${PROSE_END}

## Auth modes

${profileSection(row.supported_profiles, row.default_profile)}

## Environment variables

These are the env vars Vendo injects into your deployment at boot when this integration is bound.

${envVarsSection(row.env_bootstrap)}

${runtimeAccessSection(row.env_bootstrap, row.name, composio, slug)}
${composio
  ? `## Through Composio\n\nCalls to ${row.name} are brokered through Vendo's Composio bridge. Your tool issues a \`vendo.data.execute(ACTION, args)\` call; Vendo resolves the tenant's connected ${row.name} account, forwards to Composio, meters one \`composio.action_call\` unit, and returns the result. Your code never sees the upstream credential.\n\nSee [Call a Composio Action](/docs/guides/recipes/call-composio-action) for the full pattern, including \`NotConnected\` handling.\n`
  : `## Direct API\n\n${row.name} is called directly (no Vendo proxy intermediary). The SDK reads the injected credential from the environment and talks to ${row.name}'s API host.\n`
}
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
`;
}

// ---------- 6. Index landing + meta rewrite ---------------------------------

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

const catalogs = discoverCatalogs();
console.log(`Discovered ${catalogs.length} enabled catalog.json files in the monorepo.`);

const dbSnapshot = fetchDbSnapshot();
console.log(`Fetched ${dbSnapshot.size} enabled rows from the DB.`);

const allProviders = []; // {slug, name, description} for index + meta
const driftCatalogOnly = []; // catalog enabled but DB disabled / missing
const dbOnly = []; // DB enabled but no catalog (composio-managed today)
const written = [];

// Pass 1: every catalog.json drives a page; DB fills env_bootstrap.
for (const catalog of catalogs) {
  const dbRow = dbSnapshot.get(catalog.slug);
  if (!dbRow) {
    driftCatalogOnly.push(catalog.slug);
    console.warn(
      `WARN: ${catalog.slug} is enabled in monorepo catalog.json but missing or disabled in prod DB. Page will render without env_bootstrap.`,
    );
  }
  const envBootstrap = dbRow ? dbRow.env_bootstrap : null;
  const content = renderFromCatalog(catalog, envBootstrap);
  const path = join(OUT_DIR, `${catalog.slug}.mdx`);
  writeFileSync(path, content);
  written.push(catalog.slug);
  allProviders.push({ slug: catalog.slug, name: catalog.name, description: catalog.description });
  console.log(`WROTE ${path}  (catalog-driven)`);
}

// Pass 2: DB-enabled providers without a catalog file → DB-only fallback page.
const catalogSlugs = new Set(catalogs.map((c) => c.slug));
for (const [slug, row] of dbSnapshot) {
  if (catalogSlugs.has(slug)) continue;
  dbOnly.push(slug);
  const content = renderFromDbOnly(row);
  const path = join(OUT_DIR, `${slug}.mdx`);
  writeFileSync(path, content);
  written.push(slug);
  allProviders.push({ slug, name: row.name, description: row.description });
  console.log(`WROTE ${path}  (DB-only fallback)`);
}

// Stable ordering for index + meta.
allProviders.sort((a, b) => a.slug.localeCompare(b.slug));
rewriteIndexList(allProviders);
rewriteMeta(allProviders);

console.log("\nSummary");
console.log(`  Catalog-driven pages: ${catalogs.length}`);
console.log(`  DB-only fallback pages: ${dbOnly.length}${dbOnly.length ? ` (${dbOnly.join(", ")})` : ""}`);
if (driftCatalogOnly.length) {
  console.log(`  Drift (catalog enabled, DB disabled/missing): ${driftCatalogOnly.join(", ")}`);
}
console.log("\nDone.");
