import type { Metadata } from "next";
import Link from "next/link";
import { ChangeBoard } from "@/components/ChangeBoard";
import { CHANGES, ensureData } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { changeRangeLabel, materialChanges, priceChangeCopy } from "@/lib/home-layout";
import { og } from "@/lib/site";

export const metadata: Metadata = {
  title: "What changed",
  description: "Rank moves, new board entries, and new list prices since the previous Arena update.",
  alternates: { canonical: "/changes", types: { "application/atom+xml": "/feed.xml" } },
  openGraph: og("/changes"),
};

export default async function Page() {
  await ensureData();
  const items = materialChanges(CHANGES.changes, CHANGES.gap);
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Changes</div>
        <h1 className="h1" style={{ marginTop: 8 }}>What changed</h1>
        <p className="lede">
          {changeRangeLabel(items, (d) => fmtDate(d))} <Link href="/feed.xml">Atom feed</Link>
        </p>
      </div>
      <ChangeBoard>
        {items.map((c, i) => {
          const price = c.kind === "price_new" || c.kind === "price_cut" ? priceChangeCopy(c.sub) : null;
          const inner = (
            <span className="chg-body">
              <span className="t">{price ? (c.model ?? c.text) : c.text}</span>
              {price ? <span className="chg-price">{price.headline}</span> : <span className="s">{c.sub}</span>}
              <span className="s chg-meta">{fmtDate(c.date)} · {c.source === "openrouter" ? "OpenRouter" : c.board === "webdev" ? "Arena WebDev" : "Arena text"}</span>
            </span>
          );
          return c.slug ? (
            <Link key={i} href={`/models/${c.slug}`} className="card chg">{inner}</Link>
          ) : (
            <div key={i} className="card chg">{inner}</div>
          );
        })}
      </ChangeBoard>
    </div>
  );
}
