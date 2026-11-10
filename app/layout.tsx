import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav, Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PUBLISH } from "@/lib/data";
import { updatedLabel } from "@/lib/freshness";
import { SITE, og } from "@/lib/site";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "SIscope · See which AI is best, at a glance", template: "%s · SIscope" },
  description: SITE.description,
  applicationName: "SIscope",
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" }, openGraph: og("/"),
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f141b" },
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeScript = `(function(){try{var q=new URLSearchParams(location.search).get('theme');var t=q||localStorage.getItem('theme');if(!t){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only">
          Skip to content
        </a>
        <Header updated={updatedLabel(PUBLISH.last_success_at)} updatedAt={PUBLISH.last_success_at} />
        <main id="main">{children}</main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
