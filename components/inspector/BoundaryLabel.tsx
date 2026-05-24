/**
 * BoundaryLabel — wraps a subtree with a colored outline + corner
 * label that announces its render mode.
 *
 * Two implementations:
 *   - <Inspect mode="..."> for server components (server-rendered
 *     wrapper that emits a CSS class + data-attribute consumed by
 *     the client-side inspector toggle)
 *   - <InspectClient mode="..."> for client components (same
 *     output, just on the client side)
 *
 * The visual treatment uses `outline` + `outline-offset` so the
 * wrapper does not affect the box model — toggling the inspector
 * never causes a layout shift. The outline only shows when
 * `data-inspector-active="true"` is set on <html>, which the
 * RenderInspector client component flips when its toggle is on.
 */
import type { ReactNode } from "react";
import { INSPECT_MODES, type InspectMode } from "@/lib/inspector-modes";

/* Real DOM labels (not CSS ::before) because pseudo-elements have
 * proven unreliable across the Tailwind v4 + Turbopack pipeline.
 * The labels are absolutely positioned, gated behind the
 * data-inspector-active attribute on <html> via CSS so they remain
 * invisible when the inspector is off. */
export function Inspect({
  mode,
  note,
  children,
}: {
  mode: InspectMode;
  /** Optional inline note — e.g. "loadProduct, cacheTag product:<slug>" */
  note?: string;
  children: ReactNode;
}) {
  const meta = INSPECT_MODES[mode];
  return (
    <div className="inspect-region" data-inspect={mode}>
      <span
        className="inspect-label"
        style={{
          background: meta.color,
          color: "#0a0a0b",
        }}
      >
        {meta.label}
      </span>
      {note ? (
        <span className="inspect-label-note">{note}</span>
      ) : null}
      <div className="inspect-children">{children}</div>
    </div>
  );
}
