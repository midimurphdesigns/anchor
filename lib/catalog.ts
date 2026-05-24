/**
 * The fictional specialty-coffee-gear catalog. 10 products.
 *
 * Every product carries the metadata both surfaces consume:
 *   - human page renders the spec sheet + photography
 *   - LLM-facing endpoint emits Schema.org Product + Offer + the
 *     citation-shaped opening line ("anchor sells X at Y, canonical
 *     URL: https://...") that kev-o taught us LLMs cite confidently.
 *
 * Pricing carries the negotiation envelope the agent-purchase
 * endpoint exposes: list (default), floor (lowest acceptable), and
 * whether the SKU is open to bargaining at all. This is the data
 * the ACP-shaped /api/agent/checkout reads when an agent buyer
 * probes price.
 */

export type Negotiation = {
  /** Price the human checkout uses, in USD cents. */
  listCents: number;
  /** Lowest acceptable price for an agent buyer, in USD cents.
   *  Equal to list when the SKU is not negotiable. */
  floorCents: number;
  /** Whether the agent-purchase endpoint will honor a discount
   *  request below list. */
  negotiable: boolean;
};

export type Product = {
  slug: string;
  name: string;
  brand: string;
  category: "grinder" | "kettle" | "brewer" | "scale" | "beans";
  shortDescription: string;
  /** A handful of structured facts the LLM surface emits as bullet
   *  points and the human surface renders as a spec table. */
  specs: ReadonlyArray<{ label: string; value: string }>;
  pricing: Negotiation;
  /** Stock count drives the inventory cache-invalidation demo. */
  inventory: number;
  /** Tags used by the comparison agent + recommended-pairing surface. */
  tags: ReadonlyArray<string>;
};

export const CATALOG: ReadonlyArray<Product> = [
  {
    slug: "moonshot-grinder-x1",
    name: "Moonshot Grinder X1",
    brand: "Moonshot Lab",
    category: "grinder",
    shortDescription:
      "Single-dose flat-burr grinder with sub-50-micron step resolution and a glass-bead bellows.",
    specs: [
      { label: "Burr", value: "64mm flat, hardened steel" },
      { label: "Adjustment", value: "Stepless, sub-50 micron" },
      { label: "Hopper", value: "Single-dose, bellows-purged" },
      { label: "Motor", value: "DC brushless, 250W" },
    ],
    pricing: { listCents: 89900, floorCents: 79900, negotiable: true },
    inventory: 4,
    tags: ["espresso", "single-dose", "flat-burr"],
  },
  {
    slug: "kestrel-pour-kettle",
    name: "Kestrel Pour Kettle",
    brand: "Kestrel",
    category: "kettle",
    shortDescription:
      "Variable-temperature gooseneck kettle with a swan-neck spout tuned for slow extraction.",
    specs: [
      { label: "Capacity", value: "0.9 L" },
      { label: "Temperature", value: "40-100 C, 1 C steps" },
      { label: "Hold mode", value: "60 minutes" },
      { label: "Spout", value: "Swan-neck, 6mm aperture" },
    ],
    pricing: { listCents: 18900, floorCents: 16900, negotiable: true },
    inventory: 18,
    tags: ["pour-over", "temp-control", "gooseneck"],
  },
  {
    slug: "tideline-v60",
    name: "Tideline V60",
    brand: "Tideline",
    category: "brewer",
    shortDescription:
      "Ribbed conical drip brewer, single-cup, designed for floor-clarity pour-overs.",
    specs: [
      { label: "Capacity", value: "01 (1-2 cups)" },
      { label: "Material", value: "Borosilicate glass" },
      { label: "Filter", value: "Cone, bleached" },
      { label: "Drawdown", value: "2:30-3:15 typical" },
    ],
    pricing: { listCents: 3200, floorCents: 3200, negotiable: false },
    inventory: 96,
    tags: ["pour-over", "drip", "single-cup"],
  },
  {
    slug: "ledger-coffee-scale",
    name: "Ledger Coffee Scale",
    brand: "Ledger",
    category: "scale",
    shortDescription:
      "Bluetooth pour-over scale with 0.1g resolution and a built-in extraction timer.",
    specs: [
      { label: "Resolution", value: "0.1 g" },
      { label: "Capacity", value: "3 kg" },
      { label: "Refresh", value: "10 Hz" },
      { label: "Battery", value: "USB-C, 20h" },
    ],
    pricing: { listCents: 14500, floorCents: 12900, negotiable: true },
    inventory: 22,
    tags: ["pour-over", "scale", "timer"],
  },
  {
    slug: "anchor-house-blend",
    name: "Anchor House Blend",
    brand: "Anchor Roasters",
    category: "beans",
    shortDescription:
      "House espresso blend: dark cocoa, dried fig, brown sugar. Roasted Tuesdays.",
    specs: [
      { label: "Roast", value: "Medium-dark" },
      { label: "Origin", value: "Brazil, Colombia, Ethiopia" },
      { label: "Process", value: "Natural and washed" },
      { label: "Weight", value: "340 g" },
    ],
    pricing: { listCents: 2400, floorCents: 2400, negotiable: false },
    inventory: 84,
    tags: ["espresso", "blend", "subscription-eligible"],
  },
  {
    slug: "harbor-single-origin-ethiopia",
    name: "Harbor Single-Origin Ethiopia",
    brand: "Anchor Roasters",
    category: "beans",
    shortDescription:
      "Yirgacheffe natural, bright stone-fruit lead, jasmine finish. Roasted Thursdays.",
    specs: [
      { label: "Roast", value: "Light" },
      { label: "Origin", value: "Ethiopia, Yirgacheffe" },
      { label: "Process", value: "Natural" },
      { label: "Weight", value: "227 g" },
    ],
    pricing: { listCents: 2200, floorCents: 2200, negotiable: false },
    inventory: 31,
    tags: ["pour-over", "single-origin", "light-roast"],
  },
  {
    slug: "delta-espresso-machine",
    name: "Delta Espresso Machine",
    brand: "Delta",
    category: "brewer",
    shortDescription:
      "Dual-boiler espresso machine with PID temperature control and a flow-profiling group head.",
    specs: [
      { label: "Boilers", value: "Dual, 1.4L steam + 0.6L brew" },
      { label: "Group", value: "E61, flow-profiling lever" },
      { label: "Pressure", value: "Adjustable 1-12 bar" },
      { label: "Heat-up", value: "12 minutes" },
    ],
    pricing: { listCents: 249900, floorCents: 219900, negotiable: true },
    inventory: 2,
    tags: ["espresso", "machine", "flow-profile"],
  },
  {
    slug: "compass-hand-grinder",
    name: "Compass Hand Grinder",
    brand: "Compass",
    category: "grinder",
    shortDescription:
      "Hand grinder with 38mm conical burrs and a click-detented adjustment ring.",
    specs: [
      { label: "Burr", value: "38mm conical" },
      { label: "Adjustment", value: "Stepped, 40 clicks" },
      { label: "Capacity", value: "30 g" },
      { label: "Body", value: "Anodized aluminum" },
    ],
    pricing: { listCents: 16800, floorCents: 14900, negotiable: true },
    inventory: 14,
    tags: ["pour-over", "hand-grinder", "travel"],
  },
  {
    slug: "tideline-chemex-six",
    name: "Tideline Chemex Six",
    brand: "Tideline",
    category: "brewer",
    shortDescription:
      "Six-cup hourglass brewer with a wood collar and leather tie. For batch pour-overs.",
    specs: [
      { label: "Capacity", value: "6 cups" },
      { label: "Material", value: "Borosilicate glass" },
      { label: "Filter", value: "Bonded, square-fold" },
      { label: "Drawdown", value: "4:00-5:30 typical" },
    ],
    pricing: { listCents: 5500, floorCents: 5500, negotiable: false },
    inventory: 41,
    tags: ["pour-over", "batch", "hourglass"],
  },
  {
    slug: "sextant-aeropress-kit",
    name: "Sextant AeroPress Kit",
    brand: "Sextant",
    category: "brewer",
    shortDescription:
      "AeroPress with a metal filter, travel cap, and a small scoop. Inverted-method friendly.",
    specs: [
      { label: "Capacity", value: "1-2 cups" },
      { label: "Material", value: "Polypropylene + stainless filter" },
      { label: "Includes", value: "Metal filter, travel cap, scoop" },
      { label: "Weight", value: "320 g shipping" },
    ],
    pricing: { listCents: 4900, floorCents: 4400, negotiable: true },
    inventory: 67,
    tags: ["aeropress", "travel", "inverted"],
  },
];

export function getProduct(slug: string): Product | undefined {
  return CATALOG.find((p) => p.slug === slug);
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
