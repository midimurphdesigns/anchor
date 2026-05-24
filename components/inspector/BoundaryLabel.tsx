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
import type { InspectMode } from "@/lib/inspector-modes";

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
  return (
    <div
      data-inspect={mode}
      data-inspect-note={note ?? ""}
      className="inspect-region"
    >
      {children}
    </div>
  );
}
