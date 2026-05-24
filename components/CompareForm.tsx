/**
 * CompareForm — client component that owns the form state +
 * displays whichever generative-UI shape the agent picks.
 *
 * Two select elements + a submit button. On submit, calls the
 * Server Action `compareProducts`. The action returns one of
 * three discriminated-union shapes; we switch on `kind` and
 * render the matching component.
 *
 * The model itself decides which shape to return based on
 * whether the two products share a category, share use cases,
 * or are unrelated. The client just renders what comes back.
 */
"use client";

import { useState, useTransition } from "react";
import { compareProducts, type CompareResult } from "@/app/compare/actions";
import type { Comparison } from "@/lib/compare-agent";
import { SpecTable } from "./compare/SpecTable";
import { ProsCons } from "./compare/ProsCons";
import { Recommendation } from "./compare/Recommendation";

type CatalogEntry = { slug: string; name: string; category: string };

export function CompareForm({ catalog }: { catalog: CatalogEntry[] }) {
  const [slugA, setSlugA] = useState<string>(catalog[0]?.slug ?? "");
  const [slugB, setSlugB] = useState<string>(catalog[1]?.slug ?? "");
  const [result, setResult] = useState<Comparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    startTransition(async () => {
      const r: CompareResult = await compareProducts(slugA, slugB);
      if (r.ok) {
        setResult(r.comparison);
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <Select
          label="PRODUCT A"
          value={slugA}
          onChange={setSlugA}
          catalog={catalog}
        />
        <Select
          label="PRODUCT B"
          value={slugB}
          onChange={setSlugB}
          catalog={catalog}
        />
        <button
          type="submit"
          disabled={pending}
          className="mono border border-[var(--color-accent)] px-5 py-3 text-xs uppercase tracking-wider text-[var(--color-accent)] transition hover:bg-[var(--color-accent)] hover:text-[var(--color-canvas)] disabled:opacity-50"
        >
          {pending ? "Comparing…" : "Compare →"}
        </button>
      </form>

      {error ? (
        <p className="mono mt-8 border border-[var(--color-rule)] p-4 text-xs text-[var(--color-ink-dim)]">
          {error}
        </p>
      ) : null}

      {result ? <Rendered comparison={result} /> : null}
    </>
  );
}

function Select({
  label,
  value,
  onChange,
  catalog,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  catalog: CatalogEntry[];
}) {
  return (
    <label className="block">
      <span className="mono text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mono mt-2 block w-full border border-[var(--color-rule)] bg-transparent px-3 py-3 text-sm text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
      >
        {catalog.map((c) => (
          <option key={c.slug} value={c.slug} className="bg-[var(--color-canvas)]">
            {c.name} ({c.category})
          </option>
        ))}
      </select>
    </label>
  );
}

function Rendered({ comparison }: { comparison: Comparison }) {
  switch (comparison.kind) {
    case "specTable":
      return <SpecTable data={comparison} />;
    case "prosCons":
      return <ProsCons data={comparison} />;
    case "recommendation":
      return <Recommendation data={comparison} />;
  }
}
