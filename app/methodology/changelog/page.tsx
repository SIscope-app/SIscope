import type { Metadata } from "next";
import Link from "next/link";
import { fmtDate } from "@/lib/format";
import { COVERAGE_GATE, SCORE_DATE, SCORE_VERSION } from "@/lib/score";
import { og } from "@/lib/site";

export const metadata: Metadata = {
  title: "Score changelog",
  description: "What changed in each SIscope score version. The current version is still the one on the methodology page.",
  alternates: { canonical: "/methodology/changelog" },
  openGraph: og("/methodology/changelog"),
};

export default function Page() {
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="crumbs"><Link href="/methodology">How we score</Link> / Changelog</div>
        <h1 className="h1" style={{ marginTop: 8 }}>Score changelog</h1>
        <p className="lede">One entry per score version. A site change that does not move a score is listed separately.</p>
      </div>
      <section className="prose">
        <h2>v{SCORE_VERSION}</h2>
        <p>{fmtDate(SCORE_DATE)}. Missing categories count at the model’s weakest measured category instead of being skipped. Epoch results attach only to an exact setting match. A score is shown when measured categories cover at least {Math.round(COVERAGE_GATE * 100)}% of the weight. MATH level 5, FrontierMath Tier 4, Chess Puzzles, and MirrorCode are shown on model pages and are not in this version.</p>
        <h2>v0.1.0</h2>
        <p>3 Nov 2026. First public version. Six categories, Arena and Epoch AI inputs, and the {Math.round(COVERAGE_GATE * 100)}% coverage rule.</p>
        <h2>Site updates that did not change the score</h2>
        <p>3 Nov 2026. Compare, leaderboard filters, coverage badges, rank charts, a cost calculator, and links from numbers to their sources.</p>
        <p><Link href="/methodology">Back to the method</Link></p>
      </section>
    </div>
  );
}
