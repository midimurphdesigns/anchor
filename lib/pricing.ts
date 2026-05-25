/**
 * Token-cost calculator for anchor's LLM-spend endpoints.
 *
 * Both spend surfaces (ask + compare) use Claude Haiku 4.5. Pricing
 * is hard-coded against that model; if anchor ever adds a Sonnet or
 * Opus surface, extend this with a model-keyed lookup rather than
 * branching at the call site.
 *
 * Source: anthropic.com/pricing (Haiku 4.5 as of 2026-05). Prompt
 * caching tiers and batch discounts are not modeled — anchor doesn't
 * use either yet. If you turn on prompt caching, add the cached-read
 * tier here so the cap doesn't over-charge.
 */

const HAIKU_4_5_INPUT_USD_PER_MTOK = 1.0;
const HAIKU_4_5_OUTPUT_USD_PER_MTOK = 5.0;

export type Usage = {
  inputTokens?: number;
  outputTokens?: number;
};

export function haikuCostUsd(usage: Usage | undefined): number {
  if (!usage) return 0;
  const inUsd =
    ((usage.inputTokens ?? 0) / 1_000_000) * HAIKU_4_5_INPUT_USD_PER_MTOK;
  const outUsd =
    ((usage.outputTokens ?? 0) / 1_000_000) * HAIKU_4_5_OUTPUT_USD_PER_MTOK;
  return inUsd + outUsd;
}
