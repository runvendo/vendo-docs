import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <span className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-small.png"
              alt="Vendo"
              width={24}
              height={24}
              className="h-6 w-auto"
            />
            <span className="font-semibold tracking-tight">Vendo Docs</span>
          </span>
        ),
        url: "/",
      }}
    >
      {children}
    </DocsLayout>
  );
}
