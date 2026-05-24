/**
 * /docs/rendering — the rendering-mode cheat sheet for anchor.
 *
 * Every route + every Next 16 primitive the build uses, with one
 * short rationale per entry. The page reads top-to-bottom as a
 * journey from most-static to most-dynamic, which doubles as the
 * mental model for picking a render mode on a new route.
 *
 * Sourced from lib/render-modes.ts so the docs and the actual
 * route table can't drift apart silently.
 */
import Link from "next/link";
import {
  MODE_GLYPH,
  MODE_LABEL,
  PRIMITIVES,
  ROUTES,
  type RenderMode,
} from "@/lib/render-modes";

export const metadata = {
  title: "Rendering — anchor docs",
  description:
    "Every route in anchor, its render mode, and why it picked that mode. The Next 16 + AI SDK v6 cheat sheet.",
};

const MODE_ORDER: ReadonlyArray<RenderMode> = [
  "static",
  "ssg",
  "ppr",
  "dynamic",
  "edge",
];

export default function RenderingDocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--color-ink-dim)]">
        <Link href="/" className="hover:text-[var(--color-accent)]">
          ← /ANCHOR
        </Link>
        {"  /  DOCS  /  RENDERING"}
      </p>

      <h1 className="display mt-6 text-5xl sm:text-7xl">Rendering.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-dim)]">
        Every route in anchor, the mode it picked, and why. The page reads
        top-to-bottom as a journey from most-static to most-dynamic — the same
        mental model to use when deciding how to render anything new.
      </p>

      <section className="mt-16">
        <h2 className="display text-3xl">Legend.</h2>
        <dl className="mono mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          {MODE_ORDER.map((m) => (
            <div
              key={m}
              className="border border-[var(--color-rule)] px-4 py-3"
            >
              <dt className="flex items-baseline gap-3">
                <span className="text-2xl text-[var(--color-accent)]">
                  {MODE_GLYPH[m]}
                </span>
                <span className="text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
                  {MODE_LABEL[m]}
                </span>
              </dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-16">
        <h2 className="display text-3xl">Routes.</h2>
        <ul className="mt-6 space-y-6">
          {ROUTES.map((r) => (
            <li
              key={r.path}
              className="border-l-2 border-[var(--color-rule)] pl-4"
            >
              <div className="flex items-baseline gap-3">
                <span className="mono text-lg text-[var(--color-accent)]">
                  {MODE_GLYPH[r.mode]}
                </span>
                <code className="mono text-sm text-[var(--color-ink)]">
                  {r.path}
                </code>
                <span className="mono ml-auto text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
                  {MODE_LABEL[r.mode]}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">
                {r.rationale}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="display text-3xl">Primitives.</h2>
        <p className="mt-3 text-sm text-[var(--color-ink-dim)]">
          The Next 16 + AI SDK v6 features the build leans on, with file
          paths so you can grep for each one in the repo.
        </p>
        <ul className="mt-6 space-y-6">
          {PRIMITIVES.map((p) => (
            <li
              key={p.name}
              className="border-l-2 border-[var(--color-rule)] pl-4"
            >
              <p className="display text-xl text-[var(--color-ink)]">
                {p.name}
              </p>
              <p className="mono mt-2 text-xs text-[var(--color-ink-dim)]">
                {p.where}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]">
                {p.what}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="display text-3xl">How to pick.</h2>
        <p className="mt-6 text-sm leading-relaxed text-[var(--color-ink)]">
          When you sit down to render anything new, the question to ask first
          is: <em>what's the most static this can be without losing the
          dynamic behavior I actually need?</em>
        </p>
        <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          <li>
            Does the body depend on the visitor (auth, personalization, live
            data)? If no → static or SSG. Wrap data loaders in{" "}
            <code className="mono text-[var(--color-accent)]">'use cache'</code>{" "}
            and you're done.
          </li>
          <li>
            One small piece needs to be live? → PPR. Wrap that piece in{" "}
            <code className="mono text-[var(--color-accent)]">
              {`<Suspense>`}
            </code>
            ; the rest stays static.
          </li>
          <li>
            The whole page depends on the request? → Dynamic. Read{" "}
            <code className="mono text-[var(--color-accent)]">headers()</code>{" "}
            or{" "}
            <code className="mono text-[var(--color-accent)]">cookies()</code>{" "}
            at the top.
          </li>
          <li>
            Cross-cutting concern that should run before any route? → Proxy.
            Geographic edge, no React render needed.
          </li>
          <li>
            Interactive UI (state, events, browser APIs)? →{" "}
            <code className="mono text-[var(--color-accent)]">'use client'</code>{" "}
            on just the interactive component, not the parent.
          </li>
        </ol>
      </section>
    </main>
  );
}
