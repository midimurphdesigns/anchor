/**
 * Server Action — runs the comparison agent against two slugs.
 *
 * Returns the FULL Comparison object (no streaming UI on the
 * client side yet — we use streamObject server-side and await
 * the final object before returning). A future iteration could
 * use createStreamableValue() / useStreamableValue() to surface
 * the partial stream to the client; for v0.1 the model is fast
 * enough that the blocking shape is fine and the code is
 * simpler.
 *
 * Why a Server Action and not a route handler: Server Actions
 * are the first-class way for a client component to invoke
 * server code in Next 16. Type-safe at the call boundary (the
 * client imports the action function directly and gets the
 * return type), no JSON serialization to design, no route shape
 * to maintain. The only reason to reach for a route handler
 * over a Server Action is if you need streaming chunks or a
 * non-React client (curl, an external service).
 */
"use server";

import { getProduct } from "@/lib/catalog";
import { streamComparison, type Comparison } from "@/lib/compare-agent";

export type CompareResult =
  | { ok: true; comparison: Comparison }
  | { ok: false; error: string };

export async function compareProducts(
  slugA: string,
  slugB: string,
): Promise<CompareResult> {
  if (slugA === slugB) {
    return { ok: false, error: "Pick two different products." };
  }

  const a = getProduct(slugA);
  const b = getProduct(slugB);
  if (!a || !b) {
    return { ok: false, error: "One or both products not found." };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error:
        "Comparison agent unavailable: ANTHROPIC_API_KEY not configured on the server.",
    };
  }

  try {
    const result = streamComparison({ a, b });
    const comparison = await result.object;
    return { ok: true, comparison };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Agent error: ${message}` };
  }
}
