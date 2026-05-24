/**
 * Live AEO dashboard.
 *
 * Rendering tier: force-dynamic. The whole point of this page is to
 * show CURRENT numbers — there's no cache here, every request hits
 * Redis fresh. The Suspense boundaries below let us at least stream
 * the shell while the queries land.
 *
 * Three regions:
 *   1. Top bar — total fetches across all products + bots in the
 *      last 24h / 7d / 30d, plus the bot mix
 *   2. Per-product table — one row per SKU with 7d total + the
 *      single top bot for that SKU
 *   3. Live tail — recent fetches, newest first, with the actual
 *      user-agent string (truncated). Useful for spotting new bots
 *      or weird traffic.
 *
 * The dashboard is not behind owner-only auth in Phase 4 — the
 * data is intentionally public (this is build-in-public proof
 * artifact). When real money traffic lands in Phase 5 we'll
 * decide whether to gate it.
 */
import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import { CATALOG } from "@/lib/catalog";
import {
  BOT_KINDS,
  type BotKind,
  countFetches,
  countFetchesAllBots,
  recentFetches,
} from "@/lib/aeo";

/* Under cacheComponents mode, dynamic/revalidate route exports are
 * disallowed. The dashboard is dynamic by virtue of its data reads
 * (Redis zcount on every request) — none of the components below
 * are wrapped in 'use cache', so Next renders them per-request.
 * That's the equivalent of force-dynamic without the export knob. */

export const metadata = {
  title: "Dashboard — anchor AEO",
  description:
    "Live agent-fetch instrumentation. Per-product counts and bot mix over 24h / 7d / 30d.",
};

async function TopBar() {
  /* Reading headers() before any cache-able call marks this
   * component dynamic under cacheComponents mode. Without this,
   * Date.now() inside countFetches throws a prerender error. */
  await headers();
  const [d1, d7, d30] = await Promise.all([
    Promise.all(CATALOG.map((p) => countFetchesAllBots(p.slug, 24))).then((a) =>
      a.reduce((x, y) => x + y, 0),
    ),
    Promise.all(CATALOG.map((p) => countFetchesAllBots(p.slug, 24 * 7))).then(
      (a) => a.reduce((x, y) => x + y, 0),
    ),
    Promise.all(
      CATALOG.map((p) => countFetchesAllBots(p.slug, 24 * 30)),
    ).then((a) => a.reduce((x, y) => x + y, 0)),
  ]);

  return (
    <div className="mono mt-8 grid grid-cols-3 gap-4 text-sm">
      <Cell label="LAST 24H" value={d1} />
      <Cell label="LAST 7D" value={d7} />
      <Cell label="LAST 30D" value={d30} />
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[var(--color-rule)] px-4 py-4">
      <div className="text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
        {label}
      </div>
      <div className="display mt-2 text-3xl text-[var(--color-accent)]">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

async function BotMix() {
  await headers();
  const counts = await Promise.all(
    BOT_KINDS.map(async (bot) => {
      const perProduct = await Promise.all(
        CATALOG.map((p) => countFetches(p.slug, bot, 24 * 7)),
      );
      return { bot, count: perProduct.reduce((a, b) => a + b, 0) };
    }),
  );
  const visible = counts
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mt-12">
      <h2 className="display text-2xl">Bot mix (7d).</h2>
      {visible.length === 0 ? (
        <p className="mono mt-4 text-xs text-[var(--color-ink-dim)]">
          NO AGENT FETCHES RECORDED YET. CRAWL ONE OF THE /agent ENDPOINTS TO
          SEED DATA.
        </p>
      ) : (
        <ul className="mono mt-4 divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
          {visible.map((c) => (
            <li
              key={c.bot}
              className="flex items-baseline justify-between py-3 text-sm"
            >
              <span className="text-[var(--color-ink)]">{c.bot}</span>
              <span className="text-[var(--color-accent)]">
                {c.count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function PerProduct() {
  await headers();
  const rows = await Promise.all(
    CATALOG.map(async (p) => {
      const total = await countFetchesAllBots(p.slug, 24 * 7);
      return { slug: p.slug, name: p.name, total };
    }),
  );
  rows.sort((a, b) => b.total - a.total);

  return (
    <div className="mt-12">
      <h2 className="display text-2xl">Per product (7d).</h2>
      <ul className="mt-4 divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
        {rows.map((r) => (
          <li
            key={r.slug}
            className="flex items-baseline justify-between gap-4 py-3"
          >
            <Link
              href={`/products/${r.slug}`}
              className="truncate text-[var(--color-ink)] hover:text-[var(--color-accent)]"
            >
              {r.name}
            </Link>
            <span className="mono text-sm text-[var(--color-accent)]">
              {r.total.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function LiveTail() {
  await headers();
  const recent = await recentFetches(25);
  return (
    <div className="mt-12">
      <h2 className="display text-2xl">Live tail.</h2>
      {recent.length === 0 ? (
        <p className="mono mt-4 text-xs text-[var(--color-ink-dim)]">
          NO RECENT FETCHES.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {recent.map((r, i) => (
            <li
              key={`${r.ts}-${i}`}
              className="mono border-l-2 border-[var(--color-rule)] pl-3 text-xs"
            >
              <span className="text-[var(--color-accent)]">{r.bot}</span>
              {"  "}
              <span className="text-[var(--color-ink-dim)]">→</span>{" "}
              <span>/products/{r.slug}/agent</span>
              <div className="mt-1 truncate text-[var(--color-ink-dim)]">
                {r.userAgent}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--color-ink-dim)]">
        <Link href="/" className="hover:text-[var(--color-accent)]">
          ← /ANCHOR
        </Link>
        {"  /  DASHBOARD"}
      </p>
      <h1 className="display mt-6 text-5xl sm:text-7xl">Dashboard.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-dim)]">
        Live AEO instrumentation. Every fetch of a /agent endpoint by a known
        LLM crawler shows up here. Force-dynamic — no caching, the numbers are
        current.
      </p>

      <Suspense
        fallback={<div className="mono mt-8 text-xs">LOADING TOTALS…</div>}
      >
        <TopBar />
      </Suspense>

      <Suspense
        fallback={<div className="mono mt-12 text-xs">LOADING BOT MIX…</div>}
      >
        <BotMix />
      </Suspense>

      <Suspense
        fallback={
          <div className="mono mt-12 text-xs">LOADING PER-PRODUCT TABLE…</div>
        }
      >
        <PerProduct />
      </Suspense>

      <Suspense
        fallback={<div className="mono mt-12 text-xs">LOADING LIVE TAIL…</div>}
      >
        <LiveTail />
      </Suspense>
    </main>
  );
}
