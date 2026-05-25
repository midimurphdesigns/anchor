/**
 * Playground scenarios — the five canonical demonstrations of the
 * eight-check delegated-authority pipeline. Same five that
 * scripts/test-checkout.ts asserts in CI; surfaced here as
 * interactive demos a visitor can fire from the browser.
 *
 * Each scenario is a labeled sequence of (issue-token + checkout-call)
 * steps. The runner returns the full response chain for the client
 * to render — showing exactly which of the 8 checks fired, which
 * passed, and what the seller did.
 */

export type ScenarioId =
  | "happy-path"
  | "replay-attack"
  | "over-budget"
  | "wrong-sku"
  | "idempotent-retry";

export type ScenarioStep = {
  /** What this step demonstrates, in plain English. */
  caption: string;
  /** Body to POST to /api/agent/checkout. */
  body: {
    sku: string;
    proposedPriceCents: number;
    quantity?: number;
  };
  /** Optional Idempotency-Key. Same key across two steps simulates
   *  a network retry; distinct keys are independent requests. */
  idempotencyKey?: string;
};

export type ScenarioDef = {
  id: ScenarioId;
  title: string;
  /** One-line elevator pitch shown in the scenario picker. */
  shortDescription: string;
  /** Longer paragraph explaining what an FDE-grade design has to
   *  defend against and which of the 8 checks does the defending.
   *  Renders alongside the step output. */
  explanation: string;
  /** Token settings used when calling /api/agent/issue-token. The
   *  scenarios that demonstrate REJECTION (replay/over-budget/wrong-
   *  sku) intentionally request a token whose scope mismatches what
   *  the checkout step asks for. */
  token: {
    principal: string;
    agent: string;
    scope: { action: "purchase"; maxCents: number; sku: string };
    ttlSeconds: number;
  };
  /** Ordered steps. Most scenarios are 1 step; replay + idempotent-
   *  retry are 2 (fire, then fire again with same context). */
  steps: ScenarioStep[];
  /** What the rendered verdict should say in the happy case. */
  expected: {
    /** Step index → expected HTTP status. */
    statuses: number[];
    /** Free-text summary the renderer shows once results land. */
    summary: string;
  };
};

export const SCENARIOS: ReadonlyArray<ScenarioDef> = [
  {
    id: "happy-path",
    title: "Happy path",
    shortDescription:
      "Agent buys a Moonshot Grinder X1 with a valid token; all eight checks pass.",
    explanation:
      "A signed token authorizes the Perplexity-User agent to purchase moonshot-grinder-x1 for up to $900. The agent submits a checkout at $850 (negotiated below list, above the SKU floor). Signature verifies, expiry holds, agent identity binds, scope matches, nonce is fresh, no prior idempotency key, inventory available, charge processes. Returns an orderId and the negotiation savings.",
    token: {
      principal: "user_kevin",
      agent: "Perplexity-User",
      scope: { action: "purchase", maxCents: 90000, sku: "moonshot-grinder-x1" },
      ttlSeconds: 600,
    },
    steps: [
      {
        caption: "Agent submits checkout at $850 (negotiated below list).",
        body: { sku: "moonshot-grinder-x1", proposedPriceCents: 85000 },
      },
    ],
    expected: {
      statuses: [200],
      summary:
        "Order created. Charge processed; revalidateTag invalidated this one product entry so the next read sees decremented inventory. The other nine products stay cached.",
    },
  },
  {
    id: "replay-attack",
    title: "Replay attack",
    shortDescription:
      "An attacker captures a valid signed token and re-fires it. Check 6 (nonce) rejects the second attempt with 409.",
    explanation:
      "Same valid token from the happy path. The first checkout succeeds. The second attempt with the SAME token re-fires every HTTP byte identically. Without a nonce, signature would verify, expiry would hold, every other check would pass — and a second charge would fire. The token's jti (unique single-use ID) is consumed on the first call; the second call's ZADD returns 0 (not 1) and we reject with 409 replay_detected.",
    token: {
      principal: "user_kevin",
      agent: "Perplexity-User",
      scope: { action: "purchase", maxCents: 90000, sku: "moonshot-grinder-x1" },
      ttlSeconds: 600,
    },
    steps: [
      {
        caption: "First fire: legitimate purchase.",
        body: { sku: "moonshot-grinder-x1", proposedPriceCents: 85000 },
      },
      {
        caption:
          "Replay: same token captured + re-fired by an attacker. Should be rejected.",
        body: { sku: "moonshot-grinder-x1", proposedPriceCents: 85000 },
      },
    ],
    expected: {
      statuses: [200, 409],
      summary:
        "First charge processed. Second attempt rejected with 409 replay_detected. The nonce store made each token strictly single-use; capturing the token gave the attacker no leverage.",
    },
  },
  {
    id: "over-budget",
    title: "Over-budget request",
    shortDescription:
      "Token authorizes up to $500. Agent (or prompt-injection) tries to spend $800. Check 5 (scope) rejects with 403.",
    explanation:
      "The user delegated authority for up to $50,000 in cents on this product. The agent — manipulated by a malicious prompt injection in the product page — tries to charge $80,000. Signature verifies, expiry holds, agent identity binds, but the requested amount exceeds maxCents in the token's scope. Check 5 rejects with 403 scope_violation. Crucially, the rejection happens before any Redis lookup (cheap-first ordering), so the attacker can't drive up our infra bill by spamming.",
    token: {
      principal: "user_kevin",
      agent: "Perplexity-User",
      scope: { action: "purchase", maxCents: 50000, sku: "moonshot-grinder-x1" },
      ttlSeconds: 600,
    },
    steps: [
      {
        caption: "Agent tries to charge $800 against a $500 budget token.",
        body: { sku: "moonshot-grinder-x1", proposedPriceCents: 80000 },
      },
    ],
    expected: {
      statuses: [403],
      summary:
        "Rejected with 403 scope_violation. The token's maxCents ceiling was the deterministic gate. The LLM agent never gets to make a decision the human didn't authorize.",
    },
  },
  {
    id: "wrong-sku",
    title: "Wrong SKU",
    shortDescription:
      "Token bound to moonshot-grinder-x1. Agent tries to buy a delta-espresso-machine. Check 5 (scope) rejects with 403.",
    explanation:
      "The user delegated authority to buy a specific product. The agent tries to use the same token to buy a completely different product. Scope binds the token to one SKU; any mismatch fails check 5. This stops the failure mode where one valid token gets repurposed to drain a user's budget across unrelated products.",
    token: {
      principal: "user_kevin",
      agent: "Perplexity-User",
      scope: { action: "purchase", maxCents: 90000, sku: "moonshot-grinder-x1" },
      ttlSeconds: 600,
    },
    steps: [
      {
        caption:
          "Token says moonshot-grinder-x1; checkout asks for delta-espresso-machine.",
        body: { sku: "delta-espresso-machine", proposedPriceCents: 220000 },
      },
    ],
    expected: {
      statuses: [403],
      summary:
        "Rejected with 403 scope_violation. Per-SKU binding stops repurposed tokens cold.",
    },
  },
  {
    id: "idempotent-retry",
    title: "Idempotent retry",
    shortDescription:
      "Agent's first request succeeds but the network drops the response. The retry returns the cached response with no second charge.",
    explanation:
      "This is the LEGITIMATE-RETRY case, not an attack. The first request succeeds and the seller processes the charge. The network drops the response packet; the agent never sees the 200. The agent retries with the SAME Idempotency-Key header. The checkout endpoint looks up that key in Redis, finds the cached response from the first attempt, and returns it byte-for-byte without re-running the 8-check pipeline. No second charge. X-Anchor-Idempotent-Replay header flags the retry.",
    token: {
      principal: "user_kevin",
      agent: "Perplexity-User",
      scope: { action: "purchase", maxCents: 90000, sku: "kestrel-pour-kettle" },
      ttlSeconds: 600,
    },
    steps: [
      {
        caption: "First attempt with Idempotency-Key: abc-123.",
        body: { sku: "kestrel-pour-kettle", proposedPriceCents: 18000 },
        idempotencyKey: "playground-abc-123",
      },
      {
        caption:
          "Network dropped the response. Agent retries with the SAME Idempotency-Key.",
        body: { sku: "kestrel-pour-kettle", proposedPriceCents: 18000 },
        idempotencyKey: "playground-abc-123",
      },
    ],
    expected: {
      statuses: [200, 200],
      summary:
        "Both attempts returned 200 with the SAME orderId. The second response carries X-Anchor-Idempotent-Replay: true. The charge fired exactly once even though the agent fired the HTTP request twice.",
    },
  },
];

export function getScenario(id: string): ScenarioDef | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
