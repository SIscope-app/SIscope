"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fmtPrice, fmtPriceExact } from "@/lib/format";
import { orgName } from "@/lib/orgs";

/** Two decimal places so the server attribute and the hydrated number stringify the same. */
function px(v: number): number {
  return Math.round(v * 100) / 100;
}

export type ScatterPt = { slug: string; name: string; base: string; variant?: string | null; org: string; open: boolean; x: number; y: number; xin: number; xout: number };

export function Scatter({ pts, filter, yLabel = "SIscope score" }: { pts: ScatterPt[]; filter: "all" | "open" | "closed"; yLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(680);
  const [tip, setTip] = useState<{ p: ScatterPt; x: number; y: number } | null>(null);
  const router = useRouter();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.round(el.getBoundingClientRect().width) || 680));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = W < 520;
  const H = Math.round(narrow ? W * 0.95 : W * 0.56);
  const m = { l: narrow ? 40 : 52, r: 14, t: 18, b: 46 };
  const xsVals = pts.map((p) => p.x);
  const xmin = Math.max(0.02, Math.min(...xsVals) * 0.8),
    xmax = Math.max(...xsVals) * 1.25;
  const lx = (v: number) => px(m.l + ((Math.log10(v) - Math.log10(xmin)) / (Math.log10(xmax) - Math.log10(xmin))) * (W - m.l - m.r));
  const yv = pts.map((p) => p.y);
  const ymin = Math.floor((Math.min(...yv) - 2) / 5) * 5,
    ymax = 100;
  const ly = (v: number) => px(m.t + (1 - (v - ymin) / (ymax - ymin)) * (H - m.t - m.b));
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  const fr: ScatterPt[] = [];
  let best = -1;
  for (const p of sorted)
    if (p.y > best) {
      best = p.y;
      fr.push(p);
    }
  const show = (p: ScatterPt) => filter === "all" || (filter === "open" ? p.open : !p.open);
  const allTicks = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50];
  const ticks = allTicks.filter((t) => t >= xmin && t <= xmax).filter((_, i) => !narrow || i % 2 === 0);
  const yt: number[] = [];
  for (let v = ymin; v <= ymax; v += narrow ? 10 : 5) yt.push(v);
  const cands = [fr[fr.length - 1], pts.filter((p) => p.open).sort((a, b) => b.y - a.y)[0], fr[0], ...(narrow ? [] : [fr[Math.floor(fr.length / 2)]])].filter(Boolean) as ScatterPt[];
  const placed: { x: number; y: number }[] = [];
  const labelSet = new Set<string>();
  for (const p of cands) {
    if (!show(p) || labelSet.has(p.slug)) continue;
    const x = lx(p.x), y = ly(p.y);
    if (placed.some((q) => Math.abs(q.y - y) < 22 && Math.abs(q.x - x) < 150)) continue;
    placed.push({ x, y });
    labelSet.add(p.slug);
  }
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`Scatter chart: ${yLabel} against price`} onMouseLeave={() => setTip(null)}>
        {yt.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={ly(v)} y2={ly(v)} stroke="var(--line)" />
            <text x={m.l - 8} y={px(ly(v) + 4)} textAnchor="end" fill="var(--faint)" fontSize={12}>
              {v}
            </text>
          </g>
        ))}
        {ticks.map((t) => (
          <text key={t} x={lx(t)} y={H - m.b + 20} textAnchor="middle" fill="var(--faint)" fontSize={12}>
            {fmtPrice(t)}
          </text>
        ))}
        <text x={px((W + m.l) / 2)} y={H - 6} textAnchor="middle" fill="var(--muted)" fontSize={13}>
          {narrow ? "Price per 1M tokens →" : "List price per 1M tokens (3 in : 1 out, log scale) →"}
        </text>
        <text transform={`translate(13 ${px((H - m.b + m.t) / 2)}) rotate(-90)`} textAnchor="middle" fill="var(--muted)" fontSize={13}>
          Smarter →
        </text>
        <path d={fr.map((p, i) => (i ? "L" : "M") + lx(p.x) + " " + ly(p.y)).join(" ")} fill="none" stroke="var(--muted)" strokeWidth={2} strokeDasharray="5 4" opacity={0.75} />
        {pts.map((p) => {
          const x = lx(p.x),
            y = ly(p.y),
            on = fr.includes(p),
            r = on ? 7.5 : 6;
          const side = px(r * 1.6);
          const inset = px(r * 0.8);
          const c = p.open ? "var(--c-open)" : "var(--c-closed)";
          return (
            <g
              key={p.slug}
              opacity={show(p) ? 1 : "0.15"}
              style={{ cursor: "pointer", transition: "opacity .2s" }}
              onMouseMove={(e) => setTip({ p, x: e.clientX, y: e.clientY })}
              onClick={() => router.push(`/models/${p.slug}`)}
            >
              {p.open ? (
                <rect x={px(x - inset)} y={px(y - inset)} width={side} height={side} transform={`rotate(45 ${x} ${y})`} fill={c} stroke="var(--card)" strokeWidth={2} />
              ) : (
                <circle cx={x} cy={y} r={r} fill={c} stroke="var(--card)" strokeWidth={2} />
              )}
              <circle cx={x} cy={y} r={14} fill="transparent" />
            </g>
          );
        })}
        {pts
          .filter((p) => labelSet.has(p.slug))
          .map((p) => {
            const x = lx(p.x),
              y = ly(p.y);
            const anchor = x > W - 170 ? "end" : "start";
            const below = y < m.t + 24;
            return (
              <text key={"l" + p.slug} x={px(anchor === "end" ? x - 12 : x + 12)} y={px(below ? y + 18 : y - 10)} textAnchor={anchor} fill="var(--text)" fontSize={12.5} fontWeight={620} style={{ pointerEvents: "none", paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 4 }}>
                {labelSet.size > 0 && [...labelSet].filter((s) => pts.find((q) => q.slug === s)?.base === p.base).length > 1 && p.variant ? `${p.base} ${p.variant}` : p.base}
              </text>
            );
          })}
      </svg>
      {tip && (
        <div className="tip" style={{ left: Math.min(tip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 270), top: tip.y + 14 }}>
          <b style={{ display: "block", fontSize: 15 }}>{tip.p.name}</b>
          <span style={{ color: "var(--muted)" }}>
            {orgName(tip.p.org)} · {tip.p.open ? "Open weights" : "Closed"}
          </span>
          <br />
          {yLabel} <b>{tip.p.y.toFixed(0)}</b>
          <br />
          {fmtPriceExact(tip.p.xin)} in · {fmtPriceExact(tip.p.xout)} out per 1M tokens
          <div style={{ color: "var(--faint)", fontSize: 12, marginTop: 4 }}>Price: OpenRouter list price</div>
        </div>
      )}
    </div>
  );
}
