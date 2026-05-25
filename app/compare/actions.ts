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

import { headers } from "next/headers";
import { getProduct } from "@/lib/catalog";
import { streamComparison, type Comparison } from "@/lib/compare-agent";
import { checkLimits, chargeUsd, isOwner } from "@/lib/rate-limit";
import { haikuCostUsd } from "@/lib/pricing";

export type CompareResult =
  | { ok: true; comparison: Comparison }
  | { ok: false; error: string };

/* Server Actions don't have a Request argument; they only see the
 * inbound headers via the headers() helper. Build a synthetic
 * Request so the rate-limit helpers used by /api/ask can be reused
 * here without a parallel cookie/IP extraction path. */
async function reqFromHeaders(): Promise<Request> {
  const h = await headers();
  const init: Record<string, string> = {};
  const xff = h.get("x-forwarded-for");
  if (xff) init["x-forwarded-for"] = xff;
  const real = h.get("x-real-ip");
  if (real) init["x-real-ip"] = real;
  const cookie = h.get("cookie");
  if (cookie) init["cookie"] = cookie;
  return new Request("https://anchor.local/compare", { headers: init });
}

function getIpFromHeadersInit(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

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

  /* Per-IP + daily USD cap, same policy as /api/ask. Server Actions
   * cannot return 429, so the cap surfaces through the existing
   * { ok: false, error } envelope — the compare form already renders
   * error strings, so this is zero-UI-work. */
  const req = await reqFromHeaders();
  if (!(await isOwner(req))) {
    const limit = await checkLimits(getIpFromHeadersInit(req));
    if (!limit.ok) {
      return { ok: false, error: limit.message };
    }
  }

  try {
    const result = streamComparison({ a, b });
    const comparison = await result.object;
    /* Bill actual token spend after the final object resolves. The
     * Vercel AI SDK exposes usage as a promise on the result; await
     * it so we charge real cost, not zero. */
    const usage = await result.usage;
    await chargeUsd(haikuCostUsd(usage));
    return { ok: true, comparison };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Agent error: ${message}` };
  }
}
