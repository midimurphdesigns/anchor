import { Space_Grotesk, Geist_Mono, Instrument_Serif } from "next/font/google";

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

/* Migra italic is the display tier on the main site. anchor falls
 * through to Instrument Serif italic so the brand reads consistent
 * across the trilogy subdomains without bundling the paid Migra
 * weights into every repo. */
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
  variable: "--font-instrument-serif",
});
