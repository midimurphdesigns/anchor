/**
 * Upstash Redis client.
 *
 * Fail-open shape: if env vars are missing (local dev without
 * Upstash, or a misconfigured deploy), the exported client is a
 * no-op stub. Every method resolves successfully but does nothing.
 * The agent endpoint never errors because telemetry isn't wired.
 * Telemetry is best-effort; the product surface is not.
 *
 * In production both vars are required; the dashboard will show
 * empty counts if they're missing, which surfaces the misconfig
 * faster than a 500.
 */
import { Redis } from "@upstash/redis";

type RedisClient = {
  zadd: (
    key: string,
    args: { score: number; member: string },
  ) => Promise<number | null>;
  zcount: (key: string, min: number, max: number) => Promise<number>;
  zrange: (
    key: string,
    start: number,
    stop: number,
    opts?: { rev?: boolean; withScores?: boolean },
  ) => Promise<string[]>;
  expire: (key: string, ttlSec: number) => Promise<number>;
};

/* Local in-memory fallback. Activates when UPSTASH_* env vars are
 * missing — keeps the AEO logger, nonce store, and idempotency
 * cache all functional during dev/test without standing up Upstash.
 * The data is per-process, so a server restart wipes it; that's
 * the right tradeoff for local-only use. Production Vercel
 * deployments must set the env vars to get cross-instance state. */
function makeMemoryClient(): RedisClient {
  const sets = new Map<string, Map<string, number>>();
  return {
    async zadd(key, args) {
      let set = sets.get(key);
      if (!set) {
        set = new Map();
        sets.set(key, set);
      }
      if (set.has(args.member)) return 0;
      set.set(args.member, args.score);
      return 1;
    },
    async zcount(key, min, max) {
      const set = sets.get(key);
      if (!set) return 0;
      let n = 0;
      for (const score of set.values()) {
        if (score >= min && score <= max) n++;
      }
      return n;
    },
    async zrange(key, start, stop, opts) {
      const set = sets.get(key);
      if (!set) return [];
      const entries = [...set.entries()].sort((a, b) =>
        opts?.rev ? b[1] - a[1] : a[1] - b[1],
      );
      return entries.slice(start, stop + 1).map(([m]) => m);
    },
    async expire() {
      /* No-op in memory mode — process restart wipes everything
       * anyway, so an explicit TTL adds no value. */
      return 1;
    },
  };
}

const stub: RedisClient = makeMemoryClient();

function build(): RedisClient {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return stub;
  const client = new Redis({ url, token });
  return client as unknown as RedisClient;
}

export const redis: RedisClient = build();
