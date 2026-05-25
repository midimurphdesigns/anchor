import Link from "next/link";
import { CATALOG, formatPrice } from "@/lib/catalog";
import { Inspect } from "@/components/inspector/BoundaryLabel";
import { ProductGlyph } from "@/components/ProductGlyph";

/* Home page is fully static. The catalog list builds at compile time
 * from CATALOG. PPR/dynamic surfaces (product detail, dashboard, the
 * /agent endpoints) link out from here. */
export default function HomePage() {
  return (
    <Inspect mode="static-route" note="/ — full static route">
      <main className="container-edge pt-20 pb-32 sm:pt-28 sm:pb-40">
        {/* Asymmetric hero — split 7/5 across 12-col grid. Eyebrow +
         * display + lede stack on the left; a hairline metadata panel
         * sits on the right with the build-spec callouts. Anti-center
         * bias per the design directive. */}
        <section
          aria-labelledby="hero-heading"
          className="grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-12"
        >
          <div className="lg:col-span-7">
            <p className="type-eyebrow">→ /ANCHOR</p>
            <h1 id="hero-heading" className="type-display mt-6">
              anchor.
            </h1>
            <p className="type-lede mt-10 max-w-[52ch]">
              An AI-native product catalog. Every item below has a human
              page and three statically-cached LLM endpoints optimized
              for citation, discovery, and agent purchase.
            </p>

            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3">
              <Link
                href="/ask"
                data-magnetic
                className="mono inline-flex items-baseline gap-3 border-b border-[color:var(--color-accent)] pb-1 text-sm uppercase tracking-[0.18em] text-[color:var(--color-accent)]"
              >
                Ask the on-page agent
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/playground"
                data-magnetic
                className="mono inline-flex items-baseline gap-3 border-b border-[color:var(--color-rule)] pb-1 text-sm uppercase tracking-[0.18em] text-[color:var(--color-ink-dim)] hover:text-[color:var(--color-ink)] hover:border-[color:var(--color-ink-dim)]"
              >
                Try the checkout pipeline
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          {/* Spec panel — readable on its own, doesn't compete with
           * the display. Hairline rule frame, mono labels + cyan
           * accent values. */}
          <aside className="lg:col-span-5 lg:pt-4">
            <dl className="divide-y divide-[color:var(--color-rule)] border-y border-[color:var(--color-rule)]">
              <SpecRow label="Routes prerendered" value="40" />
              <SpecRow label="LLM crawlers classified" value="13" />
              <SpecRow label="Checks on the agent pipeline" value="8" />
              <SpecRow label="Cache-hit TTFB target" value="~5 ms" />
              <SpecRow label="Stack" value="Next 16 / TS strict / Tailwind v4" />
            </dl>
            <p className="mt-6 text-sm leading-relaxed text-[color:var(--color-ink-dim)]">
              Build 3 of the trilogy.{" "}
              <a
                data-magnetic
                className="text-[color:var(--color-ink)] underline decoration-[color:var(--color-accent)] underline-offset-4"
                href="https://forge.kevinmurphywebdev.com"
              >
                forge
              </a>{" "}
              and{" "}
              <a
                data-magnetic
                className="text-[color:var(--color-ink)] underline decoration-[color:var(--color-accent)] underline-offset-4"
                href="https://loom.kevinmurphywebdev.com"
              >
                loom
              </a>{" "}
              are the prior two.
            </p>
          </aside>
        </section>

        {/* Catalog — glyph + listing pair. Two-column grid on
         * desktop. Each row carries a category glyph as the visual
         * hook the catalog used to lack. */}
        <Inspect mode="static-shell" note="CATALOG constant — no data fetch">
          <section aria-labelledby="catalog-heading" className="mt-32">
            <div className="flex items-baseline justify-between gap-6 border-b border-[color:var(--color-rule)] pb-5">
              <h2 id="catalog-heading" className="type-h2">
                Catalog.
              </h2>
              <p className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
                {CATALOG.length} products
              </p>
            </div>

            <ul className="stagger mt-2 divide-y divide-[color:var(--color-rule)]">
              {CATALOG.map((p, i) => (
                <li key={p.slug} style={{ ["--index" as string]: i }}>
                  <Link
                    href={`/products/${p.slug}`}
                    data-magnetic
                    className="group flex items-center gap-6 py-6 transition-colors hover:bg-white/[0.015]"
                  >
                    <span className="shrink-0">
                      <ProductGlyph category={p.category} size={64} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xl leading-tight text-[color:var(--color-ink)] transition-colors group-hover:text-[color:var(--color-accent)]">
                        {p.name}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--color-ink-dim)]">
                        {p.brand}
                        <span aria-hidden className="mx-2 text-[color:var(--color-ink-faint)]">
                          /
                        </span>
                        {p.category}
                      </p>
                    </div>
                    <div className="mono shrink-0 text-sm text-[color:var(--color-ink-dim)] transition-colors group-hover:text-[color:var(--color-ink)]">
                      {formatPrice(p.pricing.listCents)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Inspect>

        {/* Secondary discovery — surfaces the demo pages with brief
         * one-liners so visitors know where to go next. Bordered grid
         * (no cards — the skill's anti-card-overuse). */}
        <section
          aria-labelledby="more-heading"
          className="mt-32 border-t border-[color:var(--color-rule)] pt-12"
        >
          <h2 id="more-heading" className="type-eyebrow">
            Where else to go
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-y-10 gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
            <DiscoveryLink
              href="/ask"
              label="Ask"
              copy="Talk to anchor's on-page agent. It can list the catalog, walk the eight-check pipeline, fetch agents.json, and propose navigations you accept with a click."
            />
            <DiscoveryLink
              href="/playground"
              label="Playground"
              copy="Fire real /api/agent/checkout calls through five canonical scenarios. See exactly which check rejects which attack."
            />
            <DiscoveryLink
              href="/compare"
              label="Compare"
              copy="Pick two products. The model picks one of three UI shapes (spec table, pros and cons, recommendation) and renders it."
            />
            <DiscoveryLink
              href="/dashboard"
              label="AEO dashboard"
              copy="Live agent-fetch counts by bot. 24h / 7d / 30d totals, bot-mix breakdown, per-product table, live tail."
            />
            <DiscoveryLink
              href="/agents"
              label="For agents"
              copy="Human-readable mirror of /.well-known/agents.json. Endpoints, auth model, pricing-negotiation envelope, rate limits."
            />
            <DiscoveryLink
              href="/docs/rendering"
              label="Rendering docs"
              copy="Every route in anchor, its render mode, and why. The Next 16 + AI SDK v6 cheat sheet."
            />
            <DiscoveryLink
              href="https://github.com/midimurphdesigns/anchor"
              label="Source"
              copy="Full repo on GitHub. The eight checks, the agents.json descriptor, the proxy logging, the test script."
              external
            />
          </div>
        </section>
      </main>
    </Inspect>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3">
      <dt className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
        {label}
      </dt>
      <dd className="mono text-sm text-[color:var(--color-accent)] text-right">
        {value}
      </dd>
    </div>
  );
}

function DiscoveryLink({
  href,
  label,
  copy,
  external,
}: {
  href: string;
  label: string;
  copy: string;
  external?: boolean;
}) {
  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};
  return (
    <Link
      href={href}
      data-magnetic
      className="group block border-l border-[color:var(--color-rule)] pl-5 transition-colors hover:border-[color:var(--color-accent)]"
      {...linkProps}
    >
      <p className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)] transition-colors group-hover:text-[color:var(--color-accent)]">
        {label} <span aria-hidden>→</span>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-ink-dim)]">
        {copy}
      </p>
    </Link>
  );
}
