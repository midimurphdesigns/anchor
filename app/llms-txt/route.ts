/**
 * /llms.txt — the human-and-LLM-readable curated index.
 *
 * Where agents.json answers "what can I do?", llms.txt answers
 * "what should I read?" Shorter, plainer, markdown. Pairs well
 * with the citation-shaped /products/{slug}/agent endpoints —
 * crawlers that find this file land on a list of the right URLs
 * to fetch, not the front door of the site.
 *
 * Same cache + CORS posture as agents.json.
 */
import { loadAgentsDescriptor, renderLlmsTxt } from "@/lib/agents-descriptor";

export async function GET(): Promise<Response> {
  const descriptor = await loadAgentsDescriptor();
  const body = renderLlmsTxt(descriptor);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
