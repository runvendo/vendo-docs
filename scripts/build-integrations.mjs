#!/usr/bin/env node
/**
 * build-integrations.mjs — hybrid generator for the per-provider integration
 * pages under `content/docs/integrations/`.
 *
 * What it does:
 *   1. Snapshots enabled rows from the prod Supabase `integrations` table
 *      (via the DATABASE_URL env var — invoke this script under
 *      `infisical run --env prod -- node scripts/build-integrations.mjs`).
 *   2. For each provider, optionally reads richer metadata from the monorepo
 *      at `$VENDO_INTEGRATIONS_DIR/<slug>/catalog.json` (falls back to a
 *      placeholder when the file isn't present — e.g. composio-managed slugs).
 *   3. Renders each provider page to `content/docs/integrations/<slug>.mdx`.
 *      Hand-written prose is preserved between `<!-- PROSE-START -->` and
 *      `<!-- PROSE-END -->` markers across runs.
 *   4. Updates the list of providers in `index.mdx` between
 *      `<!-- LIST-START -->` and `<!-- LIST-END -->`.
 *
 * Outputs are committed to git — Cloudflare Pages does not run this script at
 * build time (no prod credentials there). Re-run locally (or via the
 * follow-up scheduled GitHub Action — see TODO at the bottom) whenever the DB
 * snapshot or monorepo metadata changes.
 *
 * Usage:
 *   VENDO_INTEGRATIONS_DIR=/path/to/vendo/packages/integrations \
 *     infisical run --env prod --projectId b366cac7-1716-47a0-9617-f335500f6dee -- \
 *     node scripts/build-integrations.mjs
 *
 * TODO(follow-up): a scheduled GitHub Action that re-runs this script weekly
 * and opens a PR against `runvendo/vendo-docs` whenever the snapshot drifts.
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
  console.warn(
    "WARN: VENDO_INTEGRATIONS_DIR is unset — per-provider catalog.json metadata will be skipped (placeholder pages).",
  );
} else if (!existsSync(INTEGRATIONS_DIR)) {
  console.error(`ERROR: VENDO_INTEGRATIONS_DIR=${INTEGRATIONS_DIR} does not exist.`);
  process.exit(1);
}

// ---------- 1. Snapshot DB --------------------------------------------------

function fetchEnabledProviders() {
  const sql = `
    SELECT json_agg(row_to_json(t) ORDER BY t.provider) AS data
    FROM (
      SELECT provider, name, category, description, icon_name, logo_url,
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
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("No enabled integrations returned from DB.");
  }
  return parsed;
}

// ---------- 2. Monorepo metadata --------------------------------------------

function loadCatalog(slug) {
  if (!INTEGRATIONS_DIR) return null;
  const path = join(INTEGRATIONS_DIR, slug, "catalog.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.warn(`WARN: failed to parse ${path}: ${err.message}`);
    return null;
  }
}

// ---------- 3. Renderers ----------------------------------------------------

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

function proxyEndpointSection(slug, catalog, envBootstrap) {
  // Prefer the explicit proxy_base_url in catalog.json. If absent, look for a
  // BASE_URL var in env_bootstrap with a literal value. If still none, return null.
  if (catalog && typeof catalog.proxy_base_url === "string" && catalog.proxy_base_url.length > 0) {
    return catalog.proxy_base_url;
  }
  const vars = envBootstrap && Array.isArray(envBootstrap.vars) ? envBootstrap.vars : [];
  const baseUrlVar = vars.find((v) => typeof v.name === "string" && v.name.endsWith("_BASE_URL"));
  if (baseUrlVar && typeof baseUrlVar.value_from === "string" && baseUrlVar.value_from.startsWith("literal:")) {
    return baseUrlVar.value_from.slice("literal:".length);
  }
  return null;
}

function codeExamples(slug, catalog) {
  // Canonical first-call example: `vendo.token(slug)` and then a comment hint
  // about how the value flows. We keep this generic so the same template
  // works for every provider — the marketing capabilities table covers the
  // provider-specific call shapes.
  const tokenComment = (() => {
    if (!catalog || !catalog.marketing) return "Returned token is the credential for this provider.";
    return catalog.marketing.tagline || "Returned token is the credential for this provider.";
  })();
  // Avoid using "vendo.token(slug)" as the variable name when the slug starts
  // with a digit; clamp to a safe identifier.
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

function preserveProse(slug, defaultProse) {
  // If the existing target file has a prose block between PROSE-START and
  // PROSE-END, return that body verbatim. Otherwise, return the supplied default.
  const path = join(OUT_DIR, `${slug}.mdx`);
  if (!existsSync(path)) return defaultProse;
  const existing = readFileSync(path, "utf8");
  const startIdx = existing.indexOf(PROSE_START);
  const endIdx = existing.indexOf(PROSE_END);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return defaultProse;
  return existing.slice(startIdx + PROSE_START.length, endIdx).trim();
}

function placeholderProse(row, catalog) {
  // Hand-tuned placeholder per spec: 2-4 sentences explaining what the
  // provider is and what tool authors typically use it for. The maintainer
  // overwrites these in-place between PROSE-START / PROSE-END markers.
  if (catalog && catalog.marketing && catalog.marketing.about) {
    return catalog.marketing.about;
  }
  // Composio-managed fallback for slugs without a catalog.json.
  return `${row.name} is wired into Vendo via the Composio bridge. Tool authors connect a tenant's ${row.name} account through Vendo's UI; once connected, the SDK exposes the credential at runtime so your tool can call the ${row.name} API on the tenant's behalf.`;
}

function renderPage(row) {
  const catalog = loadCatalog(row.provider);
  const proxy = proxyEndpointSection(row.provider, catalog, row.env_bootstrap);
  const examples = codeExamples(row.provider, catalog);
  const proseDefault = placeholderProse(row, catalog);
  const prose = preserveProse(row.provider, proseDefault);

  const frontmatter = [
    "---",
    `title: ${row.name}`,
    `description: ${(row.description || "").replace(/\n/g, " ")}`,
    `category: ${row.category || "other"}`,
    `slug: ${row.provider}`,
    row.logo_url ? `logo: ${row.logo_url}` : "",
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const proxyBlock = proxy
    ? `## Proxy endpoint\n\nCalls to ${row.name} are brokered through Vendo's proxy at:\n\n\`\`\`\n${proxy}\n\`\`\`\n\nPoint the official ${row.name} SDK at this base URL; Vendo authenticates, meters per call, and forwards upstream. Your code never sees the upstream credential.\n`
    : `## Direct API\n\n${row.name} is called directly (no Vendo proxy intermediary). The SDK reads the injected credential from the environment and talks to ${row.name}'s API host.\n`;

  return `${frontmatter}

{/* Generated by scripts/build-integrations.mjs. Hand-edit only the prose block between PROSE-START and PROSE-END markers. */}

import { Tab, Tabs } from "fumadocs-ui/components/tabs";

${PROSE_START}
${prose}
${PROSE_END}

## Auth modes

${profileSection(row.supported_profiles, row.default_profile)}

## Environment variables

These are the env vars Vendo injects into your deployment at boot when this integration is bound.

${envVarsSection(row.env_bootstrap)}

${proxyBlock}
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
- [Build a tool: SDK](/docs/build-a-tool) — full \`vendo.token\` semantics and resolution.
${catalog && catalog.docs_url ? `- [${row.name} API docs](${catalog.docs_url})` : ""}
`;
}

// ---------- 4. Index landing rewrite ---------------------------------------

function rewriteIndexList(rows) {
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
    ...rows.map(
      (r) =>
        `  <Card title="${r.name}" description="${(r.description || "").replace(/"/g, "&quot;")}" href="/docs/integrations/${r.provider}" />`,
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

function rewriteMeta(rows) {
  const slugs = rows.map((r) => r.provider).sort();
  const meta = {
    title: "Integrations",
    pages: ["index", ...slugs],
  };
  writeFileSync(META_PATH, JSON.stringify(meta, null, 2) + "\n");
  console.log(`UPDATED ${META_PATH}`);
}

// ---------- main ------------------------------------------------------------

const rows = fetchEnabledProviders();
console.log(`Fetched ${rows.length} enabled providers from DB.`);

const fallbacks = [];
for (const row of rows) {
  if (!loadCatalog(row.provider)) fallbacks.push(row.provider);
  const path = join(OUT_DIR, `${row.provider}.mdx`);
  const content = renderPage(row);
  writeFileSync(path, content);
  console.log(`WROTE ${path}`);
}

rewriteIndexList(rows);
rewriteMeta(rows);

console.log("\nDone.");
if (fallbacks.length > 0) {
  console.log(
    `Providers without catalog.json (placeholder prose used): ${fallbacks.join(", ")}`,
  );
}
