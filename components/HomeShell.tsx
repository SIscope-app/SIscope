"use client";
import { useEffect, useState } from "react";
import { Scatter } from "./ClientCharts";
import type { ScatterPt } from "./Scatter";
import Link from "next/link";
import { SectionHead } from "./rows";
import { tieWithPrevious } from "@/lib/trust";
import { fmtPrice } from "@/lib/format";
import { Avatar, OpenTag } from "./Avatar";

type F = "all" | "open" | "closed";

export function FilterSeg({ value, onChange, size }: { value: F; onChange: (f: F) => void; size?: "sm" }) {
  return (
    <div className={`seg ${size ?? ""}`} role="group" aria-label="Show open or closed models">
      {(["all", "open", "closed"] as F[]).map((f) => (
        <button key={f} aria-pressed={value === f} onClick={() => onChange(f)}>
          {f === "all" ? "All" : f === "open" ? "Open weights" : "Closed"}
        </button>
      ))}
    </div>
  );
}

export type TopItem = { slug: string; name: string; base: string; variant: string | null; org: string; open: boolean; si: number; price: string | null; measured: string; lo: number | null; hi: number | null };

/** Compact top-10: rank, provider, name, score bar, score, blended price. */
function chartNote(pts: ScatterPt[], scored: number, priced: number): string {
  const ymin = pts.length ? Math.floor((Math.min(...pts.map((p) => p.y)) - 2) / 5) * 5 : 0;
  const cap = pts.length < priced ? ` The chart keeps the ${pts.length} highest scores that have a list price.` : "";
  return `Showing ${pts.length} of ${scored} scored models. ${priced} have a list price, so models without one are left off.${cap} The score axis starts at ${ymin}, not 0.`;
}

function ScoreTable({ pts }: { pts: ScatterPt[] }) {
  return (
    <div className="chart-fallback">
      <table>
        <caption>Same models as the chart</caption>
        <thead>
          <tr>
            <th>Model</th>
            <th>Weights</th>
            <th>Score</th>
            <th>Price per 1M</th>
          </tr>
        </thead>
        <tbody>
          {pts.map((p) => (
            <tr key={p.slug}>
              <td><Link href={`/models/${p.slug}`}>{p.name}</Link></td>
              <td>{p.open ? "Open" : "Closed"}</td>
              <td className="tnum">{p.y.toFixed(0)}</td>
              <td className="tnum">{fmtPrice(p.x)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopList({ items, ties }: { items: TopItem[]; ties: ReturnType<typeof tieWithPrevious> }) {
  const floor = 50;
  return (
    <div className="card t10">
      <div className="t10-h" aria-hidden="true">
        <span>#</span>
        <span>Model</span>
        <span className="t10-barh">Score, bar from 50</span>
        <span />
        <span>$ / 1M</span>
      </div>
      <ol>
        {items.map((it, i) => {
          const tie = ties[i];
          const w = Math.max(2, Math.min(100, ((it.si - floor) / (100 - floor)) * 100));
          return (
            <li key={it.slug}>
              <Link href={`/models/${it.slug}`} className="t10-r">
                <span className={`rk ${i === 0 ? "top" : ""}`}>{i + 1}</span>
                <span className="nm">
                  <Avatar org={it.org} />
                  <span className="n">{it.name}</span>
                  <OpenTag open={it.open} />
                  <span className="cov-n">{it.measured}</span>
                  {tie ? <span className="cov-n">{tie === "arena" ? "tied within margin" : "tied"}</span> : null}
                </span>
                <span className="t10-track">
                  <span className="barw t10-bar" aria-hidden="true">
                    <span className={`bar ${it.open ? "open" : ""}`} style={{ width: `${w.toFixed(1)}%` }} />
                  </span>
                  <span className="sc" aria-label={`SIscope score ${it.si.toFixed(0)}`}>{it.si.toFixed(0)}</span>
                  <span className={`t10-p ${it.price ? "" : "t10-unk"}`} title={it.price === "$0" ? "OpenRouter lists this at $0." : it.price ? it.price : "Not listed on OpenRouter. Unknown is not free."}>
                    {it.price ?? "No list price"}
                  </span>
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
  quiet,
  gap,
  changes,
  changesSub,
  tasks,
  scatter,
  scored,
  priced,
  top,
}: {
  hero: React.ReactNode;
  taskChips: React.ReactNode;
  quiet: React.ReactNode;
  gap: React.ReactNode;
  changes: React.ReactNode;
  changesSub: string;
  tasks: React.ReactNode;
  scatter: ScatterPt[];
  scored: number;
  priced: number;
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
  const ties = tieWithPrevious(top10.map((t) => ({ score: t.si, lo: t.lo, hi: t.hi })));
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
              {f === "open" ? "Ten strongest open-weight scores" : f === "closed" ? "Ten strongest closed scores" : "Ten strongest scores"}
            </h2>
            <p className="sub">One setting per model. “No list price” means we have no public price. It does not mean the model is free.</p>
          </div>
          <FilterSeg value={f} onChange={set} size="sm" />
        </div>
        <TopList items={top10} ties={ties} />
        <div className="t10-foot">
          <span className="note" style={{ margin: 0 }}>Bars start at 50 so small gaps near the top stay visible.</span>
          <Link className="btn" href={f === "all" ? "/leaderboard" : `/leaderboard?show=${f}`}>
            See every model
          </Link>
        </div>
        {quiet}
      </section>
      <section className="section wrap" aria-labelledby="task-h">
        <SectionHead id="task-h" title="Pick by the job" sub="The leading model for each job, and the leading open-weight option." more={{ href: "/best", label: "All jobs" }} />
        {tasks}
      </section>
      <section className="section wrap" aria-labelledby="chg-h">
        <SectionHead id="chg-h" title="Since the last update" sub={changesSub} />
        {changes}
      </section>
      <section className="section wrap">
        <div className="grid2">
          <div className="card" style={{ padding: 20 }}>
            <div className="sh" style={{ marginBottom: 8 }}>
              <div>
                <h2 className="h2">Higher score, lower price</h2>
                <p className="sub">Left is cheaper. The dashed line joins the best score at each price.</p>
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
                Best score at that price
              </span>
            </div>
            <Scatter pts={scatter} filter={f} />
            <ScoreTable pts={scatter} />
            <p className="note">{chartNote(scatter, scored, priced)} Diamond is open weights, circle is closed.</p>
          </div>
          {gap}
        </div>
      </section>
    </>
  );
}
