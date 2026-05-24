/**
 * The dynamic suspense hole in the otherwise-static product page.
 *
 * Phase 2 stub: returns a placeholder. Phase 4 replaces this with a
 * Redis read counting LLM-user-agent fetches against this slug in
 * the last 7 days. The point of stubbing it now is to prove the PPR
 * shape: the product copy renders at build time, this component
 * suspends and streams in at request time. Curling the page should
 * show product HTML immediately and the tally arriving later.
 */
import { Suspense } from "react";

async function TallyInner({ slug }: { slug: string }) {
  /* Simulated latency so the PPR hole is observable. Real Phase 4
   * code awaits a redis.zcount call here. */
  await new Promise((r) => setTimeout(r, 60));
  void slug;
  return (
    <span className="mono text-xs text-[var(--color-ink-dim)]">
      AGENT FETCHES (7D): <span className="text-[var(--color-accent)]">—</span>
    </span>
  );
}

export function AgentTally({ slug }: { slug: string }) {
  return (
    <Suspense
      fallback={
        <span className="mono text-xs text-[var(--color-ink-dim)]">
          AGENT FETCHES (7D): <span className="opacity-50">···</span>
        </span>
      }
    >
      <TallyInner slug={slug} />
    </Suspense>
  );
}
