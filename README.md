# vendo-docs

Documentation site for the Vendo SDKs (Python, TypeScript, Swift). Built with [Fumadocs](https://fumadocs.dev) + Next.js 16.

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build

```bash
npm run build
```

Produces a static export in `out/`. All pages are pre-rendered — no server required.

## Deploy (Cloudflare Pages)

Connect this repo in the Cloudflare Pages dashboard:

- **Framework preset:** Next.js (Static HTML Export)
- **Build command:** `npm run build`
- **Build output directory:** `out`

Alternatively, deploy via Wrangler:

```bash
npx wrangler pages deploy out --project-name vendo-docs
```

## Content

All content lives in `content/docs/` as MDX files. Edit, save, hot-reload in dev mode.

### Adding a page

1. Create a `.mdx` file in the appropriate `content/docs/<section>/` directory.
2. Add frontmatter: `title` and `description`.
3. Register the page in the section's `meta.json` under `pages`.

### Language tabs

Use the `<Tabs>` / `<Tab>` components from `fumadocs-ui/components/tabs` to show Python, TypeScript, and Swift side-by-side:

```mdx
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

<Tabs items={["Python", "TypeScript", "Swift"]}>
  <Tab value="Python">...Python code...</Tab>
  <Tab value="TypeScript">...TypeScript code...</Tab>
  <Tab value="Swift">...Swift code...</Tab>
</Tabs>
```

## Structure

```
content/docs/
  index.mdx                    Overview + language picker
  getting-started/             Quickstarts per language
  concepts/                    Two modes, multi-tenant, errors, events, webhooks
  cookbook/                    Copy-paste recipes (all three languages)
  sdks/                        Per-language install + API surface reference
src/
  app/
    (home)/page.tsx            Landing page
    docs/[[...slug]]/page.tsx  Docs renderer
  lib/source.ts                Fumadocs source loader
```

## SDK repos

- Python: https://github.com/runvendo/vendo-sdk-py
- TypeScript: https://github.com/runvendo/vendo-sdk-js
- Swift: https://github.com/runvendo/vendo-sdk-swift
