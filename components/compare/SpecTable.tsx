/**
 * SpecTable — the comparison shape for two products that share
 * a category. Side-by-side spec rows with the agent's pick
 * called out at the bottom.
 */
import type { z } from "zod";
import type { specTableShape } from "@/lib/compare-agent";
import { getProduct, formatPrice } from "@/lib/catalog";

type Props = { data: z.infer<typeof specTableShape> };

export function SpecTable({ data }: Props) {
  const pick = getProduct(data.pickSlug);

  return (
    <article className="mt-12 border border-[var(--color-rule)] p-6 sm:p-8">
      <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--color-ink-dim)]">
        SHAPE: SPEC TABLE
      </p>
      <h2 className="display mt-3 text-2xl leading-tight">{data.headline}</h2>

      <table className="mono mt-8 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
            <th className="border-b border-[var(--color-rule)] py-2">Spec</th>
            <th className="border-b border-[var(--color-rule)] py-2">A</th>
            <th className="border-b border-[var(--color-rule)] py-2">B</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr
              key={`${row.label}-${i}`}
              className="border-b border-[var(--color-rule)]"
            >
              <td className="py-3 pr-4 text-[var(--color-ink-dim)]">
                {row.label}
              </td>
              <td className="py-3 pr-4">{row.a}</td>
              <td className="py-3">{row.b}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {pick ? (
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
