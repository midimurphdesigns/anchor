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

const stub: RedisClient = {
  async zadd() {
    return null;
  },
  async zcount() {
    return 0;
  },
  async zrange() {
    return [];
  },
  async expire() {
    return 0;
  },
};

function build(): RedisClient {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return stub;
  const client = new Redis({ url, token });
  return client as unknown as RedisClient;
}

export const redis: RedisClient = build();
