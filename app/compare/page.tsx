import { og } from "@/lib/site";
import { bestValue } from "@/lib/tasks";
import type { Metadata } from "next";
import { Compare } from "@/components/Compare";
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
  const top = ranked[0];
  const open = ranked.find((m) => m.open)!;
  const cheap = bestValue(ranked, [open.base, top.base]);
  const defaults = [top.slug, open.slug, ...(cheap ? [cheap.slug] : [])];
  const benches = BENCH_ORDER.filter((k) => EPOCH_BENCHMARKS[k]).map((k) => ({ id: k, label: EPOCH_BENCHMARKS[k].label, description: EPOCH_BENCHMARKS[k].description }));
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Compare</div>
        <h1 className="h1" style={{ marginTop: 8 }}>Compare models side by side</h1>
        <p className="lede">Pick two to four. We start you with the smartest model, the best open one and the best cheap one. The link in your address bar keeps your picks.</p>
      </div>
      <Compare models={list.map(slim)} defaults={defaults} benches={benches} />
    </div>
  );
}
