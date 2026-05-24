/**
 * Middleware — cited-by attribution.
 *
 * When a human lands on /products/<slug> with a Referer pointing at
 * a known LLM client (chatgpt.com, perplexity.ai, claude.ai,
 * gemini.google.com, copilot.microsoft.com), we record the citation
 * arrival. The fetched-by-bot record from the /agent endpoint plus
 * the cited-by-arrival record here close the loop: we can see
 * "Perplexity fetched product X 12 times, then a human arrived
 * with a Perplexity referrer 3 times" — that's the answer-engine
 * funnel for this product.
 *
 * Middleware runs on the Edge, before the request hits any route
 * handler. We attach the referrer-derived "client" classification
 * as a request header so the page component can attribute without
 * a second parse.
 *
 * We don't write Redis from middleware itself — middleware can't
 * await meaningful side effects without holding up the response.
 * Instead we attach the header; the (server) product page is the
 * one that calls into the AEO logger inside after().
 */
import { NextRequest, NextResponse } from "next/server";

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

export function proxy(req: NextRequest): NextResponse {
  const response = NextResponse.next();
  const client = classifyReferer(req.headers.get("referer"));
  if (client) {
    response.headers.set("X-Anchor-Cited-By", client);
  }
  return response;
}

export const config = {
  matcher: ["/products/:slug"],
};
