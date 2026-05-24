/**
 * The dynamic suspense hole on the otherwise-static product page.
 *
 * Now wired to Redis. Counts every LLM-crawler fetch of this slug's
 * /agent endpoint over the last 7 days, summed across known bot
 * user-agents. The component renders inside a Suspense boundary on
 * a PPR page, so the rest of the product page (copy, specs,
 * JSON-LD) prerenders at build time and this number streams in at
 * request time.
 *
 * If Upstash is unset, the redis stub returns 0 and we render
 * "—" — still degrades gracefully.
 */
import { Suspense } from "react";
import { headers } from "next/headers";
import { countFetchesAllBots } from "@/lib/aeo";

async function TallyInner({ slug }: { slug: string }) {
  /* Marks this Suspense hole dynamic under cacheComponents — the
   * rest of the product page stays prerendered while this streams
   * in with a fresh Redis read at request time. */
  await headers();
  const count = await countFetchesAllBots(slug, 24 * 7);
  return (
    <span className="mono text-xs text-[var(--color-ink-dim)]">
      AGENT FETCHES (7D):{" "}
      <span className="text-[var(--color-accent)]">
        {count > 0 ? count.toLocaleString() : "—"}
      </span>
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
