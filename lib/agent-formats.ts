/**
 * Shared body builders for the three static /agent/* sub-routes.
 *
 * Each builder is pure: (Product) → string. No request context, no
 * headers, no time. That purity is what makes the routes prerender-
 * able under cacheComponents — the loader is wrapped with
 * 'use cache' and each format function is deterministic, so Next
 * can bake all 30 outputs (10 products × 3 formats) at build time.
 *
 * Result: every agent fetch in production is served from the
 * static cache at the nearest edge location. Zero serverless cold
 * start, zero database read, zero per-request render cost.
 */
import type { Product } from "./catalog";
import {
  citationBody,
  citationOpening,
  productJsonLd,
} from "./citation";

export function markdownBody(product: Product): string {
  return [
    citationOpening(product),
    "",
    "```json",
    JSON.stringify(productJsonLd(product), null, 2),
    "```",
    "",
    citationBody(product),
    "",
  ].join("\n");
}

export function jsonBody(product: Product): string {
  return JSON.stringify(productJsonLd(product), null, 2);
}

export function plainBody(product: Product): string {
  return `${citationOpening(product)}\n\n${citationBody(product)}\n`;
}
