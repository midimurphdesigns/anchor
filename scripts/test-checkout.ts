/**
 * End-to-end test of the agent-checkout pipeline.
 *
 * Runs five scenarios against a local server and prints
 * pass/fail for each:
 *
 *   1. Happy path: valid token → 200 OK + order confirmation
 *   2. Replay: same token re-used → 409 replay_detected
 *   3. Over-budget: price > token maxCents → 403 scope_violation
 *   4. Wrong SKU: token bound to A, request for B → 403 scope_violation
 *   5. Idempotency: same idem-key retried → 200 + replay header
 *
 * Requires:
 *   - server running on :3005 (pnpm dev or pnpm start)
 *   - ANCHOR_ADMIN_KEY set in the server's env
 *   - That same key exported as ANCHOR_ADMIN_KEY in this script's env
 *
 * Usage:
 *   ANCHOR_ADMIN_KEY=<secret> pnpm tsx scripts/test-checkout.ts
 */
const BASE = process.env.ANCHOR_BASE ?? "http://localhost:3005";
const ADMIN = process.env.ANCHOR_ADMIN_KEY ?? "";
const AGENT_UA = "Perplexity-User/1.0 (test)";

if (!ADMIN) {
  console.error("ANCHOR_ADMIN_KEY must be set in env");
  process.exit(1);
}

type IssueArgs = {
  principal: string;
  agent: string;
  scope: { action: "purchase"; maxCents: number; sku: string };
  ttlSeconds?: number;
};

async function issueToken(args: IssueArgs): Promise<string> {
  const r = await fetch(`${BASE}/api/agent/issue-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Anchor-Admin": ADMIN,
    },
    body: JSON.stringify(args),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`issue-token failed (${r.status}): ${t}`);
  }
  const j = (await r.json()) as { token: string };
  return j.token;
}

type CheckoutBody = {
  sku: string;
  proposedPriceCents: number;
  quantity?: number;
};

async function checkout(args: {
  token: string;
  body: CheckoutBody;
  idemKey?: string;
}): Promise<{ status: number; body: unknown; idempotentReplay: boolean }> {
  const r = await fetch(`${BASE}/api/agent/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": AGENT_UA,
      "X-Agent-Principal": args.token,
      ...(args.idemKey ? { "Idempotency-Key": args.idemKey } : {}),
    },
    body: JSON.stringify(args.body),
  });
  let body: unknown;
  try {
    body = await r.json();
  } catch {
    body = await r.text();
  }
  return {
    status: r.status,
    body,
    idempotentReplay: r.headers.get("x-anchor-idempotent-replay") === "true",
  };
}

function assert(name: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    console.log(`  FAIL  ${name}`);
    if (detail !== undefined) console.log("        →", detail);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  console.log("\n== Scenario 1: happy path =====================================");
  const token1 = await issueToken({
    principal: "user_kevin",
    agent: "Perplexity-User",
    scope: { action: "purchase", maxCents: 90000, sku: "moonshot-grinder-x1" },
    ttlSeconds: 600,
  });
  const r1 = await checkout({
    token: token1,
    body: { sku: "moonshot-grinder-x1", proposedPriceCents: 85000 },
  });
  assert("status 200", r1.status === 200, r1);
  assert(
    "order confirmation includes orderId",
    typeof (r1.body as { orderId?: string }).orderId === "string",
    r1.body,
  );

  console.log("\n== Scenario 2: replay attack ==================================");
  const r2 = await checkout({
    token: token1,
    body: { sku: "moonshot-grinder-x1", proposedPriceCents: 85000 },
  });
  assert("status 409 on replay", r2.status === 409, r2);
  assert(
    "code is replay_detected",
    (r2.body as { code?: string }).code === "replay_detected",
    r2.body,
  );

  console.log("\n== Scenario 3: over-budget request ============================");
  const token3 = await issueToken({
    principal: "user_kevin",
    agent: "Perplexity-User",
    scope: { action: "purchase", maxCents: 50000, sku: "moonshot-grinder-x1" },
    ttlSeconds: 600,
  });
  const r3 = await checkout({
    token: token3,
    body: { sku: "moonshot-grinder-x1", proposedPriceCents: 80000 },
  });
  assert("status 403 on over-budget", r3.status === 403, r3);
  assert(
    "code is scope_violation",
    (r3.body as { code?: string }).code === "scope_violation",
    r3.body,
  );

  console.log("\n== Scenario 4: wrong SKU ======================================");
  const token4 = await issueToken({
    principal: "user_kevin",
    agent: "Perplexity-User",
    scope: { action: "purchase", maxCents: 90000, sku: "moonshot-grinder-x1" },
    ttlSeconds: 600,
  });
  const r4 = await checkout({
    token: token4,
    body: { sku: "delta-espresso-machine", proposedPriceCents: 220000 },
  });
  assert("status 403 on SKU mismatch", r4.status === 403, r4);
  assert(
    "code is scope_violation",
    (r4.body as { code?: string }).code === "scope_violation",
    r4.body,
  );

  console.log("\n== Scenario 5: idempotency replay =============================");
  const token5 = await issueToken({
    principal: "user_kevin",
    agent: "Perplexity-User",
    scope: { action: "purchase", maxCents: 90000, sku: "kestrel-pour-kettle" },
    ttlSeconds: 600,
  });
  const idem = crypto.randomUUID();
  const r5a = await checkout({
    token: token5,
    body: { sku: "kestrel-pour-kettle", proposedPriceCents: 18000 },
    idemKey: idem,
  });
  assert("first attempt 200", r5a.status === 200, r5a);
  const r5b = await checkout({
    token: token5,
    body: { sku: "kestrel-pour-kettle", proposedPriceCents: 18000 },
    idemKey: idem,
  });
  assert("retry status 200", r5b.status === 200, r5b);
  assert(
    "retry flagged as idempotent replay",
    r5b.idempotentReplay,
    r5b,
  );
  assert(
    "retry body matches original",
    JSON.stringify((r5b.body as { orderId?: string }).orderId) ===
      JSON.stringify((r5a.body as { orderId?: string }).orderId),
    { first: r5a.body, retry: r5b.body },
  );

  console.log("\n");
  if (process.exitCode) {
    console.log("Some scenarios failed.");
  } else {
    console.log("All scenarios passed.");
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
