/**
 * LLM-facing product endpoint.
 *
 * Runtime: Edge. The whole response is built from in-memory CATALOG
 * data plus a cached loader read; no Node-only APIs are needed, so
 * this can serve geo-close at sub-50ms TTFB. That matters because
 * LLM crawlers timeout aggressively (Perplexity's user-agent has a
 * documented 5s budget per fetch).
 *
 * Content negotiation:
 *  - Accept: application/json     → emit Schema.org JSON-LD only
 *  - Accept: text/plain           → emit the citation-shaped text
 *  - Accept: anything else (or *) → emit a combined block:
 *      1. citation opening line (URL + structured assertion)
 *      2. JSON-LD inside a markdown code fence
 *      3. citation prose body with specs as bullets
 *
 * The combined default is the highest-evidence shape — it gives the
 * LLM three independent paths to the same canonical URL, which is
 * the field most-often hallucinated.
 *
 * The user-agent header is captured for the Phase 4 AEO logger
 * (stubbed here as a header echo).
 */
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { loadProduct } from "@/lib/product-loader";
import { classifyAgent, recordFetch } from "@/lib/aeo";
import {
  canonicalUrl,
  citationBody,
  citationOpening,
  productJsonLd,
} from "@/lib/citation";

/* Note: Next 16 with cacheComponents enabled does not accept a
 * per-route `runtime` export. Runtime selection moves to deploy
 * config (vercel.json `functions.runtime`) or stays default. This
 * route deliberately uses zero Node-only APIs so it remains
 * Edge-deployable. See docs/rendering.md for the rationale. */

type RouteParams = { slug: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<Response> {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) {
    return NextResponse.json(
      { error: "not_found", canonical: canonicalUrl(slug) },
      { status: 404 },
    );
  }

  const accept = req.headers.get("accept") ?? "";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const bot = classifyAgent(userAgent);

  /* The whole point of after() is that the response gets to send
   * before this callback runs. The crawler sees a sub-50ms TTFB;
   * we still get the log written. If Upstash is misconfigured the
   * redis stub no-ops so this stays a free win even in dev. */
  after(async () => {
    await recordFetch({ slug, bot, userAgent });
  });

  const debugHeaders = {
    "X-Anchor-Observed-Agent": userAgent.slice(0, 200),
    "X-Anchor-Bot-Class": bot,
    "X-Anchor-Canonical": canonicalUrl(slug),
    "Cache-Control": "public, max-age=60, s-maxage=300",
  };

  if (accept.includes("application/json") && !accept.includes("text/plain")) {
    return NextResponse.json(productJsonLd(product), { headers: debugHeaders });
  }

  if (accept.startsWith("text/plain")) {
    const body = `${citationOpening(product)}\n\n${citationBody(product)}\n`;
    return new Response(body, {
      status: 200,
      headers: {
        ...debugHeaders,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  /* Default combined block — opening + JSON-LD fence + prose. This
   * is the shape we want LLMs to land on by default. */
  const combined = [
    citationOpening(product),
    "",
    "```json",
    JSON.stringify(productJsonLd(product), null, 2),
    "```",
    "",
    citationBody(product),
    "",
  ].join("\n");

  return new Response(combined, {
    status: 200,
    headers: {
      ...debugHeaders,
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
