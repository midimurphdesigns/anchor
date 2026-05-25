/**
 * Ask-Anchor tool definitions.
 *
 * Five tools the conversational agent can call to answer questions
 * and navigate the demo on behalf of the visitor:
 *
 *   list_products       — return the catalog (10 items, no fetch)
 *   get_product         — fetch /products/<slug>/agent/markdown
 *                         (yes, our own LLM-facing endpoint; that's
 *                         the demo — every call shows up in the
 *                         AEO dashboard as bot class "anchor-ask")
 *   compare_products    — fetch two product descriptions and let the
 *                         model draft a comparison inline
 *   lookup_agents_json  — fetch /.well-known/agents.json (publishes
 *                         the capability descriptor)
 *   propose_navigation  — propose a route change for the user to
 *                         click. NOT auto-executed. The UI renders
 *                         a confirm chip; user accepts with one click
 *
 * The first four are reads; the model can call them freely without
 * confirmation. The fifth produces a UI-side effect (a navigation
 * proposal) and only ever fires when the model determines the
 * conversation wants to move to a different page.
 *
 * Each fetch the agent makes carries User-Agent: anchor-ask/1.0
 * so the proxy classifies it as bot kind "anchor-ask" — visitors
 * who talk to the agent are literally contributing to the AEO
 * analytics they can see at /dashboard. The demo eats its own
 * dog food.
 */
import { tool } from "ai";
import { z } from "zod";
import { CATALOG, getProduct, formatPrice } from "./catalog";

const ANCHOR_ASK_USER_AGENT = "anchor-ask/1.0 (site-internal agent)";

async function fetchInternal(
  origin: string,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: string }> {
  const res = await fetch(`${origin}${path}`, {
    ...init,
    headers: {
      "User-Agent": ANCHOR_ASK_USER_AGENT,
      Accept: "text/markdown",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.text();
  return { status: res.status, body };
}

export function buildAskTools(args: { origin: string }) {
  return {
    list_products: tool({
      description:
        "List the full catalog with name, brand, category, price. Returns 10 products. No external fetch; reads from the in-memory catalog. Use this when the visitor asks 'what do you sell' or 'show me everything.'",
      inputSchema: z.object({}),
      execute: async () => {
        return {
          products: CATALOG.map((p) => ({
            slug: p.slug,
            name: p.name,
            brand: p.brand,
            category: p.category,
            price: formatPrice(p.pricing.listCents),
            inStock: p.inventory > 0,
          })),
        };
      },
    }),

    get_product: tool({
      description:
        "Fetch the full LLM-facing markdown for a single product by slug. Returns citation opening, JSON-LD, and prose body. Use this when the visitor asks about a specific product. Every call is logged to the AEO dashboard as bot class 'anchor-ask'.",
      inputSchema: z.object({
        slug: z
          .string()
          .min(1)
          .max(120)
          .describe(
            "Product slug. Must match one returned by list_products. Examples: moonshot-grinder-x1, kestrel-pour-kettle, tideline-v60.",
          ),
      }),
      execute: async ({ slug }) => {
        const product = getProduct(slug);
        if (!product) {
          return { ok: false, error: `No product with slug ${slug}` };
        }
        const fetched = await fetchInternal(
          args.origin,
          `/products/${slug}/agent/markdown`,
        );
        return {
          ok: true,
          slug,
          name: product.name,
          status: fetched.status,
          body: fetched.body.slice(0, 3000),
        };
      },
    }),

    compare_products: tool({
      description:
        "Fetch markdown for two products so the model can draft a comparison inline. Use when the visitor asks 'compare X and Y' or 'which should I get.' Does NOT use the /compare page's generative-UI agent — that one returns structured shapes; this one returns prose for the chat.",
      inputSchema: z.object({
        slug_a: z.string().min(1).max(120),
        slug_b: z.string().min(1).max(120),
      }),
      execute: async ({ slug_a, slug_b }) => {
        if (slug_a === slug_b) {
          return { ok: false, error: "Pick two different slugs." };
        }
        const a = getProduct(slug_a);
        const b = getProduct(slug_b);
        if (!a || !b) {
          return { ok: false, error: "One or both slugs not found." };
        }
        const [resA, resB] = await Promise.all([
          fetchInternal(args.origin, `/products/${slug_a}/agent/markdown`),
          fetchInternal(args.origin, `/products/${slug_b}/agent/markdown`),
        ]);
        return {
          ok: true,
          a: { slug: slug_a, name: a.name, body: resA.body.slice(0, 2000) },
          b: { slug: slug_b, name: b.name, body: resB.body.slice(0, 2000) },
        };
      },
    }),

    lookup_agents_json: tool({
      description:
        "Fetch /.well-known/agents.json — the machine-readable capability descriptor. Use when the visitor asks 'what can agents do here' or 'how would an agent buy something.' Returns the same JSON that an external LLM crawler would see.",
      inputSchema: z.object({}),
      execute: async () => {
        const fetched = await fetchInternal(
          args.origin,
          "/.well-known/agents.json",
          { headers: { Accept: "application/json" } },
        );
        try {
          return { ok: true, descriptor: JSON.parse(fetched.body) };
        } catch {
          return { ok: false, error: "Failed to parse descriptor JSON" };
        }
      },
    }),

    propose_navigation: tool({
      description:
        "Propose that the user navigate to a specific route. The UI renders a confirmation chip; the user clicks to accept. Use this whenever your answer naturally points the user toward another page (e.g. after explaining the checkout pipeline, propose /playground; after listing products, propose /products/<slug>). Always include a one-sentence reason.",
      inputSchema: z.object({
        href: z
          .string()
          .min(1)
          .max(200)
          .describe(
            "Internal route to propose. Must start with /. Examples: /playground, /dashboard, /products/moonshot-grinder-x1, /docs/rendering",
          ),
        label: z
          .string()
          .min(1)
          .max(80)
          .describe(
            "Short label for the confirmation chip. Examples: 'Open the Playground', 'See the Moonshot Grinder X1'.",
          ),
        reason: z
          .string()
          .min(10)
          .max(280)
          .describe(
            "One-sentence reason this navigation helps the visitor. Shown alongside the chip.",
          ),
      }),
      execute: async ({ href, label, reason }) => {
        /* Tool returns the proposal payload; the client renders the
         * confirmation chip via a custom message-part renderer. No
         * router.push() happens server-side. */
        return { ok: true, href, label, reason };
      },
    }),
  };
}

export type AskToolName =
  | "list_products"
  | "get_product"
  | "compare_products"
  | "lookup_agents_json"
  | "propose_navigation";
