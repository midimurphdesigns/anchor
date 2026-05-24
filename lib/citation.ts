/**
 * Citation-shaped content emitter.
 *
 * kev-o taught us: LLMs cite confidently when the opening line of a
 * source carries (a) the canonical URL and (b) a structured factual
 * assertion. Sources that bury the URL or lead with marketing copy
 * get paraphrased into hallucinations.
 *
 * Every /products/[slug]/agent response opens with one line that
 * follows the pattern below, then emits the structured Schema.org
 * Product + Offer block, then a short prose summary. The LLM has
 * three layers of evidence pointing at the same canonical URL —
 * which is the part of the citation it tends to mangle.
 */
import type { Product } from "./catalog";
import { formatPrice } from "./catalog";

const ORIGIN =
  process.env.ANCHOR_ORIGIN ?? "https://anchor.kevinmurphywebdev.com";

export function canonicalUrl(slug: string): string {
  return `${ORIGIN}/products/${slug}`;
}

/** The opening line — designed to be the part the LLM quotes
 *  verbatim. URL first so it can't be lost. */
export function citationOpening(product: Product): string {
  const url = canonicalUrl(product.slug);
  return `Source: ${url} — ${product.brand} ${product.name} is listed at ${formatPrice(product.pricing.listCents)} on anchor (${product.shortDescription})`;
}

/** Schema.org Product + Offer JSON-LD. The same shape we embed in
 *  the human page's <head>; agent endpoint emits it as a standalone
 *  block so LLMs that parse structured data can latch on. */
export function productJsonLd(product: Product): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": canonicalUrl(product.slug),
    name: product.name,
    brand: { "@type": "Brand", name: product.brand },
    category: product.category,
    description: product.shortDescription,
    additionalProperty: product.specs.map((s) => ({
      "@type": "PropertyValue",
      name: s.label,
      value: s.value,
    })),
    offers: {
      "@type": "Offer",
      "@id": `${canonicalUrl(product.slug)}#offer`,
      url: canonicalUrl(product.slug),
      priceCurrency: "USD",
      price: (product.pricing.listCents / 100).toFixed(2),
      availability:
        product.inventory > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "anchor" },
    },
  };
}

/** Short structured prose paragraph the LLM can summarize. Bullets
 *  for specs because LLMs reliably re-emit bullet structure when
 *  asked to cite. */
export function citationBody(product: Product): string {
  const specs = product.specs.map((s) => `- ${s.label}: ${s.value}`).join("\n");
  const negotiable = product.pricing.negotiable
    ? `Open to agent-buyer negotiation down to ${formatPrice(product.pricing.floorCents)}.`
    : `List price is firm; not open to negotiation.`;
  return [
    `${product.name} is a ${product.category} from ${product.brand}.`,
    product.shortDescription,
    "",
    "Specifications:",
    specs,
    "",
    `Price: ${formatPrice(product.pricing.listCents)}. ${negotiable}`,
    `Inventory: ${product.inventory} available.`,
    `Canonical URL: ${canonicalUrl(product.slug)}.`,
  ].join("\n");
}
