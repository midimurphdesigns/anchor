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
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--color-ink-dim)]">
        <Link href="/" className="hover:text-[var(--color-accent)]">
          ← /ANCHOR
        </Link>
        {"  /  COMPARE"}
      </p>

      <h1 className="display mt-6 text-5xl sm:text-7xl">Compare.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-dim)]">
        Pick two products. The comparison agent looks at the specs and decides
        which UI shape fits: a side-by-side spec table when the two are direct
        rivals, a pros-and-cons split when they overlap on use case, or a short
        recommendation when they don't really substitute for each other.
      </p>

      <Inspect mode="client" note="CompareForm — 'use client', Server Action → streamObject">
        <CompareForm catalog={catalog} />
      </Inspect>
    </main>
  );
}
