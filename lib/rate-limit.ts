/**
 * Rate limiting + daily USD spend cap for anchor's LLM-spend endpoints.
 *
 * Anchor exposes two paths that bill against Anthropic:
 *   - POST /api/ask (streaming chat with 6-step tool use)
 *   - /compare server action (streamObject for the comparison agent)
 *
 * Both must check limits before invoking the model and report actual
 * spend after the stream closes. This module is the shared
 * implementation. Ported from blog-portfolio-v3 src/lib/kev-o-rate-limit.ts
 * with anchor-namespaced keys and tighter defaults.
 *
 * Three layers:
 *   1. Per-IP sliding window — ANCHOR_PER_IP_HOURLY req/hour (default 10).
 *   2. Daily global USD cap — ANCHOR_DAILY_USD_CAP (default $2/day, UTC).
 *   3. Owner bypass — ?admin=$ANCHOR_ADMIN_KEY drops a 30-day cookie.
 *
 * Fails OPEN when Upstash env vars are absent (local dev should not
 * require a Redis instance to test the rest of the app). Fails CLOSED
 * in any other error scenario.
 *
 * Cap accounting stores spend as integer CENTS in Redis. checkLimits
 * converts dailyCapUsd to cents before comparing. Mixing units would
 * silently fire the cap 100x too early (the unit-mismatch bug pattern
 * from blog-portfolio-v3's loom incident).
 */

import { timingSafeEqual } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/* Per-IP cap. 10/hour by default — generous enough for a visitor to
 * run a real conversation with the ask agent (open chat, ask 3-5
 * follow-ups, try a comparison) without hitting the wall, tight
 * enough that one IP cannot drain the daily USD cap by itself even
 * with maximal token spend per turn. Override via env without
 * redeploying. */
const PER_IP_HOURLY = Math.max(
  1,
  Number(process.env.ANCHOR_PER_IP_HOURLY ?? "10"),
);

const perIpLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(PER_IP_HOURLY, "1 h"),
      analytics: true,
      prefix: "anchor:ip",
    })
  : null;

/* Separate, much tighter limiter for admin-key probe attempts. Fires
 * BEFORE the key comparison inside isOwner() so a brute-forcer
 * exhausts their attempt budget regardless of whether each guess is
 * right or wrong. */
const adminProbeLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      analytics: true,
      prefix: "anchor:admin-probe",
    })
  : null;

export type LimitResult =
  | { ok: true }
  | {
      ok: false;
      reason: "per-ip" | "daily-usd-cap";
      retryAfterSeconds: number;
      message: string;
    };

function utcDayKey(now: Date = new Date()): string {
  return `anchor:usd:${now.toISOString().slice(0, 10)}`;
}

function secondsUntilUtcMidnight(now: Date = new Date()): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

function resolveDailyCapUsd(): number {
  const raw = Number(process.env.ANCHOR_DAILY_USD_CAP ?? "2");
  if (!Number.isFinite(raw) || raw <= 0) return 2;
  return raw;
}

/**
 * Pre-flight check before serving a request. Counts the request
 * against the per-IP window AND verifies the daily USD cap has not
 * been hit. Does NOT bill spend yet — that happens after the response
 * stream closes via chargeUsd().
 */
export async function checkLimits(ip: string): Promise<LimitResult> {
  if (!redis || !perIpLimiter) return { ok: true };

  const ipResult = await perIpLimiter.limit(ip);
  if (!ipResult.success) {
    const retry = Math.max(1, Math.ceil((ipResult.reset - Date.now()) / 1000));
    return {
      ok: false,
      reason: "per-ip",
      retryAfterSeconds: retry,
      message: `Too many requests from this address. Try again in ${formatRetry(retry)}.`,
    };
  }

  const dayKey = utcDayKey();
  const spentCents = Number((await redis.get(dayKey)) ?? 0);
  const dailyCapCents = Math.round(resolveDailyCapUsd() * 100);
  if (spentCents >= dailyCapCents) {
    const retry = secondsUntilUtcMidnight();
    return {
      ok: false,
      reason: "daily-usd-cap",
      retryAfterSeconds: retry,
      message: `Anchor has hit today's spend cap. Resets in ${formatRetry(retry)}.`,
    };
  }
  return { ok: true };
}

/**
 * Charge usage against the daily USD cap. Call AFTER the response
 * stream closes, with the actual cost computed from the model's
 * reported token counts (see pricing.ts).
 */
export async function chargeUsd(usd: number): Promise<void> {
  if (!redis || usd <= 0) return;
  const key = utcDayKey();
  const cents = Math.ceil(usd * 100);
  const after = await redis.incrby(key, cents);
  if (after === cents) {
    /* First spend of the day — set the TTL so the key doesn't
     * accumulate forever. The +60 cushion handles clock skew between
     * the app server and Redis. */
    await redis.expire(key, secondsUntilUtcMidnight() + 60);
  }
}

/**
 * Extract a client IP from a Next.js request. Vercel forwards the
 * real IP in x-forwarded-for; the first hop is the client. Falls
 * back to a fixed marker so the per-IP limiter still buckets
 * unidentified callers together (loose default-deny — one shared
 * pool, capped by the same per-IP window).
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/**
 * Owner-bypass check. The owner sets ANCHOR_ADMIN_KEY in env and
 * passes it as ?admin=<key> on any page visit; that drops a 30-day
 * cookie. Subsequent requests with the cookie skip all limits.
 *
 * Comparison is timing-safe to prevent timing-attack key recovery,
 * and the admin-probe rate-limiter fires BEFORE the compare so a
 * brute-forcer cannot bypass the attempt cap by submitting wrong
 * keys quickly. Length-mismatch returns immediately without calling
 * timingSafeEqual (which throws on length mismatch, leaking timing).
 */
export async function isOwner(req: Request): Promise<boolean> {
  const expected = process.env.ANCHOR_ADMIN_KEY;
  if (!expected) return false;

  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("anchor_admin="));
  if (!cookie) return false;
  const value = cookie.slice("anchor_admin=".length);

  if (adminProbeLimiter) {
    const probe = await adminProbeLimiter.limit(getClientIp(req));
    if (!probe.success) return false;
  }

  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function formatRetry(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.ceil(seconds / 3600)}h`;
}
