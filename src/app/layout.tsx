import type { Metadata } from "next";
import { Geist_Mono, Allura, Poppins } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

/*
 * All fonts load through next/font, which self-hosts them at build time.
 *
 * Poppins and Allura used to come from `@import url(fonts.googleapis.com)` at
 * the top of globals.css. A CSS @import is render-blocking and chains — the
 * browser fetches globals.css, parses it, discovers two more stylesheets on
 * another origin, connects to it, fetches those, and only then requests the
 * actual font files. Lighthouse measured 905ms of render-blocking plus 309ms of
 * preconnect for the privilege.
 *
 * next/font emits no external request at all, and generates fallback metrics
 * (size-adjust) so swapping to the real font doesn't shift the layout — which
 * matters, because CLS here is 0 and needs to stay that way.
 *
 * Geist Sans was removed: it shipped 29KB of woff2 that nothing rendered (the
 * body font is Poppins). Geist Mono stays — three admin tables use font-mono.
 */
/*
 * Poppins is not a variable font — every weight is a separate file that gets
 * preloaded and competes with the hero image for bandwidth. So only load the
 * weights actually rendered:
 *   400  body default (--font-weight-normal)
 *   500  Tailwind `font-medium` (9 uses) and headings via --font-weight-medium
 *   600  --font-weight-medium in the other scope
 *   900  the two big wordmarks (Hero, AboutPage)
 * 700 and 800 came from the old Google Fonts @import and are used by nothing:
 * no font-bold class, no <strong>, no <b> anywhere in the codebase.
 * If you add a bold style, add the weight here or the browser fakes it.
 */
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "900"],
  display: "swap",
});

const allura = Allura({
  variable: "--font-allura",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// preload:false — Geist Mono is only used by `font-mono` in three admin tables,
// so preloading it on every storefront page spends the customer's bandwidth on
// a font they'll never see. It still loads normally when an admin page uses it.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Reverie Revival",
  description: "Reverie Revival storefront and brand experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${allura.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster position="top-right" theme="dark" richColors />
      </body>
    </html>
  );
}
