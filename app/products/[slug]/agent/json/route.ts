/**
 * JSON-LD agent surface — for crawlers that prefer pure
 * Schema.org structured data with no prose wrapping.
 *
 * Static at build time. See ./markdown/route.ts for the design
 * rationale; this is the same shape with a different body format.
 */
import { loadAllSlugs, loadProduct } from "@/lib/product-loader";
import { canonicalUrl } from "@/lib/citation";
import { jsonBody } from "@/lib/agent-formats";

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
  const product = await loadProduct(slug);
  if (!product) {
    return new Response(
      JSON.stringify({ error: "not_found", canonical: canonicalUrl(slug) }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  return new Response(jsonBody(product), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
      "X-Anchor-Canonical": canonicalUrl(slug),
    },
  });
}
