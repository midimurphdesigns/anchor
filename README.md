# anchor

AI-native product catalog. Every product has a human page AND an LLM-facing endpoint optimized for citation, discovery, and agent purchase. Live AEO dashboard counts agent fetches per product, broken down by user-agent.

Build 3 of the trilogy. Companion builds: [forge](https://forge.kevinmurphywebdev.com) (multi-agent debugging concierge) and [loom](https://loom.kevinmurphywebdev.com) (durable AI-commerce backend).

## What anchor demonstrates

**The AI-commerce thesis.** Half the web's traffic is becoming agents. anchor is designed for that, not just reactive to it.

- **Dual-surface product pages.** `/products/[slug]` for humans, `/products/[slug]/agent` for LLMs (citation-shaped JSON, canonical URL in the opening line).
- **`/.well-known/agents.json`.** Discoverable capability descriptor with endpoints, auth model, and pricing-negotiation metadata.
- **AEO instrumentation.** Structured logging of ChatGPT-User, Perplexity-User, Claude-Web, Google-Extended, and friends. Live dashboard with per-product fetch counts and a cited-by view.
- **Agent-purchase endpoint.** `POST /api/agent/checkout` shaped as Agentic Commerce Protocol (ACP). Delegated-authority validation, negotiation-aware pricing (list / floor / negotiable), idempotency keys, budget gate.
- **Comparison agent.** Pick two products, the model streams a comparison and decides which UI shape to render (table, pro-con, paragraph). AI SDK generative UI on top of a static-by-default catalog.

## What anchor doubles as

A reference implementation of Next 16 rendering patterns on a real catalog:

- **SSG** on the catalog index.
- **PPR (Partial Prerendering)** on the product detail page: static product copy + dynamic agent-tally suspense hole.
- **`'use cache'` + `cacheLife` + `cacheTag`** on the product-data loader.
- **`revalidateTag`** fired from the agent-purchase endpoint on a sale.
- **Edge runtime** on the LLM-facing surface. **Node runtime** on payment endpoints.
- **Server Actions** for human-side mutations (add-to-cart, subscribe).
- **Middleware** routes LLM user-agents through the logging path.
- **`unstable_after`** writes the agent-fetch telemetry without blocking the response.

Per-pattern annotations in [`docs/rendering.md`](./docs/rendering.md) explain why each route picked what it picked.

## Stack

- Next 16 (App Router, React 19)
- TypeScript strict, zero `any`
- Tailwind v4 (CSS-first config)
- Vercel AI SDK + `@ai-sdk/anthropic`
- Upstash Redis for AEO logging and rate limits
- Zod for input validation at every API boundary

## Local

```sh
pnpm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY at minimum
pnpm dev                     # opens on :3005
```

## Repo conventions

- Conventional commits: `feat:`, `fix:`, `perf:`, `seo:`, `aeo:`, `docs:`, `chore:`.
- Work on `dev`. No worktrees. Production deploy is founder-only.
- No `any`. Strict TypeScript.
- No em-dashes in user-facing body prose. Code comments and brand-convention frontmatter are exempt.

## Roadmap

See [`docs/PLAN.md`](./docs/PLAN.md) for the phase-by-phase build plan with decision-point quizzes.
