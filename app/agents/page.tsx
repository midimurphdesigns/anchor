/**
 * Human-facing /agents page. Renders the same descriptor an agent
 * runtime sees at /.well-known/agents.json — so the documentation
 * is the implementation. If the descriptor drifts, this page
 * drifts with it. No separate doc to maintain.
 *
 * Rendering tier: PPR (inherits from the cached loader). The whole
 * tree is static because the data source is the in-memory CATALOG
 * via 'use cache'. When inventory changes and the descriptor cache
 * is invalidated, this page regenerates with it.
 */
import Link from "next/link";
import { loadAgentsDescriptor } from "@/lib/agents-descriptor";

export const metadata = {
  title: "Agents — anchor",
  description:
    "What anchor exposes to AI agents. Capabilities, endpoints, auth model, and pricing negotiation envelope.",
};

export default async function AgentsPage() {
  const d = await loadAgentsDescriptor();

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
        <span>For agents</span>
      </nav>

      <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12">
        <header className="lg:col-span-8">
          <h1 className="type-h1">For agents.</h1>
          <p className="type-lede mt-8">
            Human-readable mirror of the machine descriptor at{" "}
            <a
              data-magnetic
              href="/.well-known/agents.json"
              className="text-[color:var(--color-ink)] underline decoration-[color:var(--color-accent)] underline-offset-4"
            >
              /.well-known/agents.json
            </a>
            . Both render from the same source; documentation is the
            implementation.
          </p>
        </header>
        <aside className="lg:col-span-4 lg:pt-2">
          <p className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
            Endpoints, auth model, pricing-negotiation envelope, and rate
            limits in the Agentic Commerce Protocol shape.
          </p>
        </aside>
      </div>

      <section className="mt-16">
        <h2 className="display text-3xl">Capabilities.</h2>
        <ul className="mono mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {d.capabilities.map((c) => (
            <li
              key={c}
              className="border border-[var(--color-rule)] px-3 py-2 text-center uppercase tracking-wider"
            >
              {c}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="display text-3xl">Endpoints.</h2>
        <dl className="mt-6 space-y-6">
          {Object.entries(d.endpoints).map(([key, ep]) => {
            const url = "url" in ep ? ep.url : ep.urlTemplate;
            return (
              <div
                key={key}
                className="border-l-2 border-[var(--color-rule)] pl-4"
              >
                <dt className="mono text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
                  {ep.method} {key}
                </dt>
                <dd className="mt-2">
                  <code className="mono break-all text-sm text-[var(--color-accent)]">
                    {url}
                  </code>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-dim)]">
                    {ep.description}
                  </p>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="mt-16">
        <h2 className="display text-3xl">Authentication.</h2>
        <div className="mt-6 border-l-2 border-[var(--color-rule)] pl-4">
          <p className="mono text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
            {d.auth.protocol} / {d.auth.type}
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            Header:{" "}
            <code className="mono text-[var(--color-accent)]">
              {d.auth.principalHeader}
            </code>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">
            {d.auth.description}
          </p>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="display text-3xl">Pricing negotiation.</h2>
        <p className="mt-6 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          Negotiation is{" "}
          <span className="text-[var(--color-accent)]">
            {d.pricing.negotiation.supported ? "supported" : "not supported"}
          </span>{" "}
          at{" "}
          <span className="text-[var(--color-accent)]">
            {d.pricing.negotiation.scope}
          </span>{" "}
          scope, capped at{" "}
          <span className="text-[var(--color-accent)]">
            {d.pricing.negotiation.maxDiscountPct}%
          </span>{" "}
          discount.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          {d.pricing.negotiation.mechanism}
        </p>
      </section>

      <section className="mt-16">
        <h2 className="display text-3xl">Rate limits.</h2>
        <div className="mono mt-6 grid grid-cols-2 gap-6 text-sm">
          <div className="border border-[var(--color-rule)] px-4 py-3">
            <div className="text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
              Per agent / min
            </div>
            <div className="mt-1 text-2xl text-[var(--color-accent)]">
              {d.rateLimits.perAgentPerMinute}
            </div>
          </div>
          <div className="border border-[var(--color-rule)] px-4 py-3">
            <div className="text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
              Per agent / day
            </div>
            <div className="mt-1 text-2xl text-[var(--color-accent)]">
              {d.rateLimits.perAgentPerDay}
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-24 border-t border-[var(--color-rule)] pt-8 text-sm text-[var(--color-ink-dim)]">
        <p>
          Browse the{" "}
          <a
            href="/.well-known/agents.json"
            className="underline decoration-[var(--color-accent)]"
          >
            raw descriptor
          </a>{" "}
          or the{" "}
          <a
            href="/llms.txt"
            className="underline decoration-[var(--color-accent)]"
          >
            llms.txt reading list
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
