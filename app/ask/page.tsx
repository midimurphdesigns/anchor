/**
 * /ask — fullscreen conversational surface.
 *
 * Same AskAnchor component the dock uses, but mounted in fullscreen
 * mode so the chat occupies the whole viewport instead of a drawer.
 * Static shell + client component; the chat itself streams via
 * /api/ask.
 */
import Link from "next/link";
import { Suspense } from "react";
import AskAnchor from "@/components/AskAnchor";
import { Inspect } from "@/components/inspector/BoundaryLabel";

export const metadata = {
  title: "Ask — anchor",
  description:
    "Talk to anchor's on-page agent. Conversational answers, real tool calls against the catalog, agents.json descriptor lookups, and proposed navigations you can confirm with a click. Every product fetch contributes one entry to the AEO dashboard.",
};

export default function AskPage() {
  return (
    <main className="container-edge pt-16 pb-16 sm:pt-24">
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
        <span>Ask</span>
      </nav>

      <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12">
        <header className="lg:col-span-8">
          <h1 className="type-h1">Ask anchor.</h1>
          <p className="type-lede mt-8">
            Talk to the on-page agent. It can list and explain the catalog,
            walk you through the eight-check checkout pipeline, fetch the
            agents.json descriptor, compare products, and propose
            navigations you accept with one click.
          </p>
        </header>
        <aside className="lg:col-span-4 lg:pt-2">
          <p className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
            Every product fetch the agent makes is logged to the AEO
            dashboard as bot class{" "}
            <code className="text-[color:var(--color-accent)]">
              anchor-ask
            </code>
            . Talk for two minutes, then check{" "}
            <Link
              href="/dashboard"
              data-magnetic
              className="text-[color:var(--color-ink)] underline decoration-[color:var(--color-accent)] underline-offset-4"
            >
              /dashboard
            </Link>{" "}
            to see your traffic.
          </p>
        </aside>
      </div>

      <Inspect mode="client" note="AskAnchor — 'use client', useChat → streamText with 5 tools">
        <section className="mt-12">
          <Suspense
            fallback={
              <div className="mono border border-[color:var(--color-rule)] p-6 text-xs text-[color:var(--color-ink-dim)]">
                Loading conversational surface…
              </div>
            }
          >
            <AskAnchor fullscreen />
          </Suspense>
        </section>
      </Inspect>
    </main>
  );
}
