import Link from "next/link";
import { CATALOG, formatPrice } from "@/lib/catalog";

/* Home page is fully static. The /products listing builds at compile
 * time from CATALOG; new products would land here on the next build.
 *
 * Rendering tier demo: this whole tree is SSG. No 'use cache', no
 * runtime data fetch, no PPR holes — it's a pure compile-time render
 * to set the baseline before the more dynamic surfaces (product
 * detail with PPR + Suspense, dashboard with force-dynamic, agents
 * endpoint on Edge) come in. */
export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--color-ink-dim)]">
        → /ANCHOR
      </p>
      <h1 className="display mt-6 text-5xl sm:text-7xl">
        anchor.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-dim)]">
        An AI-native product catalog. Every item below has a human page and an
        LLM-facing endpoint optimized for citation, discovery, and agent
        purchase. The agent-fetch counts on each card are live.
      </p>

      <div className="mt-16 flex items-baseline gap-4">
        <h2 className="display text-3xl">Catalog.</h2>
        <span className="mono text-xs text-[var(--color-ink-dim)]">
          {CATALOG.length} PRODUCTS
        </span>
      </div>

      <ul className="mt-8 divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
        {CATALOG.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/products/${p.slug}`}
              className="group flex items-baseline justify-between gap-6 py-5 transition hover:bg-white/[0.02]"
            >
              <div className="min-w-0">
                <h3 className="text-xl text-[var(--color-ink)] group-hover:text-[var(--color-accent)]">
                  {p.name}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
                  {p.brand} / {p.category}
                </p>
              </div>
              <div className="mono shrink-0 text-sm text-[var(--color-ink-dim)]">
                {formatPrice(p.pricing.listCents)}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <nav className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--color-rule)] pt-6 text-sm">
        <Link
          href="/compare"
          className="text-[var(--color-ink-dim)] hover:text-[var(--color-accent)]"
        >
          → Compare two products
        </Link>
        <Link
          href="/agents"
          className="text-[var(--color-ink-dim)] hover:text-[var(--color-accent)]"
        >
          → For agents
        </Link>
        <Link
          href="/dashboard"
          className="text-[var(--color-ink-dim)] hover:text-[var(--color-accent)]"
        >
          → Live AEO dashboard
        </Link>
        <Link
          href="/docs/rendering"
          className="text-[var(--color-ink-dim)] hover:text-[var(--color-accent)]"
        >
          → Rendering docs
        </Link>
      </nav>

      <footer className="mt-24 border-t border-[var(--color-rule)] pt-8 text-sm text-[var(--color-ink-dim)]">
        <p>
          Build 3 of the trilogy. See{" "}
          <a
            className="underline decoration-[var(--color-accent)]"
            href="https://forge.kevinmurphywebdev.com"
          >
            forge
          </a>{" "}
          and{" "}
          <a
            className="underline decoration-[var(--color-accent)]"
            href="https://loom.kevinmurphywebdev.com"
          >
            loom
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
