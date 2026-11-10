import type { Metadata } from "next";
import { CostCalc } from "@/components/CostCalc";
import { allModels, siRanked, slim, sourceById } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { og } from "@/lib/site";

export const metadata: Metadata = {
  title: "Monthly token cost",
  description: "Estimate a month of tokens from OpenRouter list prices. The link keeps the models and the mix you chose.",
  alternates: { canonical: "/tools/cost" }, openGraph: og("/tools/cost"),
};

export default function Page() {
  const priced = allModels().filter((m) => m.price);
  const ranked = siRanked().filter((m) => m.price);
  const seen = new Set<string>();
  const defaults = ranked.filter((m) => (seen.has(m.base) ? false : (seen.add(m.base), true))).slice(0, 10).map((m) => m.slug);
  const list = [...ranked, ...priced.filter((m) => m.si == null).sort((a, b) => a.name.localeCompare(b.name))];
  const or = sourceById("openrouter");
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Cost calculator</div>
        <h1 className="h1" style={{ marginTop: 8 }}>Price a month of use</h1>
        <p className="lede">Set a monthly token count and how much of it is input. Prices are OpenRouter list prices as of {fmtDate(or.as_of)}.</p>
      </div>
      <CostCalc models={list.map(slim)} defaults={defaults} />
    </div>
  );
}
