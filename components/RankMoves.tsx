import Link from "next/link";
import type { HistPoint } from "@/lib/types";

export type RankMove = { slug: string; name: string; points: HistPoint[] };

const fmtDay = (s: string) => new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function story(points: HistPoint[]): { text: string; tone: "up" | "down" | "flat" | "new" } {
  const rank = points[points.length - 1][2];
  if (points.length < 2) return { text: `First listed at #${rank}`, tone: "new" };
  const from = points[0][2];
  if (from === rank) return { text: `Held #${rank}`, tone: "flat" };
  return from > rank ? { text: `#${from} to #${rank}`, tone: "up" } : { text: `#${from} to #${rank}`, tone: "down" };
}

function spark(points: HistPoint[], bot: number) {
  const W = 168;
  const H = 36;
  const pad = 4;
  const n = Math.max(points.length - 1, 1);
  const x = (i: number) => (points.length < 2 ? W - pad : pad + (i / n) * (W - pad * 2));
  const y = (rank: number) => pad + ((Math.min(rank, bot) - 1) / Math.max(bot - 1, 1)) * (H - pad * 2);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p[2]).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return { W, H, d, cx: x(points.length - 1).toFixed(1), cy: y(last[2]).toFixed(1), single: points.length < 2 };
}

/** One row per model: a rank sparkline and the place it holds now. Place 1 is the top. */
export function RankMoves({ rows, dates }: { rows: RankMove[]; dates: string[] }) {
  const seen = rows.flatMap((r) => r.points.map((p) => p[2]));
  const bot = Math.max(8, ...seen, 1);
  const from = dates[0];
  const to = dates[dates.length - 1];
  return (
    <div className="card moves-card">
      <ol className="moves">
        {rows.map((row) => {
          const pts = row.points.filter((p) => dates.includes(p[0]));
          const use = pts.length ? pts : row.points;
          if (!use.length) return null;
          const s = story(use);
          const g = spark(use, bot);
          return (
            <li key={row.slug}>
              <Link href={`/models/${row.slug}`} className="move">
                <span className="move-name">{row.name}</span>
                <svg viewBox={`0 0 ${g.W} ${g.H}`} className="move-line" role="img" aria-hidden="true">
                  <line x1="4" x2={g.W - 4} y1="4" y2="4" stroke="var(--line)" />
                  {g.single ? null : <path d={g.d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                  <circle cx={g.cx} cy={g.cy} r="3.5" fill="var(--accent)" stroke="var(--card)" strokeWidth="1.5" />
                </svg>
                <span className={`move-now tone-${s.tone}`}>{s.text}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      <table className="sr-only">
        <caption>
          Arena text rank from {from ? fmtDay(from) : "the first update"} to {to ? fmtDay(to) : "the latest update"}. Rank 1 is the top of that board.
        </caption>
        <thead>
          <tr>
            <th>Model</th>
            <th>Earlier rank</th>
            <th>Latest rank</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const use = row.points.filter((p) => dates.includes(p[0]));
            const pts = use.length ? use : row.points;
            if (!pts.length) return null;
            return (
              <tr key={row.slug}>
                <td>{row.name}</td>
                <td>{pts.length < 2 ? "First listing" : `#${pts[0][2]}`}</td>
                <td>#{pts[pts.length - 1][2]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {from && to ? (
        <p className="note">
          Each line is Arena text rank, from {fmtDay(from)} to {fmtDay(to)}. The top edge is place 1. A line starts when that model first appears on the board.
        </p>
      ) : null}
    </div>
  );
}
