// Small, dependency-free SVG charts. Server-safe (no hooks).
import { CATEGORIES, type CategoryScores } from "@/lib/score";

export function Sparkline({ values, color = "var(--accent)", height = 36, label }: { values: number[]; color?: string; height?: number; label?: string }) {
  if (!values || values.length < 2)
    return (
      <div style={{ height, display: "flex", alignItems: "center" }} className="nodata">
        New on the board, no trend yet
      </div>
    );
  const W = 200,
    H = height;
  const mn = Math.min(...values),
    mx = Math.max(...values),
    r = mx - mn || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (W - 6) + 3, H - 4 - ((v - mn) / r) * (H - 10)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label={label ?? "trend"}>
      <path d={`${d} L${W - 3} ${H} L3 ${H}Z`} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3.2} fill={color} />
    </svg>
  );
}

/** Six tiny vertical bars, one per category: a model's "fingerprint". */
export function MiniBars({ cats, height = 36, color = "var(--accent)" }: { cats: CategoryScores; height?: number; color?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${CATEGORIES.length}, 1fr)`, gap: 5, alignItems: "end", height }} aria-label="Category scores">
      {CATEGORIES.map((c) => {
        const v = cats[c.id];
        return (
          <div key={c.id} title={`${c.label}: ${v == null ? "no data yet" : Math.round(v)}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, height: "100%", justifyContent: "flex-end" }}>
            <div
              style={{
                width: "100%",
                height: v == null ? 3 : `${Math.max(8, v * 0.78)}%`,
                borderRadius: 4,
                background: v == null ? "var(--line2)" : color,
                opacity: v == null ? 1 : 0.35 + (v / 100) * 0.65,
              }}
            />
            <span style={{ fontSize: 11, color: "var(--faint)", lineHeight: 1 }}>{c.short.slice(0, 3)}</span>
          </div>
        );
      })}
    </div>
  );
}

export type RadarSeries = { label: string; cats: CategoryScores; color: string; dashed?: boolean };

export function Radar({ series, size = 320, showLabels = true }: { series: RadarSeries[]; size?: number; showLabels?: boolean }) {
  const n = CATEGORIES.length;
  const cx = size / 2,
    cy = size / 2,
    R = size / 2 - (showLabels ? 64 : 10);
  const ang = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const pt = (i: number, v: number) => [cx + Math.cos(ang(i)) * R * (v / 100), cy + Math.sin(ang(i)) * R * (v / 100)];
  const rings = [25, 50, 75, 100];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: "block", margin: "0 auto", overflow: "visible" }} role="img" aria-label="Radar chart of category scores">
      {rings.map((r) => (
        <polygon key={r} points={CATEGORIES.map((_, i) => pt(i, r).join(",")).join(" ")} fill="none" stroke="var(--line)" strokeWidth={1} />
      ))}
      {CATEGORIES.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" />;
      })}
      {series.map((s, si) => {
        const known = CATEGORIES.map((c) => s.cats[c.id]);
        const poly = CATEGORIES.map((c, i) => pt(i, s.cats[c.id] ?? 0).join(",")).join(" ");
        return (
          <g key={si}>
            <polygon points={poly} fill={s.color} fillOpacity={series.length > 1 ? 0.1 : 0.18} stroke={s.color} strokeWidth={2.2} strokeDasharray={s.dashed ? "6 4" : undefined} strokeLinejoin="round" />
            {known.map((v, i) => {
              if (v == null) return null;
              const [x, y] = pt(i, v);
              return <circle key={i} cx={x} cy={y} r={3.6} fill={s.color} stroke="var(--card)" strokeWidth={1.5} />;
            })}
          </g>
        );
      })}
      {showLabels &&
        CATEGORIES.map((c, i) => {
          const [x, y] = pt(i, 122);
          const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
          const missing = series.length === 1 && series[0].cats[c.id] == null;
          return (
            <text key={c.id} x={x} y={y + 4} textAnchor={anchor} fontSize={12.5} fill={missing ? "var(--faint)" : "var(--muted)"} fontWeight={550}>
              {c.short}
              {missing ? (
                <tspan x={x} dy={14} fontSize={11.5} fontWeight={450}>
                  no data yet
                </tspan>
              ) : null}
            </text>
          );
        })}
    </svg>
  );
}

export function GapChart({ points, height = 170 }: { points: { d: string; closed: number; open: number }[]; height?: number }) {
  const W = 400,
    H = height,
    m = { l: 8, r: 8, t: 12, b: 26 };
  const mn = Math.min(...points.map((p) => p.open)) - 8,
    mx = Math.max(...points.map((p) => p.closed)) + 6;
  const xs = (i: number) => m.l + (i / (points.length - 1)) * (W - m.l - m.r);
  const ys = (v: number) => m.t + (1 - (v - mn) / (mx - mn)) * (H - m.t - m.b);
  const path = (k: "closed" | "open") => points.map((p, i) => (i ? "L" : "M") + xs(i).toFixed(1) + " " + ys(p[k]).toFixed(1)).join(" ");
  const area =
    points.map((p, i) => (i ? "L" : "M") + xs(i) + " " + ys(p.closed)).join(" ") +
    " " +
    [...points]
      .reverse()
      .map((p, j) => "L" + xs(points.length - 1 - j) + " " + ys(p.open))
      .join(" ") +
    "Z";
  const f = (s: string) => new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Best closed vs best open score over time">
      <path d={area} fill="var(--accent)" opacity={0.08} />
      <path d={path("closed")} fill="none" stroke="var(--c-closed)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <path d={path("open")} fill="none" stroke="var(--c-open)" strokeWidth={3} strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />
      <text x={m.l} y={H - 6} fill="var(--faint)" fontSize={12}>
        {f(points[0].d)}
      </text>
      <text x={W - m.r} y={H - 6} textAnchor="end" fill="var(--faint)" fontSize={12}>
        {f(points[points.length - 1].d)}
      </text>
    </svg>
  );
}

/** Vote score over time. The last point is labelled on the line. */
export function HistoryChart({ points, color = "var(--accent)", wide = false }: { points: [string, number, number][]; color?: string; wide?: boolean }) {
  if (points.length < 2) return <p className="nodata">One published score so far. The line appears after the next update.</p>;
  const W = wide ? 1100 : 640,
    H = wide ? 220 : 200,
    m = { l: 44, r: 48, t: 16, b: 28 };
  const vals = points.map((p) => p[1]);
  const mn = Math.floor((Math.min(...vals) - 4) / 5) * 5,
    mx = Math.ceil((Math.max(...vals) + 4) / 5) * 5;
  const xs = (i: number) => m.l + (i / (points.length - 1)) * (W - m.l - m.r);
  const ys = (v: number) => m.t + (1 - (v - mn) / (mx - mn || 1)) * (H - m.t - m.b);
  const d = points.map((p, i) => (i ? "L" : "M") + xs(i).toFixed(1) + " " + ys(p[1]).toFixed(1)).join(" ");
  const ticks = [mn, Math.round((mn + mx) / 2), mx];
  const f = (s: string) => new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const last = points[points.length - 1];
  const first = points[0];
  return (
    <figure className="chart-fig">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Vote score from ${Math.round(first[1])} to ${Math.round(last[1])}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={ys(t).toFixed(1)} y2={ys(t).toFixed(1)} stroke="var(--line)" />
            <text x={m.l - 8} y={(ys(t) + 4).toFixed(1)} textAnchor="end" fontSize={12} fill="var(--faint)">
              {t}
            </text>
          </g>
        ))}
        <path d={`${d} L${xs(points.length - 1).toFixed(1)} ${H - m.b} L${m.l} ${H - m.b}Z`} fill={color} opacity={0.1} />
        <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={xs(i).toFixed(1)} cy={ys(p[1]).toFixed(1)} r={i === points.length - 1 ? 4.5 : 2.6} fill={color} stroke="var(--card)" strokeWidth={1.5}>
            <title>{`${f(p[0])}: score ${Math.round(p[1])}, rank #${p[2]}`}</title>
          </circle>
        ))}
        <text x={(xs(points.length - 1) + 8).toFixed(1)} y={(ys(last[1]) + 4).toFixed(1)} fontSize={13} fontWeight={700} fill="var(--text)">
          {Math.round(last[1])}
        </text>
        <text x={m.l} y={H - 8} fontSize={12} fill="var(--faint)">
          {f(first[0])}
        </text>
        <text x={W - m.r} y={H - 8} fontSize={12} fill="var(--faint)" textAnchor="end">
          {f(last[0])}
        </text>
      </svg>
      <figcaption className="note">
        {f(first[0])} score {Math.round(first[1])} · {f(last[0])} score {Math.round(last[1])}
      </figcaption>
      <table className="sr-only">
        <caption>Vote score and rank at each update</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Score</th>
            <th>Rank</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p[0]}>
              <td>{f(p[0])}</td>
              <td>{Math.round(p[1])}</td>
              <td>#{p[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

const fmtShort = (s: string) => new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Place on one Arena board over time. Place 1 is the top of the chart. */
export function RankChart({ points, color = "var(--accent)", label = "Place on the board" }: { points: [string, number, number][]; color?: string; label?: string }) {
  if (!points.length) return null;
  if (points.length < 2) {
    return <p className="nodata">First listing on this board: #{points[0][2]} on {fmtShort(points[0][0])}.</p>;
  }
  const W = 640,
    H = 148,
    m = { l: 44, r: 44, t: 14, b: 26 };
  const ranks = points.map((p) => p[2]);
  const bot = Math.max(5, Math.ceil((Math.max(...ranks) + 2) / 5) * 5);
  const xs = (i: number) => m.l + (i / (points.length - 1)) * (W - m.l - m.r);
  const ys = (r: number) => m.t + ((r - 1) / (bot - 1)) * (H - m.t - m.b);
  const d = points.map((p, i) => (i ? "L" : "M") + xs(i).toFixed(1) + " " + ys(p[2]).toFixed(1)).join(" ");
  const ticks = [1, Math.round((1 + bot) / 2), bot];
  const last = ranks[ranks.length - 1];
  const first = ranks[0];
  return (
    <figure className="chart-fig">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${label}: #${first} then #${last}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={ys(t).toFixed(1)} y2={ys(t).toFixed(1)} stroke="var(--line)" />
            <text x={m.l - 8} y={(ys(t) + 4).toFixed(1)} textAnchor="end" fontSize={12} fill="var(--faint)">
              #{t}
            </text>
          </g>
        ))}
        <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={xs(i).toFixed(1)} cy={ys(p[2]).toFixed(1)} r={i === points.length - 1 ? 4.5 : 2.6} fill={color} stroke="var(--card)" strokeWidth={1.5}>
            <title>{`${fmtShort(p[0])}: #${p[2]}`}</title>
          </circle>
        ))}
        <text x={(xs(points.length - 1) + 8).toFixed(1)} y={(ys(last) + 4).toFixed(1)} fontSize={13} fontWeight={700} fill="var(--text)">
          #{last}
        </text>
        <text x={m.l} y={H - 6} fontSize={12} fill="var(--faint)">
          {fmtShort(points[0][0])}
        </text>
        <text x={W - m.r} y={H - 6} fontSize={12} fill="var(--faint)" textAnchor="end">
          {fmtShort(points[points.length - 1][0])}
        </text>
      </svg>
      <figcaption className="note">
        {first === last ? `Held #${last}` : `#${first} on ${fmtShort(points[0][0])}, #${last} on ${fmtShort(points[points.length - 1][0])}`}
      </figcaption>
    </figure>
  );
}

export const LINE_COLORS = ["#6ea8fe", "#3ddc97", "#f6c453", "#ff7b72", "#c297ff", "#4dd0e1", "#ff9f43", "#f78fb3"];

/** Rank over time for several models on one shared date axis (#1 at top). */
export function RankLines({ series, dates, maxRank = 30 }: { series: { label: string; color: string; points: [string, number, number][] }[]; dates: string[]; maxRank?: number }) {
  const W = 760,
    H = 280,
    m = { l: 40, r: 16, t: 14, b: 28 };
  const seen = series.flatMap((s) => s.points.map((p) => p[2]));
  const bot = Math.min(maxRank, Math.max(10, Math.ceil(Math.max(...seen, 1) / 5) * 5));
  const xi = new Map(dates.map((d, i) => [d, i]));
  const xs = (d: string) => m.l + ((xi.get(d) ?? 0) / Math.max(1, dates.length - 1)) * (W - m.l - m.r);
  const ys = (r: number) => m.t + ((Math.min(r, bot) - 1) / (bot - 1)) * (H - m.t - m.b);
  const ticks = [1, 5, 10, 20, 30].filter((t) => t <= bot);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Text arena rank over time for ${series.map((s) => s.label).join(", ")}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={ys(t)} y2={ys(t)} stroke="var(--line)" />
          <text x={m.l - 8} y={ys(t) + 4} textAnchor="end" fontSize={12} fill="var(--faint)">
            #{t}
          </text>
        </g>
      ))}
      {series.map((s) => {
        const pts = s.points.filter((p) => xi.has(p[0]));
        if (!pts.length) return null;
        const d = pts.map((p, i) => (i ? "L" : "M") + xs(p[0]).toFixed(1) + " " + ys(p[2]).toFixed(1)).join(" ");
        return (
          <g key={s.label}>
            <path d={d} fill="none" stroke={s.color} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" opacity={0.95} />
            {pts.map((p, i) => (
              <circle key={i} cx={xs(p[0])} cy={ys(p[2])} r={i === pts.length - 1 ? 4.2 : 2.4} fill={s.color} stroke="var(--card)" strokeWidth={1.2}>
                <title>{`${s.label}, ${fmtShort(p[0])}: #${p[2]}${p[2] > bot ? " (below chart)" : ""}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      <text x={m.l} y={H - 6} fontSize={12} fill="var(--faint)">
        {fmtShort(dates[0])}
      </text>
      <text x={W - m.r} y={H - 6} fontSize={12} fill="var(--faint)" textAnchor="end">
        {fmtShort(dates[dates.length - 1])}
      </text>
    </svg>
  );
}
