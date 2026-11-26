import { og } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { BarRows } from "@/components/rows";
import { AGENTS, allModels, builtAt, ensureData, sourceById } from "@/lib/data";
import { fmtDate, fmtInt } from "@/lib/format";
import { STALE_AFTER_DAYS } from "@/lib/score";

function olderThan90(date: string): boolean {
  const now = Date.parse(builtAt());
  const then = Date.parse(date.length <= 10 ? `${date}T00:00:00Z` : date);
  return Number.isFinite(now) && Number.isFinite(then) && now - then > STALE_AFTER_DAYS * 86400000;
}

export const metadata: Metadata = {
  title: "Agent results",
  description: "Which models finish multi-step work. Arena agent sessions, plus the same models run inside several agent setups.",
  alternates: { canonical: "/agents" }, openGraph: og("/agents"),
};

const EXG_MODEL: Record<string, string> = {
  "openai/Azure/gpt-5.2-2025-12-11": "GPT-5.2",
  "openai/aws/claude-opus-4-5": "Claude Opus 4.5",
  "openai/azure/DeepSeek-V3.2": "DeepSeek V3.2",
  "openai/azure/Kimi-K2.5": "Kimi K2.5",
  "openai/gcp/gemini-3-pro-preview": "Gemini 3 Pro",
};
const FAMILY: Record<string, string> = { appworld_test_normal: "AppWorld", browsecompplus: "BrowseComp+", swebench: "SWE-bench", tau2_airline: "Tau²", tau2_retail: "Tau²", tau2_telecom: "Tau²" };

export default async function Page() {
  await ensureData();
  const bySlug = new Map(allModels().map((m) => [m.name, m]));
  const aa = AGENTS.arena_agent;
  const arenaRows = aa.rows.slice(0, 20).map((r) => {
    const m = bySlug.get(r.name);
    const base = r.name.replace(/ \(([^)]+)\)$/, "");
    const variant = /\(([^)]+)\)$/.exec(r.name)?.[1] ?? null;
    return {
      slug: m?.slug ?? "",
      name: r.name,
      base,
      variant,
      org: r.org,
      open: m?.open ?? !/proprietary/i.test(r.model_license),
      value: r.score,
      display: `${(r.score * 100).toFixed(1)}%`,
      extra: r.cost_per_task_p50 != null ? <span className="chip" title="Median cost per agent task">${r.cost_per_task_p50.toFixed(2)}/task</span> : null,
    };
  });
  const ex = AGENTS.exgentic;
  const agents = [...new Map(ex.rows.map((r) => [r.agent, r.agent_name])).entries()];
  const models = [...new Set(ex.rows.map((r) => r.model))];
  const overall = (agent: string, model: string) => {
    const rows = ex.rows.filter((r) => r.agent === agent && r.model === model && r.score != null);
    const fam = new Map<string, number[]>();
    for (const r of rows) fam.set(FAMILY[r.benchmark] ?? r.benchmark, [...(fam.get(FAMILY[r.benchmark] ?? r.benchmark) ?? []), r.score!]);
    if (fam.size < 4) return null;
    const means = [...fam.values()].map((v) => v.reduce((a, b) => a + b, 0) / v.length);
    return means.reduce((a, b) => a + b, 0) / means.length;
  };
  const grid = agents.map(([id, name]) => ({ id, name, cells: models.map((mo) => overall(id, mo)) }));
  const all = grid.flatMap((g) => g.cells).filter((v): v is number => v != null);
  const hi = Math.max(...all),
    lo = Math.min(...all);
  const best = grid.flatMap((g) => g.cells.map((v, i) => ({ g, i, v }))).filter((x) => x.v != null).sort((a, b) => b.v! - a.v!)[0];
  const arenaSrc = sourceById("arena");
  const exSrc = sourceById("exgentic");

  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Agents</div>
        <h1 className="h1" style={{ marginTop: 8 }}>Models that finish multi-step work</h1>
        <p className="lede">Two boards, kept apart. They measure different work and are not directly comparable. A file older than {STALE_AFTER_DAYS} days is marked old.</p>
      </div>

      <section className="section" style={{ marginTop: 10 }}>
        <div className="sh">
          <div>
            <h2 className="h2">Arena Agent board</h2>
            <p className="sub">What it measures: real multi-step agent sessions, scored from user signals on Arena. This is not the SIscope Score. Date: {fmtDate(aa.publish_date)}.{olderThan90(aa.publish_date) ? " Old: this file is more than 90 days before the snapshot." : ""} {fmtInt(aa.rows.reduce((a, r) => a + (r.sessions ?? 0), 0))} sessions in the file.</p>
          </div>
          <Link className="more" href="/best/agents">Best for agents →</Link>
        </div>
        <div className="card lb">
          <BarRows items={arenaRows} floor={0} />
        </div>
        <p className="note">
          Source: <a className="link" href={arenaSrc.home} rel="noopener">{arenaSrc.name}</a>, Agent Arena board, {arenaSrc.license}. The chip shows the median cost per task.
        </p>
      </section>

      <section className="section">
        <div className="sh">
          <div>
            <h2 className="h2">Open Agent Leaderboard</h2>
            <p className="sub">
              What it measures: the same models run inside several agent setups on AppWorld, BrowseComp+, SWE-bench and Tau². The cell is the share of tasks solved. Date: {fmtDate(ex.dataset_last_modified)}.{olderThan90(ex.dataset_last_modified) ? " Old: this file is more than 90 days before the snapshot." : ""} Not the same scale as the Arena Agent board above, so the two lists are not directly comparable.
            </p>
          </div>
        </div>
        <div className="card scroll-x" style={{ padding: 8 }}>
          <table className="tbl heat" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Agent setup</th>
                {models.map((m) => (
                  <th key={m} style={{ textAlign: "center" }}>{EXG_MODEL[m] ?? m.split("/").pop()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((g) => (
                <tr key={g.id}>
                  <td style={{ textAlign: "left", fontWeight: 600 }}>{g.name}</td>
                  {g.cells.map((v, i) => {
                    const t = v == null ? 0 : (v - lo) / (hi - lo || 1);
                    return (
                      <td key={i} style={{ background: v == null ? undefined : `color-mix(in srgb, var(--accent) ${Math.round(8 + t * 52)}%, transparent)`, borderRadius: 8 }}>
                        {v == null ? <span className="nodata" title="No result. Not a zero.">n/a</span> : `${Math.round(v * 100)}%`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          Best combo: <b>{best.g.name}</b> with <b>{EXG_MODEL[models[best.i]]}</b> ({Math.round(best.v! * 100)}%). This file is older than the Arena boards: it was last updated {fmtDate(ex.dataset_last_modified)}. A blank cell is a missing result, not a zero. Source:{" "}
          <a className="link" href={exSrc.home} rel="noopener">{exSrc.name}</a>, {exSrc.license}.
        </p>
      </section>
    </div>
  );
}
