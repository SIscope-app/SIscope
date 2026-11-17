"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { fmtPrice } from "@/lib/format";
import { LIVE_TASKS } from "@/lib/task-meta";

type Row = {
  slug: string;
  name: string;
  base: string;
  variant: string | null;
  open: boolean;
  si: number | null;
  price: number | null;
  tasks: Record<string, number | null>;
};

function label(row: Row): string {
  return row.variant ? `${row.base} (${row.variant})` : row.base;
}

export function Picker({ models }: { models: Row[] }) {
  const [task, setTask] = useState("overall");
  const [cap, setCap] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const result = useMemo(() => {
    const maxPrice = cap ? Number(cap) : null;
    const spec = LIVE_TASKS.find((t) => t.slug === task);
    const rows = models
      .filter((m) => (openOnly ? m.open : true) && (maxPrice == null || (m.price != null && m.price <= maxPrice)))
      .map((m) => ({ m, v: task === "overall" ? m.si : (m.tasks[task] ?? null) }))
      .filter((x): x is { m: Row; v: number } => x.v != null)
      .sort((a, b) => b.v - a.v || (b.m.si ?? 0) - (a.m.si ?? 0));
    return { rows, spec };
  }, [models, task, cap, openOnly]);
  const [primary, ...alts] = result.rows;
  const metric = result.spec?.metric ?? "SIscope score";
  const show = (v: number) => (result.spec?.scale === "elo" ? String(Math.round(v)) : v.toFixed(0));
  const line = (row: { m: Row; v: number }, why: string) =>
    `${why} ${metric} ${show(row.v)}, ${row.m.price == null ? "no list price" : `${fmtPrice(row.m.price)} per 1M`}, ${row.m.open ? "open weights" : "closed weights"}.`;

  return (
    <div className="card" style={{ padding: 20, display: "grid", gap: 16 }}>
      <div className="filters">
        <label style={{ display: "grid", gap: 4, fontSize: 12.5, color: "var(--muted)", fontWeight: 560 }}>
          Job
          <select className="select" value={task} onChange={(e) => setTask(e.target.value)} aria-label="Job">
            <option value="overall">Overall score</option>
            {LIVE_TASKS.filter((t) => t.slug !== "open" && t.slug !== "cheap").map((t) => (
              <option key={t.slug} value={t.slug}>{t.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 12.5, color: "var(--muted)", fontWeight: 560 }}>
          Budget cap
          <select className="select" value={cap} onChange={(e) => setCap(e.target.value)} aria-label="Budget cap">
            <option value="">Any list price</option>
            <option value="1">Under $1 per 1M</option>
            <option value="3">Under $3 per 1M</option>
            <option value="10">Under $10 per 1M</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "end", gap: 8, fontSize: 14, minHeight: 44 }}>
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /> Open weights only
        </label>
      </div>
      {!primary ? (
        <p className="note" style={{ margin: 0 }}>No model in this snapshot matches that job, budget, and weight rule.</p>
      ) : (
        <>
          <article>
            <div className="eyebrow">Recommendation</div>
            <Link href={`/models/${primary.m.slug}`} className="decide-name">{label(primary.m)}</Link>
            <p className="sub">{line(primary, "Highest measured result inside the filters.")}</p>
          </article>
          {alts.slice(0, 2).length > 0 && (
            <div>
              <div className="eyebrow">Alternatives</div>
              <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
                {alts.slice(0, 2).map((row, i) => (
                  <li key={row.m.slug}>
                    <Link href={`/models/${row.m.slug}`} className="link">{label(row.m)}</Link>
                    <p className="sub" style={{ margin: "2px 0 0" }}>{line(row, i === 0 ? "Next measured result inside the same filters." : "Third measured result inside the same filters.")}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
