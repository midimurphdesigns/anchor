/**
 * Human product page.
 *
 * Rendering tier: PPR (Partial Prerendering). The product copy,
 * specs table, JSON-LD, and "buy" link are prerendered at build
 * time from the cached loader. The <AgentTally> component is the
 * dynamic hole — it streams in at request time with the live fetch
 * count from Redis.
 *
 * Layout: split-screen (asymmetric per design directive). Left
 * column is the glyph + display title + lede. Right column is a
 * spec panel (price, stock, agent-fetch tally, agent-facing link).
 * Below: specs grid two-up; below that, a paired call-to-action
 * row pointing at the three /agent/* formats.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadAllSlugs, loadProduct } from "@/lib/product-loader";
import { formatPrice } from "@/lib/catalog";
import { canonicalUrl, productJsonLd } from "@/lib/citation";
import { AgentTally } from "@/components/AgentTally";
import { ProductGlyph } from "@/components/ProductGlyph";
import { Inspect } from "@/components/inspector/BoundaryLabel";
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
    <main className="container-edge pt-16 pb-32 sm:pt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />

      <Inspect mode="static-shell" note="PPR static shell — built per-slug at build">
        <nav aria-label="Breadcrumb" className="type-eyebrow">
          <Link
            href="/"
            data-magnetic
            className="hover:text-[color:var(--color-accent)]"
          >
            ← /ANCHOR
          </Link>
          <span aria-hidden className="mx-3 text-[color:var(--color-rule)]">
            /
          </span>
          <span>{product.category}</span>
        </nav>
      </Inspect>

      {/* Asymmetric hero: glyph + name + lede on the left, price /
       * stock / tally panel on the right. 8/4 split on desktop. */}
      <section
        aria-labelledby="product-heading"
        className="mt-12 grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-12"
      >
        <div className="lg:col-span-8">
          <Inspect mode="cached" note="loadProduct() — 'use cache' + cacheTag('product:<slug>')">
            <header className="flex items-start gap-6 sm:gap-10">
              <span className="shrink-0">
                <ProductGlyph
                  category={product.category}
                  size={120}
                  className="opacity-90"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="type-eyebrow">{product.brand}</p>
                <h1
                  id="product-heading"
                  className="type-h1 mt-4 break-words"
                >
                  {product.name}
                </h1>
              </div>
            </header>
            <p className="type-lede mt-10 max-w-[58ch]">
              {product.shortDescription}
            </p>
          </Inspect>
        </div>

        {/* Right-side spec panel — hairline rules, mono labels.
         * Sticky on desktop so it stays in view while reading the
         * specs grid below. */}
        <aside className="lg:col-span-4 lg:pt-2">
          <div className="lg:sticky lg:top-28">
            <dl className="divide-y divide-[color:var(--color-rule)] border-y border-[color:var(--color-rule)]">
              <div className="flex items-baseline justify-between gap-4 py-4">
                <dt className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
                  Price
                </dt>
                <dd className="display text-3xl">
                  {formatPrice(product.pricing.listCents)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
                  Floor
                </dt>
                <dd className="mono text-sm text-[color:var(--color-ink-dim)]">
                  {product.pricing.negotiable
                    ? formatPrice(product.pricing.floorCents)
                    : "—"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
                  Stock
                </dt>
                <dd className="mono text-sm text-[color:var(--color-ink)]">
                  {product.inventory > 0
                    ? `${product.inventory} available`
                    : "Out of stock"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
                  Negotiable
                </dt>
                <dd
                  className="mono text-sm"
                  style={{
                    color: product.pricing.negotiable
                      ? "var(--color-accent)"
                      : "var(--color-ink-dim)",
                  }}
                >
                  {product.pricing.negotiable ? "Yes" : "No"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
                  Agent fetches
                </dt>
                <dd className="mono text-sm">
                  <Inspect mode="ppr-hole" note="Suspense + headers() — streams in at request time">
                    <AgentTally slug={slug} />
                  </Inspect>
                </dd>
              </div>
            </dl>

            <Link
              href="/playground"
              data-magnetic
              className="mono mt-6 inline-flex w-full items-center justify-between border border-[color:var(--color-accent)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[color:var(--color-accent)] transition-colors hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-canvas)]"
            >
              Try the agent checkout
              <span aria-hidden>→</span>
            </Link>
          </div>
        </aside>
      </section>

      {/* Specs grid — two-up on desktop with hairline left rule
       * markers per row. Per-skill anti-card-overuse rule. */}
      <Inspect mode="static-shell" note="Spec rows from CATALOG — no card containers">
        <section aria-labelledby="specs-heading" className="mt-24">
          <h2 id="specs-heading" className="type-h2">
            Specifications.
          </h2>
          <dl className="mt-10 grid grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2">
            {product.specs.map((s) => (
              <div
                key={s.label}
                className="border-l border-[color:var(--color-rule)] pl-5"
              >
                <dt className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
                  {s.label}
                </dt>
                <dd className="mt-2 text-base text-[color:var(--color-ink)]">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </Inspect>

      {/* Three agent formats — each one a deep link to the static
       * cached body the LLM crawler reads. */}
      <section
        aria-labelledby="agent-formats-heading"
        className="mt-24 border-t border-[color:var(--color-rule)] pt-12"
      >
        <h2 id="agent-formats-heading" className="type-eyebrow">
          LLM-facing surfaces
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-y-8 gap-x-10 sm:grid-cols-3">
          <AgentFormatLink
            slug={slug}
            format="markdown"
            label="Markdown"
            copy="Citation opening + JSON-LD fence + prose. The recommended canonical shape."
          />
          <AgentFormatLink
            slug={slug}
            format="json"
            label="JSON-LD"
            copy="Schema.org Product / Offer only. For crawlers that prefer pure structured data."
          />
          <AgentFormatLink
            slug={slug}
            format="plain"
            label="Plain text"
            copy="Citation opening + prose body. For crawlers that don't parse structured data."
          />
        </div>
      </section>
    </main>
  );
}

function AgentFormatLink({
  slug,
  format,
  label,
  copy,
}: {
  slug: string;
  format: "markdown" | "json" | "plain";
  label: string;
  copy: string;
}) {
  return (
    <Link
      href={`/products/${slug}/agent/${format}`}
      data-magnetic
      className="group block border-l border-[color:var(--color-rule)] pl-5 transition-colors hover:border-[color:var(--color-accent)]"
    >
      <p className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)] transition-colors group-hover:text-[color:var(--color-accent)]">
        /agent/{format} <span aria-hidden>→</span>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-ink-dim)]">
        <span className="block text-[color:var(--color-ink)]">{label}.</span>{" "}
        {copy}
      </p>
    </Link>
  );
}
