import Link from "next/link";

const BRAND = "#2B7A5E";

const sdks = [
  {
    name: "Python",
    version: "v1.0.0",
    install: "pip install vendo-sdk",
    description: "Async-first, stdlib only. Python 3.9+.",
    quickstart: "/docs/getting-started/python",
    repo: "https://github.com/runvendo/vendo-sdk-py",
    lang: "py",
  },
  {
    name: "TypeScript",
    version: "v1.0.0",
    install: "npm install @vendodev/sdk",
    description: "Node 18+, Deno 1.40+, browser. Zero deps.",
    quickstart: "/docs/getting-started/typescript",
    repo: "https://github.com/runvendo/vendo-sdk-js",
    lang: "ts",
  },
  {
    name: "Swift",
    version: "v1.0.0",
    install: '.package(url: "…/vendo-sdk-swift", from: "1.0.0")',
    description: "iOS 15+, macOS 12+, tvOS, watchOS. Swift 5.9+.",
    quickstart: "/docs/getting-started/swift",
    repo: "https://github.com/runvendo/vendo-sdk-swift",
    lang: "swift",
  },
];

const features = [
  {
    icon: "🔑",
    title: "BYOK / OSS mode",
    desc: "No account needed. Set OPENAI_API_KEY and the SDK resolves it automatically. Ship as plain open-source.",
  },
  {
    icon: "⚡",
    title: "Vendo mode",
    desc: "Set VENDO_API_KEY once. OAuth tokens refresh automatically — no rotation scripts, no expired keys.",
  },
  {
    icon: "🛡️",
    title: "Typed errors",
    desc: "12 typed error classes across all three languages. Catch NotConnected, RateLimited, NeedsReauth exactly.",
  },
  {
    icon: "📡",
    title: "Events SSE",
    desc: "Live stream of connection-state changes over server-sent events with automatic reconnect and backoff.",
  },
  {
    icon: "🪝",
    title: "Webhooks",
    desc: "HMAC-SHA256 verification with replay protection built in. Works in both modes — no Vendo backend needed.",
  },
  {
    icon: "📦",
    title: "Bundled BYOK catalog",
    desc: "A curated list of OSS-compatible env-var mappings ships with the SDK. No network call to discover them.",
  },
];

const codeExamples = {
  Python: `import vendo

# OSS mode — reads OPENAI_API_KEY from env
key = vendo.token("openai")

# Vendo mode — set VENDO_API_KEY once; same call
key = vendo.token("openai")   # OAuth-refreshed token`,
  TypeScript: `import { Vendo } from "@vendodev/sdk";

const vendo = new Vendo();

// OSS mode — reads OPENAI_API_KEY from env
const key = await vendo.token("openai");

// Vendo mode — set VENDO_API_KEY once; same call
const key = await vendo.token("openai"); // OAuth-refreshed token`,
  Swift: `import Vendo

let vendo = try Vendo() // reads VENDO_API_KEY; absent = OSS mode

// OSS mode — reads OPENAI_API_KEY from env
let key = try await vendo.token("openai")

// Vendo mode — set VENDO_API_KEY once; same call
let key = try await vendo.token("openai") // OAuth-refreshed token`,
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#FAFAF8] dark:bg-[#0C0F0E] text-[#1A1A18] dark:text-[#EEEEE8]">
      {/* Nav */}
      <nav className="border-b border-[#E5E5E0] dark:border-[#1E2420] px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: BRAND }}
          >
            V
          </span>
          <span className="font-semibold tracking-tight">Vendo Docs</span>
        </Link>
        <div className="flex items-center gap-6 text-sm text-[#6B6B60] dark:text-[#9A9A8E]">
          <Link href="/docs" className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors">
            Docs
          </Link>
          <Link href="/docs/getting-started" className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors">
            Getting started
          </Link>
          <a
            href="https://github.com/runvendo"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors flex items-center gap-1"
          >
            <GitHubIcon />
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="max-w-3xl">
          <div
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border mb-8"
            style={{
              color: BRAND,
              borderColor: `${BRAND}40`,
              backgroundColor: `${BRAND}10`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: BRAND }}
            />
            Python · TypeScript · Swift — all at v1.0.0
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            SDKs for apps deployed on{" "}
            <span style={{ color: BRAND }}>Vendo</span>
          </h1>

          <p className="text-xl text-[#6B6B60] dark:text-[#9A9A8E] leading-relaxed mb-4 max-w-2xl">
            One SDK contract, three languages. Run as plain open-source with
            your own API keys — or deploy on Vendo and get OAuth refresh,
            managed billing, and events with a single env var.
          </p>
          <p className="text-sm text-[#9A9A8E] dark:text-[#6B6B60] mb-10">
            Set{" "}
            <code className="font-mono text-xs bg-[#E8E8E3] dark:bg-[#1E2420] px-1.5 py-0.5 rounded">
              VENDO_API_KEY
            </code>{" "}
            to switch from OSS to Vendo mode. No code changes.
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link
              href="/docs/getting-started"
              className="px-5 py-2.5 rounded-lg font-medium text-white transition-opacity hover:opacity-90 text-sm"
              style={{ backgroundColor: BRAND }}
            >
              Get started →
            </Link>
            <Link
              href="/docs"
              className="px-5 py-2.5 rounded-lg font-medium border border-[#D5D5D0] dark:border-[#2A302C] text-[#4A4A40] dark:text-[#AAAAA0] hover:border-[#B5B5B0] dark:hover:border-[#3A403C] transition-colors text-sm"
            >
              Read the docs
            </Link>
            <a
              href="https://github.com/runvendo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg font-medium border border-[#D5D5D0] dark:border-[#2A302C] text-[#4A4A40] dark:text-[#AAAAA0] hover:border-[#B5B5B0] dark:hover:border-[#3A403C] transition-colors text-sm flex items-center gap-1.5"
            >
              <GitHubIcon className="w-4 h-4" />
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* SDK cards */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#9A9A8E] dark:text-[#6B6B60] mb-6">
          Three languages, one API surface
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {sdks.map((sdk) => (
            <div
              key={sdk.name}
              className="group relative bg-white dark:bg-[#111714] border border-[#E5E5E0] dark:border-[#1E2420] rounded-xl p-6 hover:border-[#2B7A5E40] dark:hover:border-[#2B7A5E60] transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="font-semibold text-base">{sdk.name}</span>
                  <span className="ml-2 text-xs font-mono text-[#9A9A8E] dark:text-[#6B6B60]">
                    {sdk.version}
                  </span>
                </div>
                <span className="text-xs font-mono uppercase tracking-wide text-[#9A9A8E] dark:text-[#6B6B60]">
                  {sdk.lang}
                </span>
              </div>

              <pre className="text-xs bg-[#F3F3EE] dark:bg-[#0C0F0E] rounded-lg p-3 mb-4 overflow-x-auto font-mono leading-relaxed">
                <code>{sdk.install}</code>
              </pre>

              <p className="text-sm text-[#6B6B60] dark:text-[#9A9A8E] mb-5 leading-relaxed">
                {sdk.description}
              </p>

              <div className="flex gap-4 text-sm">
                <Link
                  href={sdk.quickstart}
                  className="font-medium transition-colors"
                  style={{ color: BRAND }}
                >
                  Quickstart →
                </Link>
                <a
                  href={sdk.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#9A9A8E] dark:text-[#6B6B60] hover:text-[#6B6B60] dark:hover:text-[#9A9A8E] transition-colors flex items-center gap-1"
                >
                  <GitHubIcon className="w-3.5 h-3.5" />
                  Source
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Code example */}
      <section className="border-y border-[#E5E5E0] dark:border-[#1E2420] bg-white dark:bg-[#111714]">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">
                One call to get a token
              </h2>
              <p className="text-[#6B6B60] dark:text-[#9A9A8E] leading-relaxed mb-4">
                <code
                  className="font-mono text-sm"
                  style={{ color: BRAND }}
                >
                  vendo.token("openai")
                </code>{" "}
                walks a four-step resolution chain: escape hatch → Vendo API → conventional env var → error.
              </p>
              <p className="text-[#6B6B60] dark:text-[#9A9A8E] leading-relaxed">
                Your application code never branches on the mode. The same source
                file runs locally as OSS and on Vendo in production.
              </p>
            </div>

            <CodeTabs examples={codeExamples} />
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#9A9A8E] dark:text-[#6B6B60] mb-8">
          What ships with every SDK
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group bg-white dark:bg-[#111714] border border-[#E5E5E0] dark:border-[#1E2420] rounded-xl p-6 hover:border-[#2B7A5E40] dark:hover:border-[#2B7A5E60] transition-colors"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
              <p className="text-sm text-[#6B6B60] dark:text-[#9A9A8E] leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section
        className="py-16"
        style={{ backgroundColor: `${BRAND}12` }}
      >
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-3">
            Pick your language and ship.
          </h2>
          <p className="text-[#6B6B60] dark:text-[#9A9A8E] mb-8">
            Every quickstart gets you to a working token call in under 5 minutes.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/docs/getting-started/python"
              className="px-4 py-2 rounded-lg text-sm font-medium border border-[#D5D5D0] dark:border-[#2A302C] bg-white dark:bg-[#111714] hover:border-[#2B7A5E] dark:hover:border-[#2B7A5E] transition-colors"
            >
              Python →
            </Link>
            <Link
              href="/docs/getting-started/typescript"
              className="px-4 py-2 rounded-lg text-sm font-medium border border-[#D5D5D0] dark:border-[#2A302C] bg-white dark:bg-[#111714] hover:border-[#2B7A5E] dark:hover:border-[#2B7A5E] transition-colors"
            >
              TypeScript →
            </Link>
            <Link
              href="/docs/getting-started/swift"
              className="px-4 py-2 rounded-lg text-sm font-medium border border-[#D5D5D0] dark:border-[#2A302C] bg-white dark:bg-[#111714] hover:border-[#2B7A5E] dark:hover:border-[#2B7A5E] transition-colors"
            >
              Swift →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E0] dark:border-[#1E2420] px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-8 justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: BRAND }}
              >
                V
              </span>
              <span className="font-semibold text-sm">Vendo Docs</span>
            </div>
            <p className="text-xs text-[#9A9A8E] dark:text-[#6B6B60] max-w-xs leading-relaxed">
              SDK documentation for Vendo: deploy OSS apps with managed credentials, billing, and events.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 text-sm">
            <div>
              <p className="font-medium text-xs uppercase tracking-widest text-[#9A9A8E] dark:text-[#6B6B60] mb-3">
                SDKs
              </p>
              <div className="flex flex-col gap-2 text-[#6B6B60] dark:text-[#9A9A8E]">
                <a href="https://github.com/runvendo/vendo-sdk-py" target="_blank" rel="noopener noreferrer" className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors">
                  vendo-sdk-py
                </a>
                <a href="https://github.com/runvendo/vendo-sdk-js" target="_blank" rel="noopener noreferrer" className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors">
                  vendo-sdk-js
                </a>
                <a href="https://github.com/runvendo/vendo-sdk-swift" target="_blank" rel="noopener noreferrer" className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors">
                  vendo-sdk-swift
                </a>
              </div>
            </div>

            <div>
              <p className="font-medium text-xs uppercase tracking-widest text-[#9A9A8E] dark:text-[#6B6B60] mb-3">
                Docs
              </p>
              <div className="flex flex-col gap-2 text-[#6B6B60] dark:text-[#9A9A8E]">
                <Link href="/docs/getting-started" className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors">
                  Getting started
                </Link>
                <Link href="/docs/concepts/two-modes" className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors">
                  Concepts
                </Link>
                <Link href="/docs/guides/recipes" className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors">
                  Recipes
                </Link>
                <a href="https://github.com/runvendo/vendo-docs" target="_blank" rel="noopener noreferrer" className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors">
                  vendo-docs
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-[#E5E5E0] dark:border-[#1E2420]">
          <p className="text-xs text-[#9A9A8E] dark:text-[#6B6B60]">
            © 2026 Vendo. MIT License.
          </p>
        </div>
      </footer>
    </main>
  );
}

function GitHubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function CodeTabs({ examples }: { examples: Record<string, string> }) {
  const langs = Object.keys(examples);
  return (
    <div className="rounded-xl border border-[#E5E5E0] dark:border-[#1E2420] overflow-hidden bg-[#F3F3EE] dark:bg-[#0C0F0E]">
      {/* Static tabs — show all three with labels, use CSS to select via :target or just show the first */}
      <div className="flex border-b border-[#E5E5E0] dark:border-[#1E2420] bg-white dark:bg-[#111714]">
        {langs.map((lang, i) => (
          <span
            key={lang}
            className={`px-4 py-2.5 text-xs font-medium ${
              i === 0
                ? "border-b-2 text-[#1A1A18] dark:text-[#EEEEE8]"
                : "text-[#9A9A8E] dark:text-[#6B6B60]"
            }`}
            style={i === 0 ? { borderBottomColor: BRAND } : {}}
          >
            {lang}
          </span>
        ))}
      </div>
      <pre className="p-5 text-xs font-mono leading-relaxed overflow-x-auto text-[#4A4A40] dark:text-[#AAAAA0]">
        <code>{examples[langs[0]]}</code>
      </pre>
    </div>
  );
}
