/**
 * POST /api/agent/issue-token — admin-only token minter.
 *
 * In production this endpoint would NOT exist on the seller side.
 * Tokens would be issued by the user's wallet / identity provider,
 * signed asymmetrically with the user's private key, and presented
 * to anchor pre-formed.
 *
 * For the demo it's convenient to be able to mint tokens against
 * the same secret anchor uses to verify them. Gated by the
 * ANCHOR_ADMIN_KEY shared secret to keep it owner-only.
 *
 * Use:
 *   curl -X POST http://localhost:3005/api/agent/issue-token \
 *     -H "X-Anchor-Admin: <secret>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"principal":"user_kevin","agent":"Perplexity-User",
 *          "scope":{"action":"purchase","maxCents":90000,
 *                   "sku":"moonshot-grinder-x1"},
 *          "ttlSeconds":600}'
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { issuePrincipal } from "@/lib/principal";

const issueSchema = z.object({
  principal: z.string().min(1).max(200),
  agent: z.string().min(1).max(200),
  scope: z.object({
    action: z.literal("purchase"),
    maxCents: z.number().int().nonnegative(),
    sku: z.string().min(1).max(200),
  }),
  ttlSeconds: z.number().int().positive().max(86400).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const adminKey = process.env.ANCHOR_ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json(
      { ok: false, code: "config_missing", message: "ANCHOR_ADMIN_KEY not set" },
      { status: 500 },
    );
  }
  if (req.headers.get("x-anchor-admin") !== adminKey) {
    /* Default-deny: 404 instead of 403 so non-admins can't enumerate
     * the endpoint's existence. */
    return new NextResponse("Not Found", { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "malformed_body" },
      { status: 400 },
    );
  }
  const parsed = issueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_body",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const token = await issuePrincipal(parsed.data);
  return NextResponse.json({ ok: true, token });
}
