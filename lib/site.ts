export const SITE = {
  name: "SIscope",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://siscope.app",
  tagline: "See which AI is best, at a glance.",
  description:
    "Free, independent AI model and agent tracker. Top picks, human-vote scores, benchmarks and prices in plain words, with every number linked to its source.",
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
