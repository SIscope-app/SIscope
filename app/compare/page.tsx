import { og } from "@/lib/site";
import type { Metadata } from "next";
import { Compare } from "@/components/Compare";
import { buildDecisions } from "@/lib/decisions";
import { EPOCH_BENCHMARKS, allModels, siRanked, slim } from "@/lib/data";

export const metadata: Metadata = {
  title: "Compare AI models side by side",
  description: "Pick two to four AI models and compare their SIscope score, Arena votes, Epoch AI test results, price and context window at a glance.",
  alternates: { canonical: "/compare" }, openGraph: og("/compare"),
};

const BENCH_ORDER = ["swe_bench_verified", "gpqa_diamond", "frontiermath", "otis_mock_aime", "simpleqa_verified"];

export default function Page() {
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
        <h1 className="h1" style={{ marginTop: 8 }}>Compare models side by side</h1>
        <p className="lede">Pick two to four. We start with the best overall setting, the best coding setting, and the best value when those are different models. The address bar keeps your picks, including back and forward.</p>
      </div>
      <Compare models={list.map(slim)} defaults={defaults} benches={benches} />
    </div>
  );
}
