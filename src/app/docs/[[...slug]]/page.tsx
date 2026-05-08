import { source } from "@/lib/source";
import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
} from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { InferPageType } from "fumadocs-core/source";

type Page = InferPageType<typeof source>;

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const page = source.getPage(slug) as Page | undefined;
  if (!page) notFound();

  const data = page.data as {
    body: React.ComponentType<{ components?: Record<string, unknown> }>;
    toc: unknown[];
    title?: string;
    description?: string;
  };

  const MDXContent = data.body;

  return (
    <DocsPage toc={data.toc as Parameters<typeof DocsPage>[0]["toc"]}>
      <DocsTitle>{data.title}</DocsTitle>
      <DocsDescription>{data.description}</DocsDescription>
      <DocsBody>
        <MDXContent components={defaultMdxComponents as Record<string, unknown>} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = source.getPage(slug) as Page | undefined;
  if (!page) notFound();

  const data = page.data as { title?: string; description?: string };

  return {
    title: data.title,
    description: data.description,
  };
}
