/**
 * Shared cached product loader.
 *
 * Both surfaces — the human RSC page at /products/[slug] and the
 * Edge agent endpoint at /products/[slug]/agent — call into this
 * one function so a single cache entry serves both audiences.
 *
 * Why 'use cache' instead of a plain function: Next 16's directive
 * makes the cache entry first-class in the build graph. cacheLife
 * sets revalidation cadence, cacheTag gives us a handle so the
 * agent-purchase endpoint can call revalidateTag('product:<slug>')
 * to invalidate this single entry the instant inventory changes on
 * a sale. The directive replaces the older unstable_cache wrapper
 * pattern and composes cleanly with PPR.
 */
import { cacheLife, cacheTag } from "next/cache";
import { getProduct, type Product } from "./catalog";

export async function loadProduct(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`product:${slug}`);

  /* In a real store this is the database read. The CATALOG constant
   * stands in. The point is that the cache wraps whatever the data
   * source is — swap it for a Supabase query and the cache shape
   * doesn't change. */
  const product = getProduct(slug);
  return product ?? null;
}

export async function loadAllSlugs(): Promise<ReadonlyArray<string>> {
  "use cache";
  cacheLife("days");
  cacheTag("catalog:index");

  const { CATALOG } = await import("./catalog");
  return CATALOG.map((p) => p.slug);
}
