/**
 * Proxy — runs at the edge on every product-page and agent-route
 * request. Does two pieces of cross-cutting work:
 *
 * 1. Cited-by attribution: on /products/[slug], classify the
 *    Referer against known LLM clients (chatgpt.com, perplexity.ai,
 *    claude.ai, gemini.google.com, copilot.microsoft.com, you.com).
 *    Surface the result as X-Anchor-Cited-By on the response.
 *
 * 2. AEO instrumentation: on /products/[slug]/agent* (the three
 *    static format routes plus the /agent redirect itself),
 *    classify the User-Agent against known LLM crawlers, then
 *    queue a Redis write via after() so the response body — which
 *    in production is served straight from the edge cache —
 *    isn't delayed by the telemetry write.
 *
 * Why the logging moved here from the route handler: under Next 16
 * with cacheComponents, the /agent/markdown|json|plain routes are
 * prerendered per slug at build time and served from the edge
 * cache. Their route handlers don't execute at runtime, so any
 * logging inside them wouldn't fire on cache hits. The proxy
 * always runs, regardless of cache status, so it's the right
 * layer for "log every fetch even when the body is cached."
 */
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { classifyAgent, recordFetch } from "@/lib/aeo";

const LLM_REFERRERS: ReadonlyArray<readonly [string, string]> = [
  ["chatgpt.com", "ChatGPT"],
  ["chat.openai.com", "ChatGPT"],
  ["perplexity.ai", "Perplexity"],
  ["claude.ai", "Claude"],
  ["gemini.google.com", "Gemini"],
  ["copilot.microsoft.com", "Copilot"],
  ["you.com", "You"],
];

function classifyReferer(refererHeader: string | null): string | null {
  if (!refererHeader) return null;
  try {
    const u = new URL(refererHeader);
    for (const [host, client] of LLM_REFERRERS) {
      if (u.hostname === host || u.hostname.endsWith(`.${host}`)) return client;
    }
  } catch {
    return null;
  }
  return null;
}

/* Parse /products/[slug] or /products/[slug]/agent(/[format])? from
 * the URL pathname. Returns slug + whether this is an agent route.
 * Returns null for anything outside the matcher. */
function parsePath(
  pathname: string,
): { slug: string; isAgent: boolean } | null {
  /* /products/<slug>            — human page
   * /products/<slug>/agent      — redirect
   * /products/<slug>/agent/md|json|plain — static body */
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2 || parts[0] !== "products") return null;
  const slug = parts[1];
  if (!slug) return null;
  const isAgent = parts.length >= 3 && parts[2] === "agent";
  return { slug, isAgent };
}

export function proxy(req: NextRequest): NextResponse {
  const response = NextResponse.next();
  const parsed = parsePath(req.nextUrl.pathname);
  if (!parsed) return response;

  if (parsed.isAgent) {
    /* AEO log path. The /agent body comes from the edge cache (or
     * the redirect's static response); telemetry write rides in
     * after() so cached responses still don't wait on Redis. */
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const bot = classifyAgent(userAgent);
    response.headers.set("X-Anchor-Bot-Class", bot);
    after(async () => {
      await recordFetch({ slug: parsed.slug, bot, userAgent });
    });
  } else {
    /* Human page path — cited-by attribution. */
    const client = classifyReferer(req.headers.get("referer"));
    if (client) {
      response.headers.set("X-Anchor-Cited-By", client);
    }
  }

  return response;
}

export const config = {
  matcher: ["/products/:slug", "/products/:slug/agent/:format*"],
};
