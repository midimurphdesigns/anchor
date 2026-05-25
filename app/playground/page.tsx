/**
 * /playground — interactive demo of the eight-check delegated-
 * authority pipeline.
 *
 * Static shell + client interaction. The shell prerenders at
 * build time; the scenario list comes from the same source-of-
 * truth file the server-side runner uses. The client component
 * (PlaygroundRunner) handles the fetch + result rendering.
 *
 * Server-side runner at /api/playground/scenario signs tokens
 * with ANCHOR_ADMIN_KEY internally so the browser never sees
 * the admin key. The browser only ever calls /api/playground/scenario
 * with a scenarioId; the runner does all the auth work.
 */
import Link from "next/link";
import { PlaygroundRunner } from "@/components/PlaygroundRunner";
import { SCENARIOS } from "@/lib/playground-scenarios";

export const metadata = {
  title: "Playground — anchor",
  description:
    "Fire real /api/agent/checkout calls through five canonical scenarios. See exactly which of the eight checks rejects each attack and which lets the happy path through. Tokens signed server-side; admin key never leaves the server.",
};

export default function PlaygroundPage() {
  const list = SCENARIOS.map((s) => ({
    id: s.id,
    title: s.title,
    shortDescription: s.shortDescription,
  }));

  return (
    <main className="container-edge pt-16 pb-32 sm:pt-24">
      <nav aria-label="Breadcrumb" className="type-eyebrow">
        <Link
          href="/"
          data-magnetic
          className="hover:text-[color:var(--color-accent)]"
        >
          ← /ANCHOR
        </Link>
        <span aria-hidden className="mx-3 text-[color:var(--color-rule)]">/</span>
        <span>Playground</span>
      </nav>

      <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12">
        <header className="lg:col-span-8">
          <h1 className="type-h1">Playground.</h1>
          <p className="type-lede mt-8">
            Five scenarios. Each one fires a real{" "}
            <code className="mono text-[color:var(--color-accent)]">
              POST /api/agent/checkout
            </code>{" "}
            against the same pipeline production agents would hit. The token
            is signed server-side; the response carries every check's
            verdict. See which one rejects which attack.
          </p>
        </header>
        <aside className="lg:col-span-4 lg:pt-2">
          <p className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
            Same scenarios as scripts/test-checkout.ts. Five tests, eleven
            assertions, all passing in CI.
          </p>
        </aside>
      </div>

      <section className="mt-16 border-t border-[color:var(--color-rule)] pt-10">
        <p className="type-eyebrow">
          The eight-check pipeline
        </p>
        <ol className="mt-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Step n={1} label="Token present" />
          <Step n={2} label="Signature valid (HMAC-SHA256, constant-time)" />
          <Step n={3} label="Not expired" />
          <Step n={4} label="Agent matches caller" />
          <Step n={5} label="Scope matches (action + SKU + maxCents)" />
          <Step n={6} label="Nonce unused (replay protection)" />
          <Step n={7} label="Idempotency-Key check (retry protection)" />
          <Step n={8} label="Process charge + revalidateTag" />
        </ol>
        <p className="mt-6 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          Order is cheapest-first so an attacker spamming junk tokens never
          touches Redis. The crypto rejects them in ~1ms.
        </p>
      </section>

      <PlaygroundRunner scenarios={list} />

      <footer className="mt-24 border-t border-[var(--color-rule)] pt-8 text-sm text-[var(--color-ink-dim)]">
        <p>
          Source of truth:{" "}
          <a
            className="underline decoration-[var(--color-accent)]"
            href="https://github.com/midimurphdesigns/anchor/blob/main/lib/principal.ts"
          >
            lib/principal.ts
          </a>{" "}
          (the verifier),{" "}
          <a
            className="underline decoration-[var(--color-accent)]"
            href="https://github.com/midimurphdesigns/anchor/blob/main/app/api/agent/checkout/route.ts"
          >
            app/api/agent/checkout/route.ts
          </a>{" "}
          (the orchestrator),{" "}
          <a
            className="underline decoration-[var(--color-accent)]"
            href="https://github.com/midimurphdesigns/anchor/blob/main/scripts/test-checkout.ts"
          >
            scripts/test-checkout.ts
          </a>{" "}
          (the CI assertions for the same five scenarios).
        </p>
      </footer>
    </main>
  );
}

function Step({ n, label }: { n: number; label: string }) {
  return (
    <li className="flex items-baseline gap-3 border-l-2 border-[var(--color-rule)] pl-3">
      <span className="mono text-xs text-[var(--color-accent)]">{n}.</span>
      <span className="text-sm text-[var(--color-ink)]">{label}</span>
    </li>
  );
}
