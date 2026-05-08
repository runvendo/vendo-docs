import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vendo Docs",
    template: "%s | Vendo Docs",
  },
  description:
    "SDKs and platform documentation for Vendo: deploy OSS apps with managed credentials, billing, and events.",
  openGraph: {
    title: "Vendo Docs",
    description:
      "SDKs and platform documentation for Vendo: deploy OSS apps with managed credentials, billing, and events.",
    url: "https://vendo-docs.pages.dev",
    siteName: "Vendo Docs",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vendo Docs",
    description:
      "SDKs and platform documentation for Vendo: deploy OSS apps with managed credentials, billing, and events.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
