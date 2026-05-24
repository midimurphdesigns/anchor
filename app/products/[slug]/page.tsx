/**
 * Human product page.
 *
 * Rendering tier: PPR (Partial Prerendering). The product copy,
 * specs table, JSON-LD, and "buy" link are prerendered at build
 * time from the cached loader. The <AgentTally> component is the
 * dynamic hole — it streams in at request time with the live fetch
 * count from Redis.
 *
 * generateStaticParams ensures every product gets a static shell
 * generated at build, no on-demand-render-and-pray ISR semantics.
 *
 * Runtime: Node (default). The Edge agent endpoint next door is
 * what runs Edge — the human page can use Node-only APIs freely.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadAllSlugs, loadProduct } from "@/lib/product-loader";
import { formatPrice } from "@/lib/catalog";
import { canonicalUrl, productJsonLd } from "@/lib/citation";
import { AgentTally } from "@/components/AgentTally";
import type { Metadata } from "next";

type RouteParams = { slug: string };

export async function generateStaticParams(): Promise<RouteParams[]> {
  const slugs = await loadAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "Not found" };
  return {
    title: `${product.name} — anchor`,
    description: product.shortDescription,
    alternates: {
      canonical: canonicalUrl(slug),
      types: {
        "application/ld+json": `${canonicalUrl(slug)}/agent/json`,
      },
    },
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      url: canonicalUrl(slug),
      type: "website",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const ld = productJsonLd(product);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />

      <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--color-ink-dim)]">
        <Link href="/" className="hover:text-[var(--color-accent)]">
          ← /ANCHOR
        </Link>
        {"  /  "}
        {product.category.toUpperCase()}
      </p>

      <h1 className="display mt-6 text-4xl sm:text-6xl">{product.name}</h1>
      <p className="mt-3 text-sm text-[var(--color-ink-dim)]">
        {product.brand}
      </p>

      <p className="mt-8 text-lg leading-relaxed text-[var(--color-ink)]">
        {product.shortDescription}
      </p>

      <div className="mt-12 flex items-baseline justify-between gap-6 border-y border-[var(--color-rule)] py-5">
        <div className="display text-3xl">
          {formatPrice(product.pricing.listCents)}
        </div>
        <div className="mono text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
          {product.inventory > 0
            ? `${product.inventory} IN STOCK`
            : "OUT OF STOCK"}
        </div>
      </div>

      <h2 className="display mt-16 text-2xl">Specifications.</h2>
      <dl className="mono mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        {product.specs.map((s) => (
          <div
            key={s.label}
            className="border-l-2 border-[var(--color-rule)] pl-4"
          >
            <dt className="text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
              {s.label}
            </dt>
            <dd className="mt-1 text-[var(--color-ink)]">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-16 flex flex-wrap items-baseline justify-between gap-4 border-t border-[var(--color-rule)] pt-6">
        <AgentTally slug={slug} />
        <Link
          href={`/products/${slug}/agent/markdown`}
          className="mono text-xs uppercase tracking-wider text-[var(--color-ink-dim)] hover:text-[var(--color-accent)]"
          data-no-page-transition="true"
        >
          → AGENT-FACING ENDPOINT
        </Link>
      </div>
    </main>
  );
}
