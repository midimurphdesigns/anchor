/**
 * The single source of truth for anchor's render-mode catalog.
 *
 * Every route in the app appears here with its render mode + a
 * short rationale. The /docs/rendering page consumes this and
 * renders it as a documentation table. If you add a new route,
 * add an entry here at the same time — keeps the docs in lockstep
 * with the actual build output.
 */

export type RenderMode =
  | "static" // ○ — single static URL
  | "ssg" // ● — static with generateStaticParams
  | "ppr" // ◐ — partial prerender
  | "dynamic" // ƒ — server-rendered per request
  | "edge"; // ƒ in proxy

export const MODE_GLYPH: Record<RenderMode, string> = {
  static: "○",
  ssg: "●",
  ppr: "◐",
  dynamic: "ƒ",
  edge: "ƒ",
};

export const MODE_LABEL: Record<RenderMode, string> = {
  static: "Static",
  ssg: "SSG (parameter-expanded)",
  ppr: "Partial Prerender",
  dynamic: "Dynamic SSR",
  edge: "Edge",
};

export type RouteEntry = {
  path: string;
  mode: RenderMode;
  rationale: string;
};

/** The catalog. Ordered roughly from most-static to most-dynamic so
 *  the page reads as a journey through the rendering modes. */
export const ROUTES: ReadonlyArray<RouteEntry> = [
  {
    path: "/",
    mode: "static",
    rationale:
      "Pure SSG baseline. The catalog list comes from a TypeScript constant; no request data, no Suspense. Same HTML for every visitor, served from the edge CDN.",
  },
  {
    path: "/agents",
    mode: "static",
    rationale:
      "Reads from loadAgentsDescriptor() which is wrapped in 'use cache' + cacheLife('hours') + cacheTag('descriptor'). The page is purely a function of catalog data, so Next prerenders it once.",
  },
  {
    path: "/.well-known/agents.json",
    mode: "static",
    rationale:
      "Machine-readable capability descriptor. Same cached loader as /agents — one cache entry serves both surfaces. Rewrite maps the conventional URL to /agents-descriptor internally.",
  },
  {
    path: "/llms.txt",
    mode: "static",
    rationale:
      "Markdown reading list, same cached loader. Rewrite handles the .txt suffix that Next's app router would otherwise treat as a private file.",
  },
  {
    path: "/compare",
    mode: "static",
    rationale:
      "The form shell prerenders at build time. The AI call only fires when the user submits and the Server Action invokes the comparison agent — no model call happens during the static build.",
  },
  {
    path: "/playground",
    mode: "static",
    rationale:
      "Static shell describing the eight-check pipeline plus a client component that fires scenarios via /api/playground/scenario. The runner endpoint mints the demo token server-side so the admin key never reaches the browser.",
  },
  {
    path: "/api/playground/scenario",
    mode: "dynamic",
    rationale:
      "Server-side scenario runner. Mints a delegated-authority token with ANCHOR_ADMIN_KEY, calls /api/agent/checkout once per scenario step, returns the full request/response chain to the playground UI. Admin key stays server-side; the browser only ever sees the scenarioId it sent and the response chain it received back.",
  },
  {
    path: "/docs/rendering",
    mode: "static",
    rationale:
      "Pure documentation page. ROUTES is a TypeScript constant, no request data, no Suspense. This page documents itself.",
  },
  {
    path: "/products/[slug]/agent",
    mode: "ssg",
    rationale:
      "10 static redirects (one per slug, 308 to /agent/markdown) generated at build time via generateStaticParams. Keeps the canonical /agent URL working even though the body lives in three format-split sub-routes.",
  },
  {
    path: "/products/[slug]/agent/markdown",
    mode: "ssg",
    rationale:
      "10 prerendered files — the citation-shaped LLM surface for each product. Body is a pure function of CATALOG, no request reads. Edge cache serves every fetch in ~5ms worldwide.",
  },
  {
    path: "/products/[slug]/agent/json",
    mode: "ssg",
    rationale:
      "Same pattern as /markdown: 10 prerendered files containing only Schema.org Product/Offer JSON-LD. For crawlers that prefer pure structured data.",
  },
  {
    path: "/products/[slug]/agent/plain",
    mode: "ssg",
    rationale:
      "Same pattern as /markdown: 10 prerendered files with citation opening + prose body, no JSON-LD fence. For crawlers that don't parse structured data.",
  },
  {
    path: "/products/[slug]",
    mode: "ppr",
    rationale:
      "Mostly static product copy + specs + JSON-LD. Single dynamic hole: <Suspense> around <AgentTally>, which reads headers() inside to opt out of prerendering and streams in the live Redis fetch count at request time. Best of both worlds: instant shell + live data.",
  },
  {
    path: "/dashboard",
    mode: "ppr",
    rationale:
      "Functionally force-dynamic. Every Suspense child (TopBar, BotMix, PerProduct, LiveTail) reads headers() at the top, which under cacheComponents marks them dynamic. Equivalent to old 'export const dynamic = force-dynamic' without the route segment export, which is disallowed in this mode.",
  },
  {
    path: "/api/agent/issue-token",
    mode: "dynamic",
    rationale:
      "Admin-only token minter. Each call signs a new token with a fresh jti — no caching possible. Default-deny: 404 (not 403) on a missing or wrong admin key so the endpoint can't be enumerated.",
  },
  {
    path: "/api/agent/checkout",
    mode: "dynamic",
    rationale:
      "The agent-purchase endpoint. Output depends on the token contents, the Redis nonce + idempotency lookups, the cached product, and the current time. No amount of caching helps — every request must run the 8-check pipeline fresh.",
  },
  {
    path: "proxy.ts",
    mode: "edge",
    rationale:
      "Cited-by attribution + AEO logging cross-cutting concerns. Runs at the edge on every /products/:slug and /products/:slug/agent* request, classifies User-Agent / Referer, attaches X-Anchor-* headers, queues Redis writes via after(). Telemetry survives even when the body is served from the static cache.",
  },
];

/** Cross-cutting primitives the build leans on. Each one gets a
 *  short callout on the docs page so an interviewer can see at a
 *  glance which Next 16 features the build exercises. */
export type Primitive = {
  name: string;
  where: string;
  what: string;
};

export const PRIMITIVES: ReadonlyArray<Primitive> = [
  {
    name: "'use cache' directive",
    where: "lib/product-loader.ts, lib/agents-descriptor.ts",
    what: "Marks a function's output cacheable. Inputs become the cache key; the result is memoized across requests. Replaces the older unstable_cache wrapper.",
  },
  {
    name: "cacheLife(profile)",
    where: "lib/product-loader.ts ('hours' & 'days'), lib/agents-descriptor.ts ('hours')",
    what: "Sets revalidation cadence on a cached function. anchor uses 'hours' for product reads and 'days' for the rarely-changing slug index.",
  },
  {
    name: "cacheTag(name)",
    where: "lib/product-loader.ts, lib/agents-descriptor.ts",
    what: "Labels a cache entry so revalidateTag can invalidate it surgically. anchor tags 'product:<slug>', 'catalog:index', and 'descriptor' — selling a Moonshot Grinder invalidates exactly that one slug.",
  },
  {
    name: "revalidateTag(tag, profile)",
    where: "app/api/agent/checkout/route.ts",
    what: "Fires after a successful sale. Invalidates the product cache entry so the next read recomputes with the decremented inventory. The other 9 products stay cached.",
  },
  {
    name: "generateStaticParams()",
    where: "app/products/[slug]/page.tsx + all four /agent/* routes",
    what: "Tells Next which dynamic-segment values to prerender. anchor expands 10 slugs × 4 agent routes = 40 prerendered HTML files at build.",
  },
  {
    name: "after(fn)",
    where: "proxy.ts (telemetry write)",
    what: "Vercel-specific lifecycle primitive. Runs fn after the response is sent, but before the function suspends. Lets us preserve sub-50ms TTFB while still writing AEO logs to Redis on every fetch. Without after(), an unawaited Promise in serverless would be killed mid-execution.",
  },
  {
    name: "Server Action",
    where: "app/compare/actions.ts",
    what: "Type-safe client-to-server call. The comparison page's <CompareForm> imports compareProducts() directly and gets the exact return type. No route shape to maintain, no JSON serialization to design.",
  },
  {
    name: "streamObject + Zod discriminated union",
    where: "lib/compare-agent.ts",
    what: "Generative UI in AI SDK v6. The model picks one of three shapes (specTable / prosCons / recommendation) and fills it. React switch-renders the matching component on result.kind. Type-safe at every boundary.",
  },
  {
    name: "Proxy (formerly Middleware)",
    where: "proxy.ts",
    what: "Runs at the edge before any route handler. Two jobs: (1) classify Referer for cited-by attribution on human page visits, (2) classify User-Agent + log AEO fetches on /agent/* even when the body is served from the static cache. Renamed from middleware.ts in Next 16.",
  },
  {
    name: "cacheComponents flag",
    where: "next.config.ts",
    what: "Enables BOTH 'use cache' AND Partial Prerendering. Default-static rendering: opting OUT of caching is the active gesture (via headers() / cookies() / non-cached reads). Disallows per-route runtime / dynamic / revalidate exports — those move into the component body via the data sources you read.",
  },
];
