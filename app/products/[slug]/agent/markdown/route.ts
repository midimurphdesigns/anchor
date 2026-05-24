/**
 * Markdown agent surface — the recommended shape for LLM crawlers.
 *
 * Static at build time, one prerendered file per product slug.
 * Served from the nearest Vercel edge cache with ~5ms TTFB
 * worldwide. The route reads only from CATALOG via the cached
 * loader, never from request headers, so Next prerenders all 10
 * SKUs at build and never invokes the function at runtime.
 *
 * Logging lives in proxy.ts — runs on every request to this URL
 * regardless of cache status, so the AEO tally captures every
 * fetch even when the body itself is served from cache.
 */
import { loadAllSlugs, loadProduct } from "@/lib/product-loader";
import { canonicalUrl } from "@/lib/citation";
import { markdownBody } from "@/lib/agent-formats";

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
  return new Response(markdownBody(product), {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
      "X-Anchor-Canonical": canonicalUrl(slug),
    },
  });
}
