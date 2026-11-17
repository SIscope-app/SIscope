import type { Metadata } from "next";
import Link from "next/link";
import { GapChart } from "@/components/charts";
import { RankMoves } from "@/components/RankMoves";
import { CHANGES, allModels, textRanked } from "@/lib/data";
import { fmtDate, shownGap } from "@/lib/format";
import { ARENA_BOARD_URL } from "@/lib/links";
import { og } from "@/lib/site";

export const metadata: Metadata = {
  title: "Trends",
  description: "How the Arena text gap between open and closed models moved, and how the top chat ranks shifted.",
  alternates: { canonical: "/trends" },
  openGraph: og("/trends"),
};

export default function Page() {
  const gap = CHANGES.gap;
  const g1 = gap[gap.length - 1];
  const g0 = gap[0];
  const gapNow = shownGap(g1.closed, g1.open);
  const gapThen = shownGap(g0.closed, g0.open);
  const seen = new Set<string>();
  const top8 = textRanked()
    .filter((m) => (seen.has(m.base) ? false : (seen.add(m.base), true)))
    .slice(0, 8);
  const allDates = [...new Set(allModels().flatMap((m) => (m.history.text ?? []).map((p) => p[0])))].sort();
  const firstTop = top8.flatMap((m) => (m.history.text ?? []).map((p) => p[0])).sort()[0] ?? allDates[0];
  const histDates = allDates.filter((d) => d >= firstTop);

  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Trends</div>
        <h1 className="h1" style={{ marginTop: 8 }}>How the boards moved</h1>
        <p className="lede">Two Arena text charts. They are not the SIscope score. <Link href="/">Back to the picks</Link></p>
      </div>
      <section className="section" style={{ marginTop: 8 }}>
        <div className="card" style={{ padding: 20 }}>
          <h2 className="h2">Open weights versus closed</h2>
          <p className="sub">Gap between the leading open-weight model and the leading closed model on Arena text scores.</p>
          <div className="big" style={{ margin: "6px 0 2px" }}>
            <b>{gapNow} pts</b>
            <span>gap today · {gapThen} pts on {fmtDate(g0.d)}</span>
          </div>
          <GapChart points={gap} />
          <div className="legend">
            <span className="lg">Top closed: {g1.closed_name.replace(/ \(.*\)$/, "")} ({Math.round(g1.closed)})</span>
            <span className="lg">Top open in votes: {g1.open_name.replace(/ \(.*\)$/, "")} ({Math.round(g1.open)})</span>
          </div>
          <p className="note">
            The displayed gap is {Math.round(g1.closed)} minus {Math.round(g1.open)}. A job page’s open pick uses that job’s measure. The homepage’s highest open-weight score uses the full SIscope score.
          </p>
        </div>
      </section>
      <section className="section">
        <h2 className="h2">How Arena text ranks shifted</h2>
        <p className="sub">Eight model families at the top of today’s chat-vote board. The top edge of each line is place 1.</p>
        <RankMoves dates={histDates} rows={top8.map((m) => ({ slug: m.slug, name: m.variant ? `${m.base} (${m.variant})` : m.base, points: m.history.text ?? [] }))} />
        <p className="note">
          Source: <a className="link" href={ARENA_BOARD_URL.text} rel="noopener">Arena text board</a>. One row per model family, using the setting that ranks highest today.
        </p>
      </section>
    </div>
  );
}
