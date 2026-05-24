import type { Metadata, Viewport } from "next";
import { geistMono, instrumentSerif, spaceGrotesk } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "anchor — AI-native product catalog",
  description:
    "Every product has a human page AND an LLM-facing endpoint optimized for citation, discovery, and agent purchase. Live AEO dashboard. Build 3 of the trilogy.",
  metadataBase: new URL(
    process.env.ANCHOR_ORIGIN ?? "https://anchor.kevinmurphywebdev.com",
  ),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0A0B",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="min-h-screen w-full overflow-x-hidden">{children}</body>
    </html>
  );
}
