export const SITE = {
  name: "SIscope",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://siscope.app",
  tagline: "An independent ranking of AI models.",
  description:
    "Compare AI models by score, Arena rank, written tests and list price. No account. Missing results stay missing.",
};

/** Open Graph base for a page, so og:url matches its canonical path (Next replaces, not merges, openGraph). */
export function og(path: string) {
  return {
    type: "website" as const,
    siteName: SITE.name,
    locale: "en_US",
    url: path,
  };
}
