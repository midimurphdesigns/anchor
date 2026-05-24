/**
 * /.well-known/agents.json — the machine-readable capability
 * descriptor that tells an agent runtime what this site supports
 * and how to interact with it.
 *
 * RFC 8615 reserved /.well-known/ as the conventional path for
 * site-level discovery files. agents.json piggy-backs on that
 * convention so crawlers know where to look without scraping.
 *
 * Cache discipline (set in next.config headers + here):
 *  - public, max-age=300, s-maxage=300 — 5-minute browser/CDN cache
 *  - ETag emitted via Next's default response handling
 *  - Access-Control-Allow-Origin: * — browser-based agents need CORS
 *
 * Content-Type is strict: application/json with no parameters.
 * Some crawlers are picky about exact content-type matching.
 */
import { loadAgentsDescriptor } from "@/lib/agents-descriptor";

export async function GET(): Promise<Response> {
  const descriptor = await loadAgentsDescriptor();
  return new Response(JSON.stringify(descriptor, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
