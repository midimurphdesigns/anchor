/**
 * Public scenario runner for the /playground demo.
 *
 * Why this exists: the playground UI needs to demonstrate the eight-
 * check pipeline by firing real /api/agent/checkout calls — but
 * minting the agent token requires the ANCHOR_ADMIN_KEY which must
 * never reach the browser. This endpoint runs server-side, signs
 * the demo token internally, executes each scenario step, and
 * returns the full request/response chain for the client to render.
 *
 * Rate-limit shape (Phase 6+ hardening): per-IP rate limit so the
 * playground can't be abused as a free agent-checkout proxy.
 * Currently relies on the upstream /api/agent/checkout's own
 * rate-limiting; revisit if abuse surfaces.
 *
 * The scenarios are demonstrably-safe: every scenario's token
 * scope locks to a single SKU and a small budget, and the
 * "purchases" are against a fictional catalog of products that
 * have no real fulfillment. Nothing crosses a payment processor.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { issuePrincipal } from "@/lib/principal";
import { getScenario } from "@/lib/playground-scenarios";

const requestSchema = z.object({
  scenarioId: z.string().min(1).max(60),
});

type StepResult = {
  caption: string;
  request: {
    body: unknown;
    idempotencyKey?: string;
    agent: string;
  };
  response: {
    status: number;
    body: unknown;
    idempotentReplay: boolean;
    botClass: string | null;
  };
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!process.env.ANCHOR_ADMIN_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Playground unavailable: ANCHOR_ADMIN_KEY not configured on the server.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Malformed JSON body" },
      { status: 400 },
    );
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "scenarioId required" },
      { status: 400 },
    );
  }

  const scenario = getScenario(parsed.data.scenarioId);
  if (!scenario) {
    return NextResponse.json(
      { ok: false, error: `Unknown scenario: ${parsed.data.scenarioId}` },
      { status: 404 },
    );
  }

  /* Mint the token internally — admin key never leaves the server. */
  const token = await issuePrincipal({
    principal: scenario.token.principal,
    agent: scenario.token.agent,
    scope: scenario.token.scope,
    ttlSeconds: scenario.token.ttlSeconds,
  });

  /* The checkout endpoint lives on the same origin. Derive the base
   * URL from the request so the playground works on localhost and
   * in production without hard-coding. */
  const origin = new URL(req.url).origin;

  const steps: StepResult[] = [];
  for (const step of scenario.steps) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": `${scenario.token.agent}/1.0 (anchor-playground)`,
      "X-Agent-Principal": token,
    };
    if (step.idempotencyKey) {
      headers["Idempotency-Key"] = step.idempotencyKey;
    }
    const res = await fetch(`${origin}/api/agent/checkout`, {
      method: "POST",
      headers,
      body: JSON.stringify(step.body),
    });
    let resBody: unknown;
    try {
      resBody = await res.json();
    } catch {
      resBody = await res.text();
    }
    steps.push({
      caption: step.caption,
      request: {
        body: step.body,
        idempotencyKey: step.idempotencyKey,
        agent: scenario.token.agent,
      },
      response: {
        status: res.status,
        body: resBody,
        idempotentReplay:
          res.headers.get("x-anchor-idempotent-replay") === "true",
        botClass: res.headers.get("x-anchor-bot-class"),
      },
    });
  }

  return NextResponse.json({
    ok: true,
    scenario: {
      id: scenario.id,
      title: scenario.title,
      explanation: scenario.explanation,
      expected: scenario.expected,
      tokenScope: scenario.token.scope,
      tokenPrincipal: scenario.token.principal,
      tokenAgent: scenario.token.agent,
    },
    steps,
  });
}
