/**
 * SiteHeader — sticky top bar with the Wordmark and primary nav.
 *
 * Sits above content via z-index. Picks up the same backdrop-blur
 * treatment as the main site so it reads as a letterbox masthead
 * rather than a solid panel.
 */
import Link from "next/link";
import Wordmark from "./Wordmark";

const NAV = [
  { href: "/ask", label: "Ask" },
  { href: "/playground", label: "Playground" },
  { href: "/compare", label: "Compare" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Wordmark />
        <nav aria-label="Primary">
          <ul className="flex items-center gap-7">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  data-magnetic
                  className="mono text-xs uppercase tracking-[0.18em] text-[var(--color-ink-dim)] transition-colors hover:text-[var(--color-accent)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
