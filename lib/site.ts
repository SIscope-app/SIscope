export const SITE = {
  name: "SIscope",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://siscope.app",
  tagline: "An independent ranking of AI models.",
  description:
    "Compare AI models by score, Arena rank, written tests and list price. No account. Unmeasured results are shown as unmeasured, never as zero.",
};

/** Static image written by scripts/build-og.tsx. Pair and model pages have their own file. */
export function ogImage(path: string): string {
  if (path.startsWith("/models/")) return `/og/models/${path.slice("/models/".length)}.png`;
  if (path.startsWith("/compare/") && path !== "/compare") return `/og/compare/${path.slice("/compare/".length)}.png`;
  return "/og/home.png";
}

/** Open Graph base for a page, so og:url matches its canonical path (Next replaces, not merges, openGraph). */
export function og(path: string) {
  return {
    type: "website" as const,
    siteName: SITE.name,
    locale: "en_US",
    url: path,
    images: [{ url: ogImage(path), width: 1200, height: 630, alt: "SIscope" }],
  };
}
