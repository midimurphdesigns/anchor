/**
 * AEO (Answer Engine Optimization) instrumentation.
 *
 * For every fetch of /products/[slug]/agent, classify the
 * user-agent into one of a small set of known LLM crawlers, then
 * store a record in a Redis sorted set keyed by
 *   aeo:fetch:<slug>:<bot>
 * with score = unix-ms timestamp. ZCOUNT over a time window then
 * answers "how many times has bot X fetched slug Y in the last
 * N hours" in a single call.
 *
 * We also write a flat list of recent fetches at aeo:recent for
 * the dashboard's "live tail" view.
 *
 * Bot list curated from the user-agents published by the
 * crawlers themselves:
 *   - ChatGPT-User       (OpenAI ChatGPT actions / browse)
 *   - GPTBot             (OpenAI training crawl)
 *   - Perplexity-User    (Perplexity grounded answers)
 *   - PerplexityBot      (Perplexity crawl)
 *   - Claude-Web         (Anthropic browse)
 *   - ClaudeBot          (Anthropic training)
 *   - Google-Extended    (Google AI training opt-out signal)
 *   - GoogleBot          (Google search, included so the dashboard
 *                         can distinguish "discovery" vs "answer")
 *   - Applebot-Extended  (Apple AI training)
 *   - Bytespider         (TikTok / ByteDance)
 *   - meta-externalagent (Meta AI)
 *   - Amazonbot          (Alexa / Amazon)
 *   - cohere-ai          (Cohere)
 *   - human              (no bot match)
 *   - unknown            (no UA header)
 */
import { redis } from "./redis";

export type BotKind =
  | "ChatGPT-User"
  | "GPTBot"
  | "Perplexity-User"
  | "PerplexityBot"
  | "Claude-Web"
  | "ClaudeBot"
  | "Google-Extended"
  | "GoogleBot"
  | "Applebot-Extended"
  | "Bytespider"
  | "meta-externalagent"
  | "Amazonbot"
  | "cohere-ai"
  | "human"
  | "unknown";

const SIGNATURES: ReadonlyArray<readonly [BotKind, RegExp]> = [
  ["ChatGPT-User", /ChatGPT-User/i],
  ["GPTBot", /GPTBot/i],
  ["Perplexity-User", /Perplexity-User/i],
  ["PerplexityBot", /PerplexityBot/i],
  ["Claude-Web", /Claude-Web/i],
  ["ClaudeBot", /ClaudeBot/i],
  ["Applebot-Extended", /Applebot-Extended/i],
  ["Google-Extended", /Google-Extended/i],
  ["GoogleBot", /Googlebot/i],
  ["Bytespider", /Bytespider/i],
  ["meta-externalagent", /meta-externalagent/i],
  ["Amazonbot", /Amazonbot/i],
  ["cohere-ai", /cohere-ai/i],
];

export function classifyAgent(userAgent: string | null): BotKind {
  if (!userAgent) return "unknown";
  for (const [bot, re] of SIGNATURES) {
    if (re.test(userAgent)) return bot;
  }
  return "human";
}

export const BOT_KINDS: ReadonlyArray<BotKind> = [
  "ChatGPT-User",
  "GPTBot",
  "Perplexity-User",
  "PerplexityBot",
  "Claude-Web",
  "ClaudeBot",
  "Google-Extended",
  "GoogleBot",
  "Applebot-Extended",
  "Bytespider",
  "meta-externalagent",
  "Amazonbot",
  "cohere-ai",
  "human",
  "unknown",
];

const RETENTION_DAYS = 30;
const RETENTION_SEC = RETENTION_DAYS * 24 * 60 * 60;

/** Record one agent fetch. Fire-and-forget; called from inside an
 *  unstable_after() callback so the response isn't blocked. */
export async function recordFetch(input: {
  slug: string;
  bot: BotKind;
  userAgent: string;
}): Promise<void> {
  const ts = Date.now();
  const fetchId = `${ts}:${Math.random().toString(36).slice(2, 10)}`;
  const key = `aeo:fetch:${input.slug}:${input.bot}`;
  const recentKey = `aeo:recent`;

  await Promise.all([
    redis.zadd(key, { score: ts, member: fetchId }),
    redis.zadd(recentKey, {
      score: ts,
      member: JSON.stringify({
        slug: input.slug,
        bot: input.bot,
        userAgent: input.userAgent.slice(0, 140),
        ts,
      }),
    }),
    redis.expire(key, RETENTION_SEC),
    redis.expire(recentKey, RETENTION_SEC),
  ]);
}

/** Count fetches of `slug` by `bot` in the last `hoursBack` hours. */
export async function countFetches(
  slug: string,
  bot: BotKind,
  hoursBack: number,
): Promise<number> {
  const key = `aeo:fetch:${slug}:${bot}`;
  const min = Date.now() - hoursBack * 60 * 60 * 1000;
  return redis.zcount(key, min, Date.now());
}

/** Total fetches across all bots for a single slug in the last
 *  N hours. One call per bot — small fan-out for the slug page. */
export async function countFetchesAllBots(
  slug: string,
  hoursBack: number,
): Promise<number> {
  const counts = await Promise.all(
    BOT_KINDS.filter((b) => b !== "human" && b !== "unknown").map((b) =>
      countFetches(slug, b, hoursBack),
    ),
  );
  return counts.reduce((a, b) => a + b, 0);
}

/** Per-bot breakdown for a single slug — what the dashboard renders
 *  for the per-product row. */
export async function breakdownByBot(
  slug: string,
  hoursBack: number,
): Promise<ReadonlyArray<{ bot: BotKind; count: number }>> {
  const entries = await Promise.all(
    BOT_KINDS.map(async (bot) => ({
      bot,
      count: await countFetches(slug, bot, hoursBack),
    })),
  );
  return entries.filter((e) => e.count > 0);
}

/** Recent fetches, newest first, for the live-tail panel. */
export async function recentFetches(
  limit: number,
): Promise<
  ReadonlyArray<{ slug: string; bot: BotKind; userAgent: string; ts: number }>
> {
  const raw = await redis.zrange("aeo:recent", 0, limit - 1, { rev: true });
  const parsed: Array<{
    slug: string;
    bot: BotKind;
    userAgent: string;
    ts: number;
  }> = [];
  for (const r of raw) {
    try {
      parsed.push(
        JSON.parse(r) as {
          slug: string;
          bot: BotKind;
          userAgent: string;
          ts: number;
        },
      );
    } catch {
      // skip malformed
    }
  }
  return parsed;
}
