/**
 * PlaygroundRunner — interactive scenario picker + verdict renderer.
 *
 * Picks one of five scenarios, fires it via the server-side runner
 * at /api/playground/scenario, and renders the full step chain
 * with HTTP statuses color-coded for pass/reject. Each step row
 * also expands to show the raw request body, response body, and
 * the X-Anchor-* response headers that prove the proxy ran.
 */
"use client";

import { useState, useTransition } from "react";

type ScenarioListItem = {
  id: string;
  title: string;
  shortDescription: string;
};

type StepResult = {
  caption: string;
  request: {
    body: unknown;
    idempotencyKey?: string;
    agent: string;
  };
  response: {
    status: number;
    body: unknown;
    idempotentReplay: boolean;
    botClass: string | null;
  };
};

type RunResult =
  | {
      ok: true;
      scenario: {
        id: string;
        title: string;
        explanation: string;
        expected: { statuses: number[]; summary: string };
        tokenScope: { action: string; maxCents: number; sku: string };
        tokenPrincipal: string;
        tokenAgent: string;
      };
      steps: StepResult[];
    }
  | { ok: false; error: string };

function formatCents(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

function statusBadge(status: number): { label: string; color: string } {
  if (status >= 200 && status < 300)
    return { label: `${status} OK`, color: "#4ade80" };
  if (status === 409)
    return { label: `${status} CONFLICT`, color: "#facc15" };
  if (status === 403 || status === 401)
    return { label: `${status} REJECTED`, color: "#fb923c" };
  if (status >= 500)
    return { label: `${status} ERROR`, color: "#f87171" };
  return { label: `${status}`, color: "#a8a39a" };
}

export function PlaygroundRunner({
  scenarios,
}: {
  scenarios: ScenarioListItem[];
}) {
  const [selected, setSelected] = useState<string>(scenarios[0]?.id ?? "");
  const [result, setResult] = useState<RunResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    if (!selected) return;
    setResult(null);
    startTransition(async () => {
      const res = await fetch("/api/playground/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: selected }),
      });
      const json = (await res.json()) as RunResult;
      setResult(json);
    });
  }

  const activeMeta = scenarios.find((s) => s.id === selected);

  return (
    <div className="mt-8">
      <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--color-ink-dim)]">
        PICK A SCENARIO
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((s) => {
          const isActive = s.id === selected;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(s.id);
                  setResult(null);
                }}
                className={`mono w-full border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-[var(--color-accent)] bg-[rgba(77,255,255,0.08)] text-[var(--color-accent)]"
                    : "border-[var(--color-rule)] text-[var(--color-ink)] hover:border-[var(--color-ink-dim)]"
                }`}
              >
                <div className="text-xs uppercase tracking-wider">
                  {s.title}
                </div>
                <div className="mt-2 text-[11px] leading-relaxed text-[var(--color-ink-dim)]">
                  {s.shortDescription}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6">
        <button
          type="button"
          onClick={run}
          disabled={pending || !selected}
          className="mono border border-[var(--color-accent)] px-5 py-3 text-xs uppercase tracking-wider text-[var(--color-accent)] transition hover:bg-[var(--color-accent)] hover:text-[var(--color-canvas)] disabled:opacity-50"
        >
          {pending
            ? "Running scenario…"
            : activeMeta
              ? `Run: ${activeMeta.title} →`
              : "Pick a scenario above"}
        </button>
      </div>

      {result ? (
        result.ok ? (
          <ResultPanel result={result} />
        ) : (
          <p className="mono mt-8 border border-[var(--color-rule)] p-4 text-xs text-[var(--color-ink-dim)]">
            {result.error}
          </p>
        )
      ) : null}
    </div>
  );
}

function ResultPanel({
  result,
}: {
  result: Extract<RunResult, { ok: true }>;
}) {
  return (
    <section className="mt-12 border-t border-[var(--color-rule)] pt-8">
      <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--color-ink-dim)]">
        SCENARIO RESULT
      </p>
      <h2 className="display mt-3 text-3xl">{result.scenario.title}.</h2>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-ink)]">
        {result.scenario.explanation}
      </p>

      <div className="mono mt-8 grid grid-cols-1 gap-4 border border-[var(--color-rule)] p-5 sm:grid-cols-3">
        <Field label="Principal" value={result.scenario.tokenPrincipal} />
        <Field label="Agent" value={result.scenario.tokenAgent} />
        <Field
          label="Scope"
          value={`${result.scenario.tokenScope.sku} ≤ ${formatCents(result.scenario.tokenScope.maxCents)}`}
        />
      </div>

      <ol className="mt-8 space-y-6">
        {result.steps.map((step, i) => {
          const badge = statusBadge(step.response.status);
          return (
            <li
              key={i}
              className="border-l-2 border-[var(--color-rule)] pl-5"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="mono text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
                  Step {i + 1}
                </p>
                <span
                  className="mono text-xs"
                  style={{ color: badge.color }}
                >
                  {badge.label}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--color-ink)]">
                {step.caption}
              </p>

              <details className="mt-4">
                <summary className="mono cursor-pointer text-[11px] uppercase tracking-wider text-[var(--color-ink-dim)] hover:text-[var(--color-accent)]">
                  Request → Response
                </summary>
                <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-dim)]">
                      Request body
                    </p>
                    <pre className="mono mt-2 overflow-x-auto border border-[var(--color-rule)] p-3 text-[11px] leading-relaxed text-[var(--color-ink)]">
                      {JSON.stringify(step.request.body, null, 2)}
                    </pre>
                    {step.request.idempotencyKey ? (
                      <p className="mono mt-2 text-[10px] text-[var(--color-ink-dim)]">
                        Idempotency-Key:{" "}
                        <span className="text-[var(--color-accent)]">
                          {step.request.idempotencyKey}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-dim)]">
                      Response body
                    </p>
                    <pre className="mono mt-2 overflow-x-auto border border-[var(--color-rule)] p-3 text-[11px] leading-relaxed text-[var(--color-ink)]">
                      {JSON.stringify(step.response.body, null, 2)}
                    </pre>
                    <div className="mono mt-2 space-y-1 text-[10px] text-[var(--color-ink-dim)]">
                      {step.response.idempotentReplay ? (
                        <p>
                          X-Anchor-Idempotent-Replay:{" "}
                          <span className="text-[var(--color-accent)]">
                            true
                          </span>{" "}
                          (cached response, no second charge)
                        </p>
                      ) : null}
                      {step.response.botClass ? (
                        <p>
                          X-Anchor-Bot-Class:{" "}
                          <span className="text-[var(--color-accent)]">
                            {step.response.botClass}
                          </span>{" "}
                          (proxy classified the User-Agent)
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 border-l-2 border-[var(--color-accent)] pl-5">
        <p className="mono text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
          VERDICT
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)]">
          {result.scenario.expected.summary}
        </p>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-dim)]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
