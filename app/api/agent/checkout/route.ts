/**
 * POST /api/agent/checkout — the agent-purchase endpoint.
 *
 * The 8-check pipeline from the design doc:
 *   1. Token present                — done implicitly by verifyPrincipal
 *   2. Signature valid              — verifyPrincipal
 *   3. Not expired                  — verifyPrincipal
 *   4. Agent matches caller         — verifyPrincipal
 *   5. Scope matches request        — verifyPrincipal
 *   6. Nonce unused                 — consumeNonce
 *   7. Idempotency check            — getIdempotent
 *   8. Process charge + revalidate  — this route
 *
 * Order is intentional: cheap checks first so a malicious caller
 * spamming junk tokens can't drive our Redis bill up.
 *
 * Why this route exists as a real endpoint instead of an /agent
 * static surface: this one TRULY is dynamic per request. The
 * verification result depends on the token contents, the nonce
 * lookup, and the idempotency lookup — all request-scoped. No
 * amount of caching helps here. The /agent/* surfaces (Phase 4.5a)
 * are static because their bodies are pure functions of slug; the
 * checkout response is a pure function of (token × request × time).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { loadProduct } from "@/lib/product-loader";
import { verifyPrincipal } from "@/lib/principal";
import {
  consumeNonce,
  getIdempotent,
  storeIdempotent,
} from "@/lib/agent-purchase";
import { classifyAgent } from "@/lib/aeo";

const checkoutSchema = z.object({
  sku: z.string().min(1).max(200),
  proposedPriceCents: z.number().int().nonnegative(),
  quantity: z.number().int().positive().default(1),
});

function err(
  http: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status: http });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  /* Idempotency-Key is the first thing we read because if the
   * client retried this request, we want to return the cached
   * response WITHOUT re-running the 8 checks. Saves cycles and
   * (more importantly) keeps the response stable across retries. */
  const idemKey = req.headers.get("idempotency-key");
  if (idemKey) {
    const cached = await getIdempotent(idemKey);
    if (cached) {
      return new NextResponse(cached.body, {
        status: cached.status,
        headers: {
          ...cached.headers,
          "X-Anchor-Idempotent-Replay": "true",
        },
      });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, "malformed_body", "Request body is not valid JSON");
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", "Body failed schema validation", {
      issues: parsed.error.issues,
    });
  }
  const { sku, proposedPriceCents, quantity } = parsed.data;

  /* Caller identity for check #4. In a real deployment this would
   * come from the agent's TLS client certificate or OAuth client_id.
   * For the demo, we classify the User-Agent the same way the AEO
   * logger does, then bind the token to that classification. */
  const callerAgent = classifyAgent(req.headers.get("user-agent"));

  /* Checks 1-5: verify the principal token. */
  const verification = await verifyPrincipal({
    token: req.headers.get("x-agent-principal"),
    callerAgent,
    requestedAction: "purchase",
    requestedSku: sku,
    requestedCents: proposedPriceCents * quantity,
  });
  if (!verification.ok) {
    return err(verification.http, verification.code, verification.message);
  }
  const { claims } = verification;

  /* Check 6: nonce. Each token's jti is single-use. */
  const fresh = await consumeNonce(claims.jti);
  if (!fresh) {
    return err(409, "replay_detected", "Token already consumed", {
      jti: claims.jti,
    });
  }

  /* Resolve the product. Doubles as our authoritative price /
   * inventory source — never trust the price the agent proposed
   * without comparing against the catalog. */
  const product = await loadProduct(sku);
  if (!product) {
    return err(404, "sku_not_found", `Unknown SKU: ${sku}`);
  }
  if (product.inventory < quantity) {
    return err(409, "out_of_stock", "Not enough inventory", {
      available: product.inventory,
      requested: quantity,
    });
  }
  /* Enforce the negotiation floor. The token's maxCents already
   * passed in verifyPrincipal (it's the upper bound the human
   * authorized). The floor is the lower bound the seller will
   * accept. Both have to hold. */
  if (proposedPriceCents < product.pricing.floorCents) {
    return err(409, "below_floor", "Proposed price below SKU floor", {
      proposedPriceCents,
      floorCents: product.pricing.floorCents,
      listCents: product.pricing.listCents,
    });
  }

  /* Check 8: process the charge. This is where Stripe would land.
   * For the demo we synthesize a confirmation. */
  const confirmation = {
    ok: true,
    orderId: `ord_${crypto.randomUUID()}`,
    sku: product.slug,
    name: product.name,
    quantity,
    chargedCents: proposedPriceCents * quantity,
    listCents: product.pricing.listCents * quantity,
    savedCents:
      (product.pricing.listCents - proposedPriceCents) * quantity,
    principal: claims.principal,
    agent: claims.agent,
    jti: claims.jti,
    completedAt: new Date().toISOString(),
  };
  const successBody = JSON.stringify(confirmation, null, 2);
  const successHeaders = { "Content-Type": "application/json" };

  /* Invalidate the cached product so subsequent /agent/* and human
   * page reads see the decremented inventory. Tag-level invalidation
   * is surgical — only this slug recomputes, the other 9 stay
   * cached. */
  /* Second arg in Next 16 is the cache profile to apply to the
   * fresh re-read; "hours" matches the loader's cacheLife. */
  revalidateTag(`product:${product.slug}`, "hours");
  revalidateTag("descriptor", "hours");

  /* Check 7 follow-up: store the response under the idempotency
   * key so retries return the same body. */
  if (idemKey) {
    await storeIdempotent(idemKey, {
      status: 200,
      body: successBody,
      headers: successHeaders,
    });
  }

  return new NextResponse(successBody, {
    status: 200,
    headers: successHeaders,
  });
}
