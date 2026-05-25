/**
 * /compare — generative UI demo.
 *
 * Server component renders the form shell (static); the form
 * itself is a client component that submits to the
 * compareProducts() Server Action, gets back a discriminated-
 * union Comparison object, and renders one of three components
 * based on the kind the model picked.
 *
 * The static catalog list is computed at build time from the
 * cached loadAllSlugs() and the in-memory CATALOG, then passed
 * to the client component as a serializable prop. Selecting
 * products doesn't require a server round-trip until submit.
 */
import Link from "next/link";
import { CATALOG } from "@/lib/catalog";
import { CompareForm } from "@/components/CompareForm";
import { Inspect } from "@/components/inspector/BoundaryLabel";

export const metadata = {
  title: "Compare — anchor",
  description:
    "Generative UI demo: pick two products, the model picks a comparison shape (spec table, pros and cons, or a recommendation) and renders it inline.",
};

export default function ComparePage() {
  const catalog = CATALOG.map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
  }));

  return (
    <main className="container-edge pt-16 pb-32 sm:pt-24">
      <nav aria-label="Breadcrumb" className="type-eyebrow">
        <Link
          href="/"
          data-magnetic
          className="hover:text-[color:var(--color-accent)]"
        >
          ← /ANCHOR
        </Link>
        <span aria-hidden className="mx-3 text-[color:var(--color-rule)]">/</span>
        <span>Compare</span>
      </nav>

      <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12">
        <header className="lg:col-span-8">
          <h1 className="type-h1">Compare.</h1>
          <p className="type-lede mt-8">
            Pick two products. The comparison agent looks at the specs and
            decides which UI shape fits: a side-by-side spec table when the
            two are direct rivals, a pros-and-cons split when they overlap
            on use case, or a short recommendation when they don't really
            substitute for each other.
          </p>
        </header>
        <aside className="lg:col-span-4 lg:pt-2">
          <p className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
            Generative UI via streamObject + Zod discriminated union. The
            model picks the shape; React switch-renders the matching
            component.
          </p>
        </aside>
      </div>

      <Inspect mode="client" note="CompareForm — 'use client', Server Action → streamObject">
        <CompareForm catalog={catalog} />
      </Inspect>
    </main>
  );
}
