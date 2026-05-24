/**
 * Single source of truth for the agents.json descriptor.
 *
 * Both /.well-known/agents.json and the human /agents page read
 * from here. The human page renders the same data the agents
 * runtime would see, which keeps documentation honest — what
 * visitors see on the page IS what an agent gets when it crawls.
 *
 * The schema is loosely modeled on what Stripe's Agentic Commerce
 * Protocol (ACP) draft + OpenAI's agent runtimes look for. The
 * spec is not yet RFC-frozen, so we keep the shape conservative:
 * fields that have known consumers, nothing speculative.
 *
 * Cache strategy: the descriptor is cached for hours (cacheLife)
 * with a 'descriptor' tag. The agent-purchase endpoint in Phase 5
 * will fire revalidateTag('descriptor') after a sale, so inventory
 * counts stay accurate-ish without recomputing every request.
 */
import { cacheLife, cacheTag } from "next/cache";
import { CATALOG } from "./catalog";

const ORIGIN =
  process.env.ANCHOR_ORIGIN ?? "https://anchor.kevinmurphywebdev.com";

export type AgentsDescriptor = {
  schemaVersion: string;
  name: string;
  origin: string;
  contact: string;
  terms: string;
  capabilities: ReadonlyArray<"browse" | "search" | "compare" | "purchase">;
  endpoints: Readonly<{
    catalog: { url: string; method: "GET"; description: string };
    productLookup: {
      urlTemplate: string;
      method: "GET";
      description: string;
    };
    checkout: {
      url: string;
      method: "POST";
      description: string;
      contentType: string;
    };
  }>;
  auth: Readonly<{
    type: "delegated";
    protocol: string;
    principalHeader: string;
    description: string;
  }>;
  pricing: Readonly<{
    currency: "USD";
    negotiation: {
      supported: boolean;
      scope: "per-sku";
      mechanism: string;
      maxDiscountPct: number;
    };
  }>;
  rateLimits: Readonly<{
    perAgentPerMinute: number;
    perAgentPerDay: number;
  }>;
  catalog: ReadonlyArray<
    Readonly<{
      slug: string;
      name: string;
      category: string;
      url: string;
      agentUrl: string;
      listCents: number;
      negotiable: boolean;
      inStock: boolean;
    }>
  >;
};

export async function loadAgentsDescriptor(): Promise<AgentsDescriptor> {
  "use cache";
  cacheLife("hours");
  cacheTag("descriptor");

  return {
    schemaVersion: "agents.json/0.1-anchor",
    name: "anchor",
    origin: ORIGIN,
    contact: `mailto:agents@${new URL(ORIGIN).hostname}`,
    terms: `${ORIGIN}/terms`,
    capabilities: ["browse", "search", "compare", "purchase"],
    endpoints: {
      catalog: {
        url: `${ORIGIN}/api/agent/catalog`,
        method: "GET",
        description:
          "Returns the full product catalog as a structured JSON array. Includes pricing, negotiation envelope, and stock.",
      },
      productLookup: {
        urlTemplate: `${ORIGIN}/products/{slug}/agent/markdown`,
        method: "GET",
        description:
          "Returns citation-shaped content for a single product. Three format-specific URLs: /agent/markdown (combined: citation opening + JSON-LD fence + prose), /agent/json (Schema.org Product/Offer JSON-LD only), /agent/plain (citation opening + prose, no JSON-LD). All three are statically prerendered per SKU and served from the edge cache. The bare /agent endpoint 308-redirects to /agent/markdown for backward compatibility.",
      },
      checkout: {
        url: `${ORIGIN}/api/agent/checkout`,
        method: "POST",
        contentType: "application/json",
        description:
          "Initiates a purchase on behalf of a delegated user. Requires X-Agent-Principal header carrying a signed principal token. Supports negotiation within published per-sku floor.",
      },
    },
    auth: {
      type: "delegated",
      protocol: "ACP/0.1-draft",
      principalHeader: "X-Agent-Principal",
      description:
        "Agent must present a signed principal token issued by the end user. Token carries scope (purchase max-amount, ttl, idempotency salt). The /api/agent/checkout endpoint validates signature, scope, expiry, and idempotency on every call.",
    },
    pricing: {
      currency: "USD",
      negotiation: {
        supported: true,
        scope: "per-sku",
        mechanism:
          "Send proposedPriceCents in the checkout payload. If at or above the SKU floor, accepted; if below, rejected with the published floor returned. Each SKU exposes negotiable: true|false and floorCents in its product-lookup response.",
        maxDiscountPct: 15,
      },
    },
    rateLimits: {
      perAgentPerMinute: 30,
      perAgentPerDay: 1000,
    },
    catalog: CATALOG.map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      url: `${ORIGIN}/products/${p.slug}`,
      agentUrl: `${ORIGIN}/products/${p.slug}/agent/markdown`,
      listCents: p.pricing.listCents,
      negotiable: p.pricing.negotiable,
      inStock: p.inventory > 0,
    })),
  };
}

/** Markdown rendering for /llms.txt. Shorter shape than agents.json
 *  on purpose — llms.txt is for crawlers that just want a curated
 *  reading list, not the full capability surface. */
export function renderLlmsTxt(d: AgentsDescriptor): string {
  const lines: string[] = [];
  lines.push(`# anchor`);
  lines.push("");
  lines.push(
    `> AI-native product catalog. Every product has a human page AND three statically-cached LLM-facing endpoints: /products/{slug}/agent/markdown (recommended), /agent/json (JSON-LD only), /agent/plain (prose only). Full capability descriptor at ${d.origin}/.well-known/agents.json.`,
  );
  lines.push("");
  lines.push(`## Catalog`);
  lines.push("");
  for (const item of d.catalog) {
    lines.push(`- [${item.name}](${item.agentUrl}): citation-shaped product page`);
  }
  lines.push("");
  lines.push(`## Endpoints`);
  lines.push("");
  lines.push(`- [agents.json](${d.origin}/.well-known/agents.json): full machine-readable capability descriptor`);
  lines.push(`- [Catalog](${d.endpoints.catalog.url}): JSON list of all products with pricing and stock`);
  lines.push(`- [Checkout](${d.endpoints.checkout.url}): agent-purchase endpoint, requires delegated-authority token`);
  lines.push("");
  return lines.join("\n");
}
