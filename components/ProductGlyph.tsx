/**
 * ProductGlyph — generated SVG mark, one per product category.
 *
 * Stock product photography on a fictional catalog reads as slop.
 * Instead, each category gets a geometric glyph drawn from the
 * brand vocabulary (rhombus cursor primitive, hairline strokes,
 * single cyan accent) so the catalog has visual variety without
 * lying about a product the visitor will never receive.
 *
 * The glyphs are SVG so they scale crisply, weigh nothing on the
 * wire, and stay sharp against the grain texture.
 */
import type { Product } from "@/lib/catalog";

type Props = {
  category: Product["category"];
  size?: number;
  className?: string;
};

const STROKE = "var(--color-ink-dim)";
const ACCENT = "var(--color-accent)";

export function ProductGlyph({ category, size = 64, className }: Props) {
  const w = size;
  const h = size;

  const glyph = (() => {
    switch (category) {
      case "grinder":
        return (
          <g fill="none" strokeWidth="1.25" strokeLinecap="square">
            {/* Burr ring */}
            <circle cx="32" cy="32" r="20" stroke={STROKE} />
            <circle cx="32" cy="32" r="13" stroke={STROKE} />
            <circle cx="32" cy="32" r="2" fill={ACCENT} stroke="none" />
            {/* Burr teeth — 8 hairlines from r=13 to r=20 */}
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const x1 = 32 + Math.cos(a) * 13;
              const y1 = 32 + Math.sin(a) * 13;
              const x2 = 32 + Math.cos(a) * 20;
              const y2 = 32 + Math.sin(a) * 20;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={STROKE}
                />
              );
            })}
          </g>
        );
      case "kettle":
        return (
          <g fill="none" strokeWidth="1.25" strokeLinecap="square">
            {/* Kettle body */}
            <path
              d="M 22 22 L 22 44 Q 22 50 28 50 L 36 50 Q 42 50 42 44 L 42 22 Z"
              stroke={STROKE}
            />
            {/* Gooseneck */}
            <path
              d="M 42 26 Q 52 26 52 18 Q 52 14 48 14"
              stroke={ACCENT}
            />
            {/* Lid */}
            <line x1="22" y1="22" x2="42" y2="22" stroke={STROKE} />
            <circle cx="32" cy="18" r="2" fill={STROKE} stroke="none" />
          </g>
        );
      case "brewer":
        return (
          <g fill="none" strokeWidth="1.25" strokeLinecap="square">
            {/* V60 cone */}
            <path d="M 16 16 L 48 16 L 36 40 L 28 40 Z" stroke={STROKE} />
            {/* Drip */}
            <line x1="32" y1="40" x2="32" y2="50" stroke={ACCENT} />
            {/* Ribs */}
            <line x1="22" y1="18" x2="29" y2="38" stroke={STROKE} />
            <line x1="32" y1="18" x2="32" y2="38" stroke={STROKE} />
            <line x1="42" y1="18" x2="35" y2="38" stroke={STROKE} />
          </g>
        );
      case "scale":
        return (
          <g fill="none" strokeWidth="1.25" strokeLinecap="square">
            {/* Scale base */}
            <rect x="14" y="36" width="36" height="14" stroke={STROKE} />
            {/* Platter */}
            <rect x="18" y="20" width="28" height="3" stroke={STROKE} />
            {/* Cup outline */}
            <path
              d="M 26 18 Q 26 14 32 14 Q 38 14 38 18"
              stroke={STROKE}
            />
            {/* Display */}
            <line x1="22" y1="43" x2="42" y2="43" stroke={ACCENT} />
            <line x1="22" y1="46" x2="34" y2="46" stroke={STROKE} />
          </g>
        );
      case "beans":
        return (
          <g fill="none" strokeWidth="1.25" strokeLinecap="square">
            {/* Bean cluster — three offset ovals */}
            <ellipse
              cx="22"
              cy="38"
              rx="6"
              ry="9"
              transform="rotate(-20 22 38)"
              stroke={STROKE}
            />
            <ellipse
              cx="32"
              cy="32"
              rx="6"
              ry="9"
              transform="rotate(10 32 32)"
              stroke={STROKE}
            />
            <ellipse
              cx="42"
              cy="40"
              rx="6"
              ry="9"
              transform="rotate(30 42 40)"
              stroke={ACCENT}
            />
            {/* Center seams */}
            <path
              d="M 22 31 Q 22 38 22 45"
              stroke={STROKE}
              transform="rotate(-20 22 38)"
            />
            <path
              d="M 32 25 Q 32 32 32 39"
              stroke={STROKE}
              transform="rotate(10 32 32)"
            />
          </g>
        );
      default:
        return (
          <g fill="none" strokeWidth="1.25">
            <rect x="20" y="20" width="24" height="24" stroke={STROKE} />
          </g>
        );
    }
  })();

  return (
    <svg
      viewBox="0 0 64 64"
      width={w}
      height={h}
      aria-hidden
      className={className}
    >
      {glyph}
    </svg>
  );
}
