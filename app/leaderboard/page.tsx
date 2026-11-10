import type { Metadata } from "next";
import { Leaderboard } from "@/components/Leaderboard";
import { JsonLd } from "@/components/JsonLd";
import { allModels, slim, siRanked } from "@/lib/data";
import { SCORE_VERSION } from "@/lib/score";
import { SITE, og } from "@/lib/site";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Model ranking",
  description: "Rank models by SIscope score, Arena place, category, list price or context window. Filter by open weights, provider and price, then share the link.",
  alternates: { canonical: "/leaderboard" }, openGraph: og("/leaderboard"),
};

export default function Page() {
  const list = allModels().filter((m) => m.si != null || m.arena.text || m.price);
  const counts = new Map<string, number>();
  for (const m of list) counts.set(m.org, (counts.get(m.org) ?? 0) + 1);
  const orgs = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n }));
  const sorted = [...list].sort((a, b) => (b.si ?? -1) - (a.si ?? -1));
  const top = siRanked().slice(0, 10);
  return (
    <div className="wrap">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "SIscope AI model leaderboard",
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          itemListElement: top.map((m, i) => ({ "@type": "ListItem", position: i + 1, name: m.name, url: `${SITE.url}/models/${m.slug}` })),
        }}
      />
      <div className="page-head">
        <div className="eyebrow">Leaderboard</div>
        <h1 className="h1" style={{ marginTop: 8 }}>The full ranking</h1>
        <p className="lede">
          Sort, filter, and keep the link. Score v{SCORE_VERSION}. <Link className="link" href="/methodology">How the score is built</Link>.
        </p>
      </div>
      <Leaderboard models={sorted.map(slim)} orgs={orgs} />
    </div>
  );
}
