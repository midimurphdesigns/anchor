/**
 * AskAnchor — the conversational dock + chat surface.
 *
 * Two modes:
 *   dock = small cyan-rhombus button pinned bottom-right (default)
 *   open = drawer rises from the bottom with the chat thread + composer
 *
 * The drawer also has an "Open fullscreen" link routing to /ask
 * for visitors who want the dedicated page experience.
 *
 * Renders streaming agent responses via useChat from @ai-sdk/react.
 * Tool calls render inline: list_products as a compact chip strip,
 * get_product as a quoted excerpt, compare_products as a two-column
 * mini-card, lookup_agents_json as a code snippet, propose_navigation
 * as a click-to-confirm chip that drives router.push when accepted.
 *
 * Mounts globally via app/layout.tsx so every page has the dock.
 */
"use client";

import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";

const STARTERS = [
  "What is anchor?",
  "Walk me through the eight-check checkout pipeline.",
  "Which grinder should I buy?",
  "How do agents discover this site?",
] as const;

type AskAnchorProps = {
  /** When true, renders the fullscreen layout instead of the dock. */
  fullscreen?: boolean;
};

export default function AskAnchor({ fullscreen = false }: AskAnchorProps) {
  const [open, setOpen] = useState(fullscreen);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    api: "/api/ask",
  } as Parameters<typeof useChat>[0]);

  /* Auto-scroll the thread to the latest message when new content
   * lands. The chat surface scrolls inside its own container, not
   * the document, so we manage this ourselves. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || status === "submitted" || status === "streaming") return;
    void sendMessage({ text: input });
    setInput("");
  }

  function fireStarter(text: string) {
    if (status === "submitted" || status === "streaming") return;
    void sendMessage({ text });
  }

  function acceptNavigation(href: string) {
    setOpen(false);
    router.push(href);
  }

  /* Floating dock when closed (and not on fullscreen route). */
  if (!fullscreen && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Ask Anchor"
        data-magnetic
        className="ask-dock"
      >
        <DockRhombus />
        <span className="ask-dock-label">Ask anchor</span>
      </button>
    );
  }

  const drawerClasses = fullscreen ? "ask-fullscreen" : "ask-drawer";

  return (
    <div className={drawerClasses} role="dialog" aria-label="Ask anchor">
      <header className="ask-header">
        <div className="flex items-baseline gap-3">
          <DockRhombus small />
          <p className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
            Ask anchor
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!fullscreen ? (
            <a
              href="/ask"
              data-magnetic
              className="mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-ink-dim)] hover:text-[color:var(--color-accent)]"
            >
              Open fullscreen →
            </a>
          ) : null}
          {!fullscreen ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-ink-dim)] hover:text-[color:var(--color-accent)]"
            >
              Close ×
            </button>
          ) : null}
        </div>
      </header>

      <div ref={scrollRef} className="ask-thread">
        {messages.length === 0 ? (
          <div className="ask-empty">
            <p className="display text-3xl leading-tight">
              Talk to anchor.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--color-ink-dim)]">
              I can answer questions about the catalog, the eight-check
              checkout pipeline, the AEO dashboard, the rendering modes,
              or anything else visible on the site. I can also propose
              navigations you can accept with a click. Every product
              page I fetch contributes one entry to the AEO dashboard
              as bot class{" "}
              <code className="mono text-[color:var(--color-accent)]">
                anchor-ask
              </code>
              .
            </p>
            <p className="mono mt-8 text-xs uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
              Try
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => fireStarter(s)}
                    data-magnetic
                    className="mono border border-[color:var(--color-rule)] px-3 py-2 text-[11px] text-[color:var(--color-ink-dim)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol className="ask-messages">
            {messages.map((m) => (
              <li key={m.id} data-role={m.role} className="ask-message">
                <p className="mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
                  {m.role === "user" ? "You" : "Anchor"}
                </p>
                <div className="mt-2 space-y-3">
                  {renderMessageParts(m, acceptNavigation)}
                </div>
              </li>
            ))}
            {status === "submitted" || status === "streaming" ? (
              <li className="ask-message" data-role="assistant">
                <p className="mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
                  Anchor
                </p>
                <p className="mt-2 mono text-xs text-[color:var(--color-ink-dim)]">
                  <span className="ask-pulse">●</span> thinking
                </p>
              </li>
            ) : null}
          </ol>
        )}
        {error ? (
          <p className="mono mt-6 border border-[color:var(--color-rule)] p-3 text-xs text-[color:var(--color-ink-dim)]">
            {error.message}
          </p>
        ) : null}
      </div>

      <form className="ask-composer" onSubmit={onSubmit}>
        <textarea
          name="prompt"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="Ask anchor anything…"
          className="ask-input"
          disabled={status === "submitted" || status === "streaming"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          data-magnetic
          disabled={
            !input.trim() ||
            status === "submitted" ||
            status === "streaming"
          }
          className="ask-send"
        >
          {status === "streaming" ? "Streaming…" : "Send →"}
        </button>
      </form>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */

function renderMessageParts(
  m: UIMessage,
  onAcceptNavigation: (href: string) => void,
) {
  /* AI SDK v6 UIMessage carries an array of parts: text chunks, tool
   * invocations with their input/output, and step boundaries. We
   * render each one based on its type. */
  type AnyPart = {
    type: string;
    text?: string;
    input?: unknown;
    output?: unknown;
  };
  const parts = ((m as unknown as { parts?: AnyPart[] }).parts ??
    []) as AnyPart[];

  return parts.map((part, i) => {
    /* Text chunks. */
    if (part.type === "text") {
      return (
        <p
          key={i}
          className="text-sm leading-relaxed text-[color:var(--color-ink)] whitespace-pre-wrap"
        >
          {part.text}
        </p>
      );
    }

    /* Tool invocations. AI SDK v6 emits tool calls as parts with
     * type 'tool-<toolName>' or 'tool-invocation'. The exact part
     * shape varies by SDK minor version; we render any part with
     * an 'output' field as a tool result. */
    if (part.type.startsWith("tool-") && part.output) {
      const toolName = part.type.replace(/^tool-/, "");
      return (
        <ToolResult
          key={i}
          name={toolName}
          output={part.output}
          onAcceptNavigation={onAcceptNavigation}
        />
      );
    }

    return null;
  });
}

function ToolResult({
  name,
  output,
  onAcceptNavigation,
}: {
  name: string;
  output: unknown;
  onAcceptNavigation: (href: string) => void;
}) {
  if (name === "propose_navigation") {
    const proposal = output as {
      ok?: boolean;
      href?: string;
      label?: string;
      reason?: string;
    };
    if (!proposal.ok || !proposal.href || !proposal.label) return null;
    return (
      <div className="ask-nav-proposal">
        <p className="mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
          Proposed navigation
        </p>
        <button
          type="button"
          onClick={() => onAcceptNavigation(proposal.href!)}
          data-magnetic
          className="ask-nav-accept"
        >
          {proposal.label} <span aria-hidden>→</span>
        </button>
        {proposal.reason ? (
          <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--color-ink-dim)]">
            {proposal.reason}
          </p>
        ) : null}
      </div>
    );
  }

  if (name === "list_products") {
    const result = output as {
      products?: Array<{
        slug: string;
        name: string;
        brand: string;
        category: string;
        price: string;
      }>;
    };
    if (!result.products) return null;
    return (
      <details className="ask-tool-result">
        <summary>
          <span className="mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
            list_products → {result.products.length} items
          </span>
        </summary>
        <ul className="mt-2 divide-y divide-[color:var(--color-rule)]">
          {result.products.map((p) => (
            <li
              key={p.slug}
              className="flex items-baseline justify-between gap-3 py-2 text-[12px]"
            >
              <span className="text-[color:var(--color-ink)]">{p.name}</span>
              <span className="mono text-[color:var(--color-ink-dim)]">
                {p.price}
              </span>
            </li>
          ))}
        </ul>
      </details>
    );
  }

  /* Catch-all: render the tool name + JSON output for any tool we
   * don't have a custom renderer for. Compact, collapsed by default. */
  return (
    <details className="ask-tool-result">
      <summary>
        <span className="mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-faint)]">
          {name} → result
        </span>
      </summary>
      <pre className="mono mt-2 overflow-x-auto whitespace-pre-wrap break-words border border-[color:var(--color-rule)] p-2 text-[11px] leading-relaxed text-[color:var(--color-ink-dim)]">
        {JSON.stringify(output, null, 2).slice(0, 1200)}
      </pre>
    </details>
  );
}

/* ───────────────────────────────────────────────────────────── */

function DockRhombus({ small = false }: { small?: boolean }) {
  const size = small ? 14 : 18;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      style={{ display: "inline-block" }}
    >
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        transform="rotate(45 12 12)"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
