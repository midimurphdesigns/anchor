/**
 * Comparison agent — generative UI via structured output.
 *
 * The model receives two product specs and decides which of three
 * UI shapes best fits the comparison:
 *
 *   - "specTable"      : side-by-side spec table when the two
 *                        products are the same category and share
 *                        comparable dimensions (two grinders, two
 *                        kettles, etc.)
 *   - "prosCons"       : structured pros/cons list when the two
 *                        products are in different categories but
 *                        someone might choose between them (a
 *                        kettle vs an aeropress, say)
 *   - "recommendation" : a short paragraph + a pick when the two
 *                        products don't really overlap in purpose
 *                        and the right answer is "you want both"
 *                        or "you want this one for this use case"
 *
 * The trick that makes this "generative UI": the model returns a
 * Zod-validated discriminated union. The server component switch-
 * renders the right React component on result.kind. No HTML or
 * markup ever crosses the wire from the model — the model only
 * picks a shape and fills fields. React renders.
 *
 * Why this beats free-form prose:
 *  - Output is type-safe at the React boundary
 *  - Each shape can be styled per the brand system
 *  - The model can't accidentally inject markup or scripts
 *  - The UI choice is testable: same input → same kind, every time
 */
import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { z } from "zod";
import type { Product } from "./catalog";

export const specTableShape = z.object({
  kind: z.literal("specTable"),
  headline: z
    .string()
    .min(1)
    .max(140)
    .describe(
      "One short sentence framing the comparison. Example: 'Both are 64mm flat-burr grinders; the X1 wins on adjustment resolution.'",
    ),
  /** Rows for the side-by-side table. Each row is one spec line
   *  with the two products' values for that spec. */
  rows: z
    .array(
      z.object({
        label: z.string().min(1).max(60),
        a: z.string().min(1).max(140),
        b: z.string().min(1).max(140),
      }),
    )
    .min(3)
    .max(8),
  pickSlug: z
    .string()
    .min(1)
    .max(120)
    .describe(
      "The slug of the product you'd recommend. Must match one of the two input slugs.",
    ),
  pickReason: z.string().min(10).max(280),
});

export const prosConsShape = z.object({
  kind: z.literal("prosCons"),
  headline: z.string().min(1).max(140),
  a: z.object({
    slug: z.string().min(1).max(120),
    pros: z.array(z.string().min(3).max(160)).min(2).max(4),
    cons: z.array(z.string().min(3).max(160)).min(1).max(4),
  }),
  b: z.object({
    slug: z.string().min(1).max(120),
    pros: z.array(z.string().min(3).max(160)).min(2).max(4),
    cons: z.array(z.string().min(3).max(160)).min(1).max(4),
  }),
});

export const recommendationShape = z.object({
  kind: z.literal("recommendation"),
  headline: z.string().min(1).max(140),
  body: z.string().min(40).max(800),
  pickSlug: z.string().min(1).max(120).nullable(),
  pickReason: z.string().min(10).max(280).nullable(),
});

export const comparisonSchema = z.discriminatedUnion("kind", [
  specTableShape,
  prosConsShape,
  recommendationShape,
]);

export type Comparison = z.infer<typeof comparisonSchema>;

function describeProduct(p: Product): string {
  const specs = p.specs.map((s) => `  - ${s.label}: ${s.value}`).join("\n");
  return [
    `slug: ${p.slug}`,
    `name: ${p.name}`,
    `brand: ${p.brand}`,
    `category: ${p.category}`,
    `priceCents: ${p.pricing.listCents}`,
    `description: ${p.shortDescription}`,
    `specs:`,
    specs,
    `tags: ${p.tags.join(", ")}`,
  ].join("\n");
}

/** Stream a structured comparison. Returns the partial-object
 *  stream so the server component can render progressively. */
export function streamComparison(args: { a: Product; b: Product }) {
  const system = [
    "You are anchor's comparison agent for specialty coffee gear.",
    "You receive two product specs and must produce a structured comparison.",
    "",
    "Pick ONE of three shapes based on what the products have in common:",
    "  - specTable: SAME category and share at least 3 comparable specs (two grinders, two kettles, two brewers of the same kind)",
    "  - prosCons: DIFFERENT category but both solve overlapping problems (kettle vs aeropress for travel pour-over)",
    "  - recommendation: DIFFERENT purpose where the right answer is contextual (a grinder vs beans — you need both)",
    "",
    "Tone: like an experienced barista talking to a curious customer. Specific, never vague. Avoid em-dashes in output.",
    "Never invent specs. Only use values present in the input.",
    "When you pick a recommended slug, it MUST be one of the two slugs you were given.",
  ].join("\n");

  const prompt = [
    "Product A:",
    describeProduct(args.a),
    "",
    "Product B:",
    describeProduct(args.b),
    "",
    "Produce the comparison.",
  ].join("\n");

  return streamObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: comparisonSchema,
    system,
    prompt,
    temperature: 0.3,
  });
}
