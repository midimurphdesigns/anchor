/**
 * ProsCons — the comparison shape for two products that solve
 * overlapping problems but aren't direct substitutes. Two
 * columns, each with pros and cons of that product for the
 * shared use case.
 */
import type { z } from "zod";
import type { prosConsShape } from "@/lib/compare-agent";
import { getProduct, formatPrice } from "@/lib/catalog";

type Props = { data: z.infer<typeof prosConsShape> };

function Column({
  side,
}: {
  side: z.infer<typeof prosConsShape>["a"];
}) {
  const product = getProduct(side.slug);
  if (!product) return null;
  return (
    <div className="border border-[var(--color-rule)] p-5">
      <p className="display text-xl">{product.name}</p>
      <p className="mono text-xs text-[var(--color-ink-dim)]">
        {product.brand} / {formatPrice(product.pricing.listCents)}
      </p>
      <p className="mono mt-6 text-xs uppercase tracking-wider text-[var(--color-accent)]">
        PROS
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {side.pros.map((p, i) => (
          <li key={`p-${i}`}>{p}</li>
        ))}
      </ul>
      <p className="mono mt-6 text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
        CONS
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--color-ink-dim)]">
        {side.cons.map((c, i) => (
          <li key={`c-${i}`}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

export function ProsCons({ data }: Props) {
  return (
    <article className="mt-12 border border-[var(--color-rule)] p-6 sm:p-8">
      <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--color-ink-dim)]">
        SHAPE: PROS & CONS
      </p>
      <h2 className="display mt-3 text-2xl leading-tight">{data.headline}</h2>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Column side={data.a} />
        <Column side={data.b} />
      </div>
    </article>
  );
}
