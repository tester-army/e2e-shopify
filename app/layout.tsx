import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@/styles/e2e.css";

import { SiteHeader } from "@/components/site-header";

const display = localFont({
  src: "./fonts/stack-sans-notch-latin-wght-normal.woff2",
  variable: "--e2e-font-display",
  weight: "100 900",
  display: "swap",
});

const sans = localFont({
  src: "./fonts/inter-latin-standard-normal.woff2",
  variable: "--e2e-font-sans",
  weight: "100 900",
  display: "swap",
});

const mono = localFont({
  src: [
    { path: "./fonts/dm-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/dm-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--e2e-font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "e2e Shopify checkout",
  description: "Shopify's hosted checkout, tested end to end with e2e.",
  icons: {
    icon: [
      { url: "/e2e/favicon-black.png", media: "(prefers-color-scheme: light)" },
      { url: "/e2e/favicon-white.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="e2e flex min-h-dvh flex-col">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
