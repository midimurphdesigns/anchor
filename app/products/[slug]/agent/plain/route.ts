/**
 * Plain-text agent surface — citation opening line + prose body,
 * no JSON-LD fence. For crawlers that don't parse structured
 * data and just want the human-readable description.
 *
 * Static at build time. See ./markdown/route.ts for design rationale.
 */
import { loadAllSlugs, loadProduct } from "@/lib/product-loader";
import { canonicalUrl } from "@/lib/citation";
import { plainBody } from "@/lib/agent-formats";

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
    return new Response("not_found", {
      status: 404,
      headers: { "X-Anchor-Canonical": canonicalUrl(slug) },
    });
  }
  return new Response(plainBody(product), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
      "X-Anchor-Canonical": canonicalUrl(slug),
    },
  });
}
