import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { geistMono, instrumentSerif, spaceGrotesk } from "@/lib/fonts";
import Cursor from "@/components/Cursor";
import Grain from "@/components/Grain";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

/* Render Inspector — dev-mode overlay. Conditional dynamic import
 * with ssr:false so the production bundle does not include any of
 * the inspector code. In dev the toggle UI mounts; in production
 * the component constant is null and the JSX below renders nothing. */
const RenderInspector =
  process.env.NODE_ENV === "production"
    ? null
    : dynamic(() =>
        import("@/components/inspector/RenderInspector").then(
          (m) => m.RenderInspector,
        ),
      );

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
      <body className="min-h-screen w-full overflow-x-hidden">
        <Grain />
        <Cursor />
        <SiteHeader />
        {children}
        {RenderInspector ? <RenderInspector /> : null}
      </body>
    </html>
  );
}
