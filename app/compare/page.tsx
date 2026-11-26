import { og } from "@/lib/site";
import type { Metadata } from "next";
import { Compare } from "@/components/Compare";
import { buildDecisions } from "@/lib/decisions";
import { EPOCH_BENCHMARKS, allModels, ensureData, siRanked, slim } from "@/lib/data";

export const metadata: Metadata = {
  title: "Compare models",
  description: "Set two to four settings side by side. Score, Arena place, written tests, list price, and context. The link keeps the comparison.",
  alternates: { canonical: "/compare" }, openGraph: og("/compare"),
};

const BENCH_ORDER = ["swe_bench_verified", "gpqa_diamond", "frontiermath", "otis_mock_aime", "simpleqa_verified"];

export default async function Page() {
  await ensureData();
  const ranked = siRanked();
  const rest = allModels().filter((m) => m.si == null && (m.arena.text || m.epoch.length || m.price)).sort((a, b) => a.name.localeCompare(b.name));
  const list = [...ranked, ...rest];
  const picks = buildDecisions(ranked);
  const defaults = picks.compareSlugs.length >= 2 ? picks.compareSlugs : [...picks.compareSlugs, ranked.find((m) => !picks.compareSlugs.includes(m.slug))!.slug];
  const benches = BENCH_ORDER.filter((k) => EPOCH_BENCHMARKS[k]).map((k) => ({ id: k, label: EPOCH_BENCHMARKS[k].label, description: EPOCH_BENCHMARKS[k].description }));
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Compare</div>
        <h1 className="h1" style={{ marginTop: 8 }}>Compare the settings</h1>
        <p className="lede">Two to four settings, from the same public data. The page opens on the homepage picks. The link keeps your choice.</p>
      </div>
      <Compare models={list.map(slim)} defaults={defaults} benches={benches} />
    </div>
  );
}
