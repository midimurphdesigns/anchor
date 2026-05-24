import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /* PPR (Partial Prerendering) lets a single page be MOSTLY static
   * with small holes that stream in dynamically. The product detail
   * page uses it: product copy + specs + JSON-LD are prerendered at
   * build time, while the "fetched by N agents this week" tally
   * streams in from Redis at request time. Without PPR you'd have to
   * pick all-static (stale agent count) or all-dynamic (slow TTFB on
   * a page that barely changes). */
  /* Next 16 merged PPR into cacheComponents. Enabling this flag
   * gives us BOTH 'use cache' (the loader cache primitive) AND
   * Partial Prerendering (the static-shell + dynamic-hole shape on
   * the product page). One toggle, both features. */
  cacheComponents: true,
  /* Rewrites expose internal routes at conventional public URLs.
   * Next's app router treats /.well-known and filenames-with-dots
   * (like /llms.txt) as private/non-routable, so we author the
   * handlers under plain paths and rewrite the public URLs to
   * them. Crawlers hit /.well-known/agents.json and /llms.txt —
   * the rewrites resolve internally. */
  async rewrites() {
    return [
      { source: "/.well-known/agents.json", destination: "/agents-descriptor" },
      { source: "/llms.txt", destination: "/llms-txt" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/.well-known/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=300" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
      {
        source: "/products/:slug/agent",
        headers: [
          { key: "Cache-Control", value: "public, max-age=60, s-maxage=300" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
