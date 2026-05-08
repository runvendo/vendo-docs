import Link from "next/link";

const sdks = [
  {
    name: "Python",
    version: "v1.0.0",
    install: "pip install vendo-sdk",
    quickstart: "/docs/getting-started/python",
    repo: "https://github.com/runvendo/vendo-sdk-py",
    color: "border-blue-200 hover:border-blue-400",
    badge: "bg-blue-100 text-blue-800",
  },
  {
    name: "TypeScript",
    version: "v1.0.0",
    install: "npm install @vendodev/sdk",
    quickstart: "/docs/getting-started/typescript",
    repo: "https://github.com/runvendo/vendo-sdk-js",
    color: "border-amber-200 hover:border-amber-400",
    badge: "bg-amber-100 text-amber-800",
  },
  {
    name: "Swift",
    version: "v1.0.0",
    install: 'from: "1.0.0"',
    quickstart: "/docs/getting-started/swift",
    repo: "https://github.com/runvendo/vendo-sdk-swift",
    color: "border-orange-200 hover:border-orange-400",
    badge: "bg-orange-100 text-orange-800",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Nav */}
      <nav className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-lg">Vendo SDKs</span>
        <div className="flex gap-4 text-sm text-neutral-600 dark:text-neutral-400">
          <Link href="/docs" className="hover:text-neutral-900 dark:hover:text-white">
            Docs
          </Link>
          <a
            href="https://github.com/runvendo"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-900 dark:hover:text-white"
          >
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white mb-6">
          Vendo SDKs
        </h1>
        <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto mb-4">
          One SDK contract, three languages. Run as plain OSS with your own API
          keys, or upgrade to Vendo with one env var.
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-10">
          Python &bull; TypeScript &bull; Swift &mdash; all at v1.0.0
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/docs"
            className="px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-md font-medium hover:opacity-90 transition-opacity"
          >
            Read the docs
          </Link>
          <Link
            href="/docs/getting-started/python"
            className="px-5 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-md font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
          >
            Quick start
          </Link>
        </div>
      </section>

      {/* SDK cards */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-3 gap-6">
          {sdks.map((sdk) => (
            <div
              key={sdk.name}
              className={`border-2 rounded-xl p-6 transition-colors ${sdk.color} dark:border-neutral-700 dark:hover:border-neutral-500`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-lg">{sdk.name}</span>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded ${sdk.badge}`}
                >
                  {sdk.version}
                </span>
              </div>
              <pre className="text-xs bg-neutral-100 dark:bg-neutral-800 rounded p-2 mb-4 overflow-x-auto">
                <code>{sdk.install}</code>
              </pre>
              <div className="flex gap-3 text-sm">
                <Link
                  href={sdk.quickstart}
                  className="font-medium text-neutral-900 dark:text-white hover:underline"
                >
                  Quick start &rarr;
                </Link>
                <a
                  href={sdk.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-500 dark:text-neutral-400 hover:underline"
                >
                  GitHub
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature blurbs */}
      <section className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-4xl mx-auto px-6 py-16 grid sm:grid-cols-3 gap-8 text-sm">
          <div>
            <h3 className="font-semibold mb-2">BYOK / OSS mode</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              No Vendo account needed. Set your own API keys as env vars and the
              SDK resolves them automatically.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Multi-tenant SaaS</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Scope any client call to a logged-in user with{" "}
              <code className="font-mono text-xs bg-neutral-200 dark:bg-neutral-700 px-1 rounded">
                forRequest(headers)
              </code>
              . One line.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Typed errors</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              12 typed error classes across all three languages. Catch exactly
              what you need.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-6 text-sm text-neutral-500 dark:text-neutral-400 justify-between">
          <span>© 2026 Vendo. MIT License.</span>
          <div className="flex gap-6">
            <a
              href="https://github.com/runvendo/vendo-sdk-py"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              vendo-sdk-py
            </a>
            <a
              href="https://github.com/runvendo/vendo-sdk-js"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              vendo-sdk-js
            </a>
            <a
              href="https://github.com/runvendo/vendo-sdk-swift"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              vendo-sdk-swift
            </a>
            <Link
              href="/docs"
              className="hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              Docs
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
