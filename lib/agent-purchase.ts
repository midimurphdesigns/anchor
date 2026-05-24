/**
 * Redis-backed nonce store + idempotency cache for the agent
 * checkout endpoint.
 *
 * Two completely separate stores serving two completely separate
 * threat models:
 *
 *   nonce store     — defense against replay attacks. Each token's
 *                     jti is single-use. Setting & checking the jti
 *                     is the difference between "attacker captured
 *                     a valid token and re-fires it" working or not.
 *
 *   idempotency     — defense against legitimate network retries.
 *                     The agent sends Idempotency-Key on every
 *                     attempt. First success is cached; subsequent
 *                     retries return the cached response with no
 *                     additional side effects.
 *
 * Both backed by Upstash via the fail-open lib/redis.ts client.
 * When the client is the stub (no env vars), nonce check always
 * passes (no replay protection in local dev) and idempotency
 * always misses (every retry processes again). Documented as a
 * dev-only behavior — production requires Upstash configured.
 */
import { redis } from "./redis";

const NONCE_TTL_SEC = 24 * 60 * 60;
const IDEM_TTL_SEC = 24 * 60 * 60;

/** Atomically check + mark the nonce as consumed. Returns true if
 *  the nonce was fresh (request may proceed); false if it was
 *  already seen (replay — reject the request).
 *
 *  In Redis terms: SETNX semantics. We use sorted-set zadd as a
 *  proxy because the Upstash client we have wraps zadd; a real
 *  production version would use SET key value NX EX <ttl> for a
 *  cleaner atomic check. */
export async function consumeNonce(jti: string): Promise<boolean> {
  const key = `agent:nonce:${jti}`;
  const result = await redis.zadd(key, {
    score: Date.now(),
    member: "consumed",
  });
  await redis.expire(key, NONCE_TTL_SEC);
  /* zadd returns 1 if the member was newly added, 0 if it already
   * existed. Stub returns null — treat null as "no Redis, allow"
   * (dev-only behavior; documented in module header). */
  if (result === null) return true;
  return result === 1;
}

type IdemRecord = {
  status: number;
  body: string;
  headers: Record<string, string>;
};

/** Look up a stored response for an idempotency key, if any. */
export async function getIdempotent(
  key: string,
): Promise<IdemRecord | null> {
  const raw = await redis.zrange(`agent:idem:${key}`, 0, 0, { rev: true });
  if (raw.length === 0) return null;
  try {
    return JSON.parse(raw[0]!) as IdemRecord;
  } catch {
    return null;
  }
}

/** Store the response for an idempotency key so retries return
 *  the same body without re-processing. */
export async function storeIdempotent(
  key: string,
  record: IdemRecord,
): Promise<void> {
  const k = `agent:idem:${key}`;
  await redis.zadd(k, {
    score: Date.now(),
    member: JSON.stringify(record),
  });
  await redis.expire(k, IDEM_TTL_SEC);
}
