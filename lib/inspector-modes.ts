/**
 * The classification vocabulary the Render Inspector uses.
 *
 * Every wrapped region carries one of these `InspectMode` values.
 * The choice is deliberate per-region (not auto-detected) so it
 * doubles as documentation: "I marked this region 'ppr-hole'
 * because I knew it was a Suspense boundary opting into dynamic
 * rendering."
 */

export type InspectMode =
  /** Prerendered HTML, no JS shipped. The cheapest tier. */
  | "static-shell"
  /** A <Suspense> boundary that opts the wrapped subtree into
   *  dynamic rendering — the dynamic hole inside a PPR page. */
  | "ppr-hole"
  /** Server-rendered per-request, no 'use cache'. Costs a
   *  serverless invocation every time. */
  | "server-dynamic"
  /** 'use cache' — read served from the build cache, no
   *  serverless invocation on hit. */
  | "cached"
  /** Edge proxy work — runs before any route handler, geographically
   *  close, no React render needed. */
  | "edge-proxy"
  /** Client component. Ships JavaScript to the browser. */
  | "client"
  /** Static route fully assembled at build time, no parameters. */
  | "static-route"
  /** SSG with generateStaticParams — N prerendered files. */
  | "ssg-route";

export type InspectModeMeta = {
  label: string;
  color: string;
  bg: string;
  description: string;
  /** Rough "what this costs per request" estimate so the
   *  performance panel can do counterfactual math. Milliseconds. */
  msEstimate: number;
};

export const INSPECT_MODES: Record<InspectMode, InspectModeMeta> = {
  "static-shell": {
    label: "STATIC SHELL",
    color: "#4ade80",
    bg: "rgba(74, 222, 128, 0.08)",
    description: "Prerendered HTML, served from the edge cache. Zero serverless cost.",
    msEstimate: 5,
  },
  "static-route": {
    label: "STATIC",
    color: "#4ade80",
    bg: "rgba(74, 222, 128, 0.08)",
    description: "Single static URL prerendered at build, served from edge cache.",
    msEstimate: 5,
  },
  "ssg-route": {
    label: "SSG",
    color: "#34d399",
    bg: "rgba(52, 211, 153, 0.08)",
    description: "Parameter-expanded static. N URLs prerendered at build.",
    msEstimate: 5,
  },
  cached: {
    label: "CACHED",
    color: "#60a5fa",
    bg: "rgba(96, 165, 250, 0.08)",
    description: "'use cache' read. Served from the build cache, no DB or API round-trip.",
    msEstimate: 1,
  },
  "edge-proxy": {
    label: "EDGE PROXY",
    color: "#4dffff",
    bg: "rgba(77, 255, 255, 0.06)",
    description: "Edge function classifying headers before any route handler runs.",
    msEstimate: 5,
  },
  "ppr-hole": {
    label: "PPR HOLE",
    color: "#facc15",
    bg: "rgba(250, 204, 21, 0.10)",
    description: "Dynamic Suspense hole inside a mostly-static page. Streams in at request time.",
    msEstimate: 35,
  },
  "server-dynamic": {
    label: "SERVER DYNAMIC",
    color: "#fb923c",
    bg: "rgba(251, 146, 60, 0.10)",
    description: "Server-rendered per request, no 'use cache'. Full serverless invocation.",
    msEstimate: 90,
  },
  client: {
    label: "CLIENT",
    color: "#f87171",
    bg: "rgba(248, 113, 113, 0.10)",
    description: "Client component. Ships JavaScript to the browser; hydrates after load.",
    msEstimate: 20,
  },
};

/** What the "if everything were dynamic" counterfactual costs.
 *  Used to compute "you saved X ms by choosing static + cached". */
export const FULLY_DYNAMIC_BASELINE_MS = 250;
