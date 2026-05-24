/**
 * Agent principal token — issue and verify.
 *
 * Wire format: base64url(JSON.stringify(claims)) + "." +
 *              base64url(hmac-sha256(secret, payload))
 *
 * Two parts joined by a single dot — the same shape as a JWT but
 * deliberately not a JWT. JWTs carry an algorithm header, which
 * has historically been the source of dozens of CVEs (alg:none,
 * key confusion attacks). We don't need pluggable algorithms; we
 * pick one, hard-code it, and skip the entire JOSE attack surface.
 *
 * Crypto choice: HMAC-SHA256 with a server-side secret.
 *
 * In a real delegated-authority deployment the token would be
 * signed asymmetrically (ed25519) by the user's wallet, and anchor
 * would verify with the user's public key — the user's private key
 * never leaves their device. We use HMAC here because:
 *   1. It's simpler to demo (one secret, no key distribution)
 *   2. The eight-check verification logic is identical either way
 *   3. The repo can still issue test tokens without standing up an
 *      identity provider
 *
 * Anything that would change in the asymmetric version is called
 * out in code comments below.
 */
import type { BotKind } from "./aeo";

const SECRET = process.env.ANCHOR_ADMIN_KEY ?? "";
const ENCODER = new TextEncoder();

export type PrincipalScope = {
  /** "purchase" today; could grow to "subscribe", "cancel", etc. */
  action: "purchase";
  /** Maximum cents the agent may spend on this token. */
  maxCents: number;
  /** SKU the token authorizes, or "*" for any SKU in the catalog. */
  sku: string;
};

export type PrincipalClaims = {
  /** Who delegated (the human user). */
  principal: string;
  /** Which agent is allowed to use this token. */
  agent: BotKind | string;
  /** What the agent may do. */
  scope: PrincipalScope;
  /** Issued-at — unix seconds. */
  iat: number;
  /** Expires-at — unix seconds. */
  exp: number;
  /** Unique token ID (nonce) for replay protection. */
  jti: string;
};

export type VerifyOk = { ok: true; claims: PrincipalClaims };
export type VerifyFail = {
  ok: false;
  /** Stable code so the route handler can map to the right HTTP
   *  status. The interview answer for "what specifically failed"
   *  is this string. */
  code:
    | "missing_token"
    | "malformed_token"
    | "bad_signature"
    | "expired"
    | "agent_mismatch"
    | "scope_violation"
    | "replay_detected"
    | "config_missing";
  message: string;
  http: number;
};

function b64urlEncode(bytes: Uint8Array | string): string {
  const buf =
    typeof bytes === "string" ? ENCODER.encode(bytes) : bytes;
  let s = "";
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]!);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function b64urlDecode(s: string): Uint8Array {
  const padded = s
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  if (!SECRET) throw new Error("ANCHOR_ADMIN_KEY not set");
  return crypto.subtle.importKey(
    "raw",
    ENCODER.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Constant-time string compare. Critical for HMAC verification —
 *  using === would leak signature contents byte-by-byte via timing. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/** Issue a new signed token. Called by the dev-only
 *  /api/agent/issue-token endpoint to mint test tokens. In
 *  production this code would not exist on the seller side; the
 *  user's wallet/IDP would sign tokens with the user's private key. */
export async function issuePrincipal(args: {
  principal: string;
  agent: BotKind | string;
  scope: PrincipalScope;
  ttlSeconds?: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: PrincipalClaims = {
    principal: args.principal,
    agent: args.agent,
    scope: args.scope,
    iat: now,
    exp: now + (args.ttlSeconds ?? 3600),
    jti: crypto.randomUUID(),
  };
  const payload = b64urlEncode(JSON.stringify(claims));
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    ENCODER.encode(payload),
  );
  return `${payload}.${b64urlEncode(new Uint8Array(sig))}`;
}

/** Verify a token and return its claims. Walks the first 5 of the
 *  8 checks from the design doc:
 *    1. Token present (route handler does this before calling us)
 *    2. Signature valid           ← here
 *    3. Not expired               ← here
 *    4. Agent matches caller      ← here (caller passes claimedAgent)
 *    5. Scope matches request     ← here (caller passes requested action/sku/cents)
 *    6. Nonce unused              → route does Redis lookup
 *    7. Idempotency               → route does Redis lookup
 *    8. Process charge            → route's job
 *
 * Order matters: cheapest checks first so an attacker spamming
 * junk tokens can't DoS our Redis. */
export async function verifyPrincipal(args: {
  token: string | null;
  callerAgent: BotKind | string;
  requestedAction: "purchase";
  requestedSku: string;
  requestedCents: number;
}): Promise<VerifyOk | VerifyFail> {
  if (!SECRET) {
    return {
      ok: false,
      code: "config_missing",
      message: "ANCHOR_ADMIN_KEY not configured on the server",
      http: 500,
    };
  }
  if (!args.token) {
    return {
      ok: false,
      code: "missing_token",
      message: "X-Agent-Principal header missing",
      http: 401,
    };
  }

  const dotAt = args.token.indexOf(".");
  if (dotAt <= 0 || dotAt === args.token.length - 1) {
    return {
      ok: false,
      code: "malformed_token",
      message: "Token must be payload.signature",
      http: 401,
    };
  }
  const payloadPart = args.token.slice(0, dotAt);
  const sigPart = args.token.slice(dotAt + 1);

  // Check 2 — signature valid (cheapest cryptographic check)
  let sigBytes: Uint8Array;
  try {
    sigBytes = b64urlDecode(sigPart);
  } catch {
    return {
      ok: false,
      code: "malformed_token",
      message: "Signature is not valid base64url",
      http: 401,
    };
  }
  const expected = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      await hmacKey(),
      ENCODER.encode(payloadPart),
    ),
  );
  if (!timingSafeEqual(sigBytes, expected)) {
    return {
      ok: false,
      code: "bad_signature",
      message: "Signature does not verify against ANCHOR_ADMIN_KEY",
      http: 401,
    };
  }

  // Parse claims after the signature is verified — never trust
  // unverified bytes.
  let claims: PrincipalClaims;
  try {
    claims = JSON.parse(
      new TextDecoder().decode(b64urlDecode(payloadPart)),
    ) as PrincipalClaims;
  } catch {
    return {
      ok: false,
      code: "malformed_token",
      message: "Payload is not valid JSON",
      http: 401,
    };
  }

  // Check 3 — not expired
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== "number" || claims.exp < nowSec) {
    return {
      ok: false,
      code: "expired",
      message: `Token expired at ${claims.exp} (now ${nowSec})`,
      http: 401,
    };
  }

  // Check 4 — agent matches the caller's claimed identity
  // (In the HMAC demo, "callerAgent" is whatever the route's
  // proxy classification said. In a real deployment this would
  // be a TLS client cert subject or an OAuth client_id.)
  if (claims.agent !== args.callerAgent && claims.agent !== "*") {
    return {
      ok: false,
      code: "agent_mismatch",
      message: `Token issued for ${claims.agent}, request came from ${args.callerAgent}`,
      http: 403,
    };
  }

  // Check 5 — scope matches the request
  if (claims.scope.action !== args.requestedAction) {
    return {
      ok: false,
      code: "scope_violation",
      message: `Token allows ${claims.scope.action}, request is ${args.requestedAction}`,
      http: 403,
    };
  }
  if (claims.scope.sku !== "*" && claims.scope.sku !== args.requestedSku) {
    return {
      ok: false,
      code: "scope_violation",
      message: `Token allows SKU ${claims.scope.sku}, request is for ${args.requestedSku}`,
      http: 403,
    };
  }
  if (args.requestedCents > claims.scope.maxCents) {
    return {
      ok: false,
      code: "scope_violation",
      message: `Request ${args.requestedCents} exceeds token max ${claims.scope.maxCents}`,
      http: 403,
    };
  }

  return { ok: true, claims };
}
