/**
 * RenderInspector — the dev-mode overlay.
 *
 * Two independent toggles in the bottom-right corner:
 *
 *   1. Boundary Inspector — when on, every <Inspect mode="...">
 *      region gets a colored outline + a corner label naming its
 *      render mode. The visual story tells you which parts of the
 *      page are cheap, which are dynamic, and which ship JS.
 *
 *   2. Performance Inspector — when on, a sticky panel shows the
 *      most recent page navigation's timings plus a counterfactual:
 *      "if everything were dynamic, this would have cost ~250ms;
 *      you spent X ms because of cached + static choices."
 *
 * The whole component is client-only. It's mounted unconditionally
 * in app/layout.tsx but gates its own render on NODE_ENV !==
 * 'production' so the production bundle ships zero inspector code
 * (Next tree-shakes the entire subtree).
 *
 * Toggle state persists in localStorage so a page reload doesn't
 * lose your inspector configuration.
 */
"use client";

import { useEffect, useState } from "react";
import {
  FULLY_DYNAMIC_BASELINE_MS,
  INSPECT_MODES,
  type InspectMode,
} from "@/lib/inspector-modes";

type PerfSample = {
  url: string;
  ttfb: number;
  domContentLoaded: number;
  loadEvent: number;
  transferSize: number;
  fromCache: boolean;
  encodedBodySize: number;
};

const INSPECTOR_ATTR = "data-inspector-active";

export function RenderInspector() {
  const [boundary, setBoundary] = useState(false);
  const [perf, setPerf] = useState(false);
  const [sample, setSample] = useState<PerfSample | null>(null);
  const [mounted, setMounted] = useState(false);

  /* Hydrate persisted toggle state from localStorage. */
  useEffect(() => {
    setMounted(true);
    try {
      setBoundary(localStorage.getItem("anchor:inspect:boundary") === "1");
      setPerf(localStorage.getItem("anchor:inspect:perf") === "1");
    } catch {
      // ignore
    }
  }, []);

  /* Mirror boundary state to <html> data-attr so the CSS in
   * globals.css picks it up. */
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute(
      INSPECTOR_ATTR,
      boundary ? "true" : "false",
    );
    try {
      localStorage.setItem("anchor:inspect:boundary", boundary ? "1" : "0");
    } catch {
      // ignore
    }
  }, [boundary, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem("anchor:inspect:perf", perf ? "1" : "0");
    } catch {
      // ignore
    }
  }, [perf, mounted]);

  /* Collect a perf sample whenever the page loads. */
  useEffect(() => {
    if (!mounted) return;
    const navEntries = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    const nav = navEntries[0];
    if (!nav) return;
    setSample({
      url: window.location.pathname,
      ttfb: Math.round(nav.responseStart - nav.requestStart),
      domContentLoaded: Math.round(
        nav.domContentLoadedEventEnd - nav.startTime,
      ),
      loadEvent: Math.round(nav.loadEventEnd - nav.startTime),
      transferSize: nav.transferSize,
      fromCache:
        nav.transferSize === 0 ||
        nav.transferSize < nav.encodedBodySize,
      encodedBodySize: nav.encodedBodySize,
    });
  }, [mounted]);

  if (!mounted) return null;
  if (process.env.NODE_ENV === "production") return null;

  return (
    <>
      {boundary ? <BoundaryLegend /> : null}
      {perf && sample ? <PerfPanel sample={sample} /> : null}
      <div
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 9999,
          display: "flex",
          gap: 10,
          fontFamily: "var(--font-mono), monospace",
          fontSize: 13,
        }}
      >
        <Toggle
          label="BOUNDARIES"
          active={boundary}
          onClick={() => setBoundary((b) => !b)}
        />
        <Toggle
          label="PERF"
          active={perf}
          onClick={() => setPerf((b) => !b)}
        />
      </div>
    </>
  );
}

function Toggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 16px",
        border: `1px solid ${active ? "#4dffff" : "rgba(245,241,234,0.2)"}`,
        background: active ? "rgba(77,255,255,0.10)" : "rgba(10,10,11,0.85)",
        color: active ? "#4dffff" : "#a8a39a",
        cursor: "pointer",
        letterSpacing: "0.12em",
        fontWeight: 500,
        backdropFilter: "blur(8px)",
      }}
    >
      {active ? "● " : "○ "}
      {label}
    </button>
  );
}

function BoundaryLegend() {
  const modes: InspectMode[] = [
    "static-shell",
    "ssg-route",
    "cached",
    "edge-proxy",
    "ppr-hole",
    "server-dynamic",
    "client",
  ];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 78,
        right: 16,
        zIndex: 9998,
        maxWidth: 360,
        padding: 16,
        background: "rgba(10,10,11,0.92)",
        border: "1px solid rgba(245,241,234,0.15)",
        backdropFilter: "blur(8px)",
        fontFamily: "var(--font-mono), monospace",
        fontSize: 12,
        color: "#a8a39a",
      }}
    >
      <p
        style={{
          marginBottom: 12,
          letterSpacing: "0.12em",
          color: "#f5f1ea",
          fontSize: 11,
        }}
      >
        RENDER-MODE LEGEND
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {modes.map((m) => {
          const meta = INSPECT_MODES[m];
          return (
            <li
              key={m}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
                lineHeight: 1.4,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  background: meta.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "#f5f1ea" }}>{meta.label}</span>
              <span style={{ marginLeft: "auto", opacity: 0.6 }}>
                ~{meta.msEstimate}ms
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PerfPanel({ sample }: { sample: PerfSample }) {
  const saved = Math.max(0, FULLY_DYNAMIC_BASELINE_MS - sample.ttfb);
  const savedPct = Math.round(
    (saved / FULLY_DYNAMIC_BASELINE_MS) * 100,
  );

  return (
    <div
      style={{
        position: "fixed",
        bottom: 78,
        left: 16,
        zIndex: 9998,
        maxWidth: 400,
        padding: 16,
        background: "rgba(10,10,11,0.92)",
        border: "1px solid rgba(245,241,234,0.15)",
        backdropFilter: "blur(8px)",
        fontFamily: "var(--font-mono), monospace",
        fontSize: 12,
        color: "#a8a39a",
        lineHeight: 1.5,
      }}
    >
      <p
        style={{
          marginBottom: 12,
          letterSpacing: "0.12em",
          color: "#f5f1ea",
          fontSize: 11,
        }}
      >
        PERFORMANCE — {sample.url}
      </p>

      <Row label="TTFB" value={`${sample.ttfb} ms`} highlight />
      <Row label="DCL" value={`${sample.domContentLoaded} ms`} />
      <Row label="LOAD" value={`${sample.loadEvent} ms`} />
      <Row
        label="TRANSFER"
        value={
          sample.fromCache
            ? `${sample.transferSize}B (cache)`
            : `${(sample.transferSize / 1024).toFixed(1)} KB`
        }
      />

      <hr
        style={{
          margin: "14px 0",
          border: "none",
          borderTop: "1px solid rgba(245,241,234,0.1)",
        }}
      />

      <p
        style={{
          color: "#f5f1ea",
          marginBottom: 6,
          letterSpacing: "0.12em",
          fontSize: 11,
        }}
      >
        COUNTERFACTUAL
      </p>
      <Row
        label="If fully dynamic"
        value={`~${FULLY_DYNAMIC_BASELINE_MS} ms`}
      />
      <Row
        label="Actual"
        value={`${sample.ttfb} ms`}
        highlight
      />
      <Row
        label="Saved by static + cache"
        value={`${saved} ms (${savedPct}%)`}
        highlight
      />

      <p
        style={{
          marginTop: 14,
          opacity: 0.65,
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        Baseline assumes a full serverless invocation per request
        (loadProduct + AEO write + render) without 'use cache',
        SSG, or PPR. Real production would be slower due to cold
        starts.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 5,
      }}
    >
      <span>{label}</span>
      <span
        style={{
          color: highlight ? "#4dffff" : "#f5f1ea",
        }}
      >
        {value}
      </span>
    </div>
  );
}
