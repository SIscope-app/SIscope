"use client";
import { useEffect, useState } from "react";
import { Scatter, type ScatterPt } from "./Scatter";
import Link from "next/link";
import { SectionHead } from "./rows";
import { Avatar, OpenTag, VariantChip } from "./Avatar";

type F = "all" | "open" | "closed";

export function FilterSeg({ value, onChange, size }: { value: F; onChange: (f: F) => void; size?: "sm" }) {
  return (
    <div className={`seg ${size ?? ""}`} role="group" aria-label="Show open or closed models">
      {(["all", "open", "closed"] as F[]).map((f) => (
        <button key={f} aria-pressed={value === f} onClick={() => onChange(f)}>
          {f === "all" ? "All models" : f === "open" ? "Open only" : "Closed only"}
        </button>
      ))}
    </div>
  );
}

export type TopItem = { slug: string; name: string; base: string; variant: string | null; org: string; open: boolean; si: number; price: string | null };

/** Compact top-10: rank, provider, name, score bar, score, blended price. */
function TopList({ items }: { items: TopItem[] }) {
  const floor = 50;
  return (
    <div className="card t10">
      <div className="t10-h" aria-hidden="true">
        <span>#</span>
        <span>Model</span>
        <span className="t10-barh">SIscope score</span>
        <span />
        <span>$ / 1M</span>
      </div>
      <ol>
        {items.map((it, i) => {
          const w = Math.max(2, Math.min(100, ((it.si - floor) / (100 - floor)) * 100));
          return (
            <li key={it.slug}>
              <Link href={`/models/${it.slug}`} className="t10-r">
                <span className={`rk ${i === 0 ? "top" : ""}`}>{i + 1}</span>
                <span className="nm">
                  <Avatar org={it.org} />
                  <span className="n" title={it.name}>{it.base}</span>
                  <VariantChip v={it.variant} />
                  <OpenTag open={it.open} />
                </span>
                <span className="barw t10-bar" aria-hidden="true">
                  <span className={`bar ${it.open ? "open" : ""}`} style={{ width: `${w.toFixed(1)}%` }} />
                </span>
                <span className="sc" aria-label={`SIscope score ${it.si.toFixed(0)}`}>{it.si.toFixed(0)}</span>
                <span className={`t10-p ${it.price ? "" : "t10-unk"}`} title={it.price === "$0" ? "OpenRouter lists this at $0 per 1M tokens." : it.price ? `${it.price} per 1M tokens, blended` : "Not listed on OpenRouter. Unknown is not free."}>
                  {it.price ?? "No list price"}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function HomeShell({
  hero,
  taskChips,
  gap,
  changes,
  changesSub,
  rankChart,
  tasks,
  scatter,
  top,
}: {
  hero: React.ReactNode;
  taskChips: React.ReactNode;
  gap: React.ReactNode;
  changes: React.ReactNode;
  changesSub: string;
  rankChart: React.ReactNode;
  tasks: React.ReactNode;
  scatter: ScatterPt[];
  top: TopItem[];
}) {
  const [f, setF] = useState<F>("all");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("show");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q === "open" || q === "closed") setF(q);
  }, []);
  const set = (v: F) => {
    setF(v);
    const u = new URL(window.location.href);
    if (v === "all") u.searchParams.delete("show");
    else u.searchParams.set("show", v);
    window.history.replaceState(null, "", u);
  };
  const top10 = top.filter((t) => f === "all" || (f === "open" ? t.open : !t.open)).slice(0, 10);
  return (
    <>
      <section className="hero wrap" aria-label="Best models right now">
        {hero}
        {taskChips}
      </section>
      <section className="section wrap" aria-labelledby="top-h">
        <div className="sh">
          <div>
            <h2 className="h2" id="top-h">
              {f === "open" ? "Top 10 open models" : f === "closed" ? "Top 10 closed models" : "Top 10 at a glance"}
            </h2>
            <p className="sub">Best-scoring setting of each model. “No list price” means not listed, not free.</p>
          </div>
          <FilterSeg value={f} onChange={set} size="sm" />
        </div>
        <TopList items={top10} />
        <div className="t10-foot">
          <span className="note" style={{ margin: 0 }}>Bars start at 50 so the gaps at the top are easy to see.</span>
          <Link className="btn" href={f === "all" ? "/leaderboard" : `/leaderboard?show=${f}`}>
            Full leaderboard →
          </Link>
        </div>
      </section>
      <section className="section wrap" aria-labelledby="task-h">
        <SectionHead id="task-h" title="Best for…" sub="The winner for each job, plus the best open option." more={{ href: "/best", label: "See all" }} />
        {tasks}
      </section>
      <section className="section wrap" aria-labelledby="chg-h">
        <SectionHead id="chg-h" title="What changed" sub={changesSub} />
        {changes}
      </section>
      <section className="section wrap">
        <div className="grid2">
          <div className="card" style={{ padding: 20 }}>
            <div className="sh" style={{ marginBottom: 8 }}>
              <div>
                <h2 className="h2">Smarts vs price</h2>
                <p className="sub">Up is smarter, left is cheaper. The dashed line links the best deals at each price.</p>
              </div>
            </div>
            <div className="legend" style={{ marginBottom: 6 }}>
              <span className="lg">
                <svg width="14" height="14" aria-hidden="true">
                  <circle cx="7" cy="7" r="6" fill="var(--c-closed)" />
                </svg>
                Closed
              </span>
              <span className="lg">
                <svg width="14" height="14" aria-hidden="true">
                  <rect x="2.5" y="2.5" width="9" height="9" transform="rotate(45 7 7)" fill="var(--c-open)" />
                </svg>
                Open weights
              </span>
              <span className="lg">
                <svg width="22" height="6" aria-hidden="true">
                  <line x1="0" y1="3" x2="22" y2="3" stroke="var(--muted)" strokeWidth="2" strokeDasharray="5 4" />
                </svg>
                Best deals
              </span>
            </div>
            <Scatter pts={scatter} filter={f} />
            <p className="note">
              Smarts: SIscope score. Price: OpenRouter list price, blended 3 parts input to 1 part output. Only models with both are shown ({scatter.length}).
            </p>
          </div>
          {gap}
        </div>
      </section>
      <section className="section wrap" aria-labelledby="rank-h">
        <SectionHead id="rank-h" title="Rank over time: today's top 8" sub="Where each of today's top 8 stood in blind human votes at each recent Arena update. Higher on the chart is better." />
        {rankChart}
      </section>
    </>
  );
}
