import type { Metadata } from "next";
import Link from "next/link";

const BRAND = "#2B7A5E";

export const metadata: Metadata = {
  title: { absolute: "Vendo Docs — Build and ship tools on Vendo" },
  description:
    "Documentation for developers building tools on Vendo. Managed infrastructure, integrations, billing, OAuth, and a catalog tenants deploy from.",
  openGraph: {
    title: "Vendo Docs — Build and ship tools on Vendo",
    description:
      "Documentation for developers building tools on Vendo. Managed infrastructure, integrations, billing, OAuth, and a catalog tenants deploy from.",
    url: "https://docs.vendo.run",
    siteName: "Vendo Docs",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vendo Docs — Build and ship tools on Vendo",
    description:
      "Documentation for developers building tools on Vendo. Managed infrastructure, integrations, billing, OAuth, and a catalog tenants deploy from.",
  },
};

const sectionCards = [
  {
    label: "Get started",
    href: "/docs/getting-started",
    description:
      "First 10 minutes. Pick a language, scaffold a project, and deploy your first tool end-to-end.",
  },
  {
    label: "Build a tool",
    href: "/docs/build-a-tool",
    description:
      "Author with the SDK and vendo.yaml — tokens, connections, billing checks, events, and webhooks.",
  },
  {
    label: "Deploy & publish",
    href: "/docs/deploy-and-publish",
    description:
      "Run a tool locally as OSS, ship it privately, or publish it to the public Vendo catalog.",
  },
  {
    label: "Integrations",
    href: "/docs/integrations",
    description:
      "OpenAI, Anthropic, Telegram, Stripe, Notion, Supabase, and more — declared in vendo.yaml, metered by the proxy.",
  },
];

const referenceLinks = [
  { label: "SDK reference", href: "/docs/reference" },
  { label: "vendo.yaml schema", href: "/docs/reference/vendo-yaml-schema" },
  { label: "HTTP API", href: "/docs/reference/http-api" },
  { label: "CLI", href: "/docs/reference/cli" },
];

const footerDocsLinks = [
  { label: "Get started", href: "/docs/getting-started" },
  { label: "Concepts", href: "/docs/concepts/what-is-a-tool" },
  { label: "Build a tool", href: "/docs/build-a-tool" },
  { label: "Deploy & publish", href: "/docs/deploy-and-publish" },
  { label: "Integrations", href: "/docs/integrations" },
  { label: "Reference", href: "/docs/reference" },
  { label: "Changelog", href: "/docs/changelog" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#FAFAF8] dark:bg-[#0C0F0E] text-[#1A1A18] dark:text-[#EEEEE8]">
      {/* Nav */}
      <nav className="border-b border-[#E5E5E0] dark:border-[#1E2420] px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-small.png"
            alt="Vendo"
            width={28}
            height={28}
            className="h-7 w-auto"
          />
          <span className="font-semibold tracking-tight">Vendo Docs</span>
        </Link>
        <div className="flex items-center gap-6 text-sm text-[#6B6B60] dark:text-[#9A9A8E]">
          <Link href="/docs" className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors">
            Docs
          </Link>
          <Link href="/docs/getting-started" className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors">
            Get started
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
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        <div className="max-w-3xl">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Build and ship tools on{" "}
            <span style={{ color: BRAND }}>Vendo</span>.
          </h1>

          <p className="text-xl text-[#6B6B60] dark:text-[#9A9A8E] leading-relaxed mb-4 max-w-2xl">
            Vendo runs your tool as an isolated instance, brokers third-party
            API calls through a metered proxy, and handles OAuth, secrets, and
            billing. Tenants install your tool with one click from the public
            catalog.
          </p>
          <p className="text-sm text-[#9A9A8E] dark:text-[#6B6B60] mb-10 max-w-2xl">
            These docs cover the developer side: authoring a tool with the
            SDK, declaring integrations in <code className="font-mono text-xs bg-[#E8E8E3] dark:bg-[#1E2420] px-1.5 py-0.5 rounded">vendo.yaml</code>, deploying privately or publishing to the catalog.
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
              href="/docs/concepts/what-is-a-tool"
              className="px-5 py-2.5 rounded-lg font-medium border border-[#D5D5D0] dark:border-[#2A302C] text-[#4A4A40] dark:text-[#AAAAA0] hover:border-[#B5B5B0] dark:hover:border-[#3A403C] transition-colors text-sm"
            >
              Read the concepts
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

      {/* Section cards */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#9A9A8E] dark:text-[#6B6B60] mb-6">
          Start here
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {sectionCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="group bg-white dark:bg-[#111714] border border-[#E5E5E0] dark:border-[#1E2420] rounded-xl p-6 hover:border-[#2B7A5E40] dark:hover:border-[#2B7A5E60] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-base">{card.label}</span>
                <span
                  className="text-sm transition-colors text-[#9A9A8E] dark:text-[#6B6B60] group-hover:text-[#2B7A5E]"
                  aria-hidden="true"
                >
                  →
                </span>
              </div>
              <p className="text-sm text-[#6B6B60] dark:text-[#9A9A8E] leading-relaxed">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Reference strip */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#9A9A8E] dark:text-[#6B6B60] mb-4">
          Reference
        </h2>
        <div className="flex flex-wrap gap-2">
          {referenceLinks.map((ref) => (
            <Link
              key={ref.href}
              href={ref.href}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-[#D5D5D0] dark:border-[#2A302C] bg-white dark:bg-[#111714] text-[#4A4A40] dark:text-[#AAAAA0] hover:border-[#2B7A5E] dark:hover:border-[#2B7A5E] hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors"
            >
              {ref.label} →
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E0] dark:border-[#1E2420] px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-8 justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-small.png"
                alt="Vendo"
                width={24}
                height={24}
                className="h-6 w-auto"
              />
              <span className="font-semibold text-sm">Vendo Docs</span>
            </div>
            <p className="text-xs text-[#9A9A8E] dark:text-[#6B6B60] max-w-xs leading-relaxed">
              Developer documentation for Vendo — the platform tenants use to
              deploy your tool with managed infrastructure, integrations, and
              billing.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 text-sm">
            <div>
              <p className="font-medium text-xs uppercase tracking-widest text-[#9A9A8E] dark:text-[#6B6B60] mb-3">
                Docs
              </p>
              <div className="flex flex-col gap-2 text-[#6B6B60] dark:text-[#9A9A8E]">
                {footerDocsLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="font-medium text-xs uppercase tracking-widest text-[#9A9A8E] dark:text-[#6B6B60] mb-3">
                Source
              </p>
              <div className="flex flex-col gap-2 text-[#6B6B60] dark:text-[#9A9A8E]">
                <a href="https://github.com/runvendo" target="_blank" rel="noopener noreferrer" className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors">
                  runvendo on GitHub
                </a>
                <a href="https://github.com/runvendo/vendo-docs" target="_blank" rel="noopener noreferrer" className="hover:text-[#1A1A18] dark:hover:text-[#EEEEE8] transition-colors">
                  vendo-docs
                </a>
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
