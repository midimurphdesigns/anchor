/**
 * Wordmark — the anchor name in Migra italic (Instrument Serif italic
 * fallback). Sits in the top-left of the header on every page.
 *
 * Single tight wordmark — anchor doesn't carry a logo mark separately
 * from its name. The lowercase 'a' tightens to -0.04em letter-spacing
 * to read as a wordmark (one shape), not a sentence-cased word.
 */
import Link from "next/link";

export default function Wordmark() {
  return (
    <Link
      href="/"
      data-magnetic
      className="wordmark"
      aria-label="anchor home"
    >
      anchor.
    </Link>
  );
}
