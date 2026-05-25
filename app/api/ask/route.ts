/**
 * POST /api/ask — streaming chat endpoint with tool-use.
 *
 * Visitor sends a message; the model can call any of the five
 * tools defined in lib/ask-tools.ts to answer or to propose a
 * navigation. Streaming response so the chat UI fills in tokens
 * as the model generates.
 *
 * Why we expose this as a regular HTTP route handler (not a
 * Server Action): useChat from @ai-sdk/react wants a POST endpoint
 * that returns a UIMessageStream. Server Actions don't natively
 * speak that protocol, route handlers do.
 *
 * Rate-limit story: the tools the agent can call all hit our own
 * endpoints which themselves are rate-limited at the proxy layer.
 * The chat itself runs on Anthropic credits — separate budget
 * concern. Phase 6+ should add per-IP rate-limit on this route to
 * stop a malicious caller from running our Anthropic bill up by
 * spamming long conversations. Not addressed tonight.
 */
import { NextRequest } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { buildAskTools } from "@/lib/ask-tools";

export async function POST(req: NextRequest): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "Conversational agent unavailable: ANTHROPIC_API_KEY not configured.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const { messages } = (await req.json()) as { messages: unknown[] };

  const origin = new URL(req.url).origin;
  const tools = buildAskTools({ origin });

  const system = [
    "You are anchor's on-page agent. Anchor is an open-source AI-native product catalog of ten fictional specialty-coffee products. You can answer questions about the catalog, the architecture, the eight-check checkout pipeline, the AEO instrumentation, or anything else visible on the site.",
    "",
    "You have five tools:",
    "  - list_products: returns the catalog (10 items)",
    "  - get_product(slug): fetches the markdown for one product",
    "  - compare_products(slug_a, slug_b): fetches two products for inline comparison",
    "  - lookup_agents_json: fetches /.well-known/agents.json",
    "  - propose_navigation(href, label, reason): proposes a route change for the user to confirm with a click",
    "",
    "Behavior:",
    "  1. Use list_products before referencing specific products if you don't already have their slugs in context.",
    "  2. Use get_product when the visitor asks about a specific product. The body it returns IS the LLM-facing markdown that external crawlers like Perplexity-User see.",
    "  3. After every substantive answer that points to another page, call propose_navigation to surface a confirm chip. Examples: explaining checkout -> propose /playground; explaining caching -> propose /docs/rendering; comparing products -> propose /compare.",
    "  4. NEVER call propose_navigation more than once per turn.",
    "  5. Cite specific facts from tool results in your prose. Do not invent specs.",
    "  6. Tone: warm + competent. No em-dashes. No exclamation points. No corporate filler.",
    "  7. Format: prose paragraphs, not bullet-point dumps. Bullets only when literally enumerating a list.",
    "",
    "Anchor is one of three trilogy builds (forge, loom, anchor) demonstrating production patterns for AI-driven commerce. Live demo at anchor.kevinmurphywebdev.com.",
  ].join("\n");

  const modelMessages = await convertToModelMessages(
    messages as Parameters<typeof convertToModelMessages>[0],
  );

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system,
    messages: modelMessages,
    tools,
    /* Allow multi-step tool use so the model can call
     * list_products, then get_product for a specific slug, then
     * propose_navigation — all in one turn. */
    stopWhen: stepCountIs(6),
    temperature: 0.4,
  });

  return result.toUIMessageStreamResponse();
}
