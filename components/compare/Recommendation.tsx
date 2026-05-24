/**
 * Recommendation — the fallback comparison shape for two products
 * with little or no overlap. A short paragraph + an optional pick.
 */
import type { z } from "zod";
import type { recommendationShape } from "@/lib/compare-agent";
import { getProduct, formatPrice } from "@/lib/catalog";

type Props = { data: z.infer<typeof recommendationShape> };

export function Recommendation({ data }: Props) {
  const pick = data.pickSlug ? getProduct(data.pickSlug) : null;
  return (
    <article className="mt-12 border border-[var(--color-rule)] p-6 sm:p-8">
      <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--color-ink-dim)]">
        SHAPE: RECOMMENDATION
      </p>
      <h2 className="display mt-3 text-2xl leading-tight">{data.headline}</h2>
      <p className="mt-6 text-base leading-relaxed text-[var(--color-ink)]">
        {data.body}
      </p>

      {pick && data.pickReason ? (
        <div className="mt-8 border-l-2 border-[var(--color-accent)] pl-4">
          <p className="mono text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
            AGENT'S PICK
          </p>
          <p className="display mt-2 text-xl text-[var(--color-accent)]">
            {pick.name}{" "}
            <span className="mono text-sm text-[var(--color-ink-dim)]">
              {formatPrice(pick.pricing.listCents)}
            </span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]">
            {data.pickReason}
          </p>
        </div>
      ) : null}
    </article>
  );
}
