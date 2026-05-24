/**
 * /products/[slug]/agent — canonical entry point that redirects
 * to the markdown sub-route.
 *
 * We keep this route alive (not delete it) for three reasons:
 *   1. /agent is the URL we documented in the agents.json
 *      descriptor's productLookup.urlTemplate. Crawlers that
 *      indexed it before the format split keep working — they
 *      get one extra hop to /agent/markdown.
 *   2. The redirect itself is static and per-slug, so it lands in
 *      the edge cache like any other prerendered output.
 *   3. The proxy's /agent/* matcher catches the redirect too,
 *      which means we still log the fetch even though the body
 *      is just a 308.
 *
 * 308 Permanent Redirect (not 302) so crawlers update their stored
 * URL. POST/HEAD/etc. would preserve the method through a 308;
 * we only serve GET here anyway.
 */
import { loadAllSlugs } from "@/lib/product-loader";

type RouteParams = { slug: string };

export async function generateStaticParams(): Promise<RouteParams[]> {
  const slugs = await loadAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<RouteParams> },
): Promise<Response> {
  const { slug } = await params;
  return new Response(null, {
    status: 308,
    headers: {
      Location: `/products/${slug}/agent/markdown`,
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
