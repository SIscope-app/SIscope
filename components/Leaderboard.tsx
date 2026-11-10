"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Slim } from "@/lib/data";
import { CATEGORIES, DEFAULT_WEIGHTS, composite, weightsFromQuery, weightsToQuery, type CategoryId } from "@/lib/score";
import { orgName } from "@/lib/orgs";
import { fmtCtx, fmtPrice } from "@/lib/format";
import { Avatar, OpenTag, VariantChip } from "./Avatar";
import { FilterSeg } from "./HomeShell";
import { Icon } from "./Icons";
import { CoverageDots, coverageOf } from "./Coverage";

type F = "all" | "open" | "closed";
type SortKey = "si" | "text" | "textRank" | "webdev" | "coding" | "agents" | "reasoning" | "math" | "chat" | "instructions" | "price" | "ctx";
const SORTS: { id: SortKey; label: string; unit: string }[] = [
  { id: "si", label: "SIscope score", unit: "score" },
  { id: "textRank", label: "Arena text rank", unit: "rank" },
  { id: "webdev", label: "Arena WebDev rank", unit: "rank" },
  { id: "text", label: "Arena text score", unit: "arena" },
  { id: "coding", label: "Coding", unit: "score" },
  { id: "agents", label: "Agents", unit: "score" },
  { id: "reasoning", label: "Reasoning", unit: "score" },
  { id: "math", label: "Math", unit: "score" },
  { id: "chat", label: "Chat", unit: "score" },
  { id: "instructions", label: "Instructions", unit: "score" },
  { id: "price", label: "List price", unit: "$" },
  { id: "ctx", label: "Context window", unit: "ctx" },
];
const ASC = new Set<SortKey>(["price", "textRank", "webdev"]);
const PRESETS: { id: string; label: string; w: Record<CategoryId, number> }[] = [
  { id: "default", label: "Balanced", w: DEFAULT_WEIGHTS },
  { id: "coder", label: "Coding", w: { coding: 55, agents: 30, reasoning: 5, math: 5, chat: 0, instructions: 5 } },
  { id: "thinker", label: "Reasoning", w: { coding: 5, agents: 5, reasoning: 45, math: 40, chat: 0, instructions: 5 } },
  { id: "chat", label: "Chat", w: { coding: 5, agents: 5, reasoning: 20, math: 0, chat: 50, instructions: 20 } },
];
const PAGE = 40;

const PRICES = [
  { id: "", label: "Any list price" },
  { id: "0.5", label: "Under $0.50 per 1M" },
  { id: "1", label: "Under $1 per 1M" },
  { id: "3", label: "Under $3 per 1M" },
  { id: "10", label: "Under $10 per 1M" },
];
const CTXS = [
  { id: "", label: "Any context" },
  { id: "128000", label: "128K+ tokens" },
  { id: "200000", label: "200K+ tokens" },
  { id: "400000", label: "400K+ tokens" },
  { id: "1000000", label: "1M+ tokens" },
];
const MODS = [
  { id: "", label: "Any input type" },
  { id: "image", label: "Reads images" },
  { id: "file", label: "Reads files (PDF)" },
  { id: "audio", label: "Hears audio" },
  { id: "video", label: "Watches video" },
];
const COVS = [
  { id: "", label: "Any coverage" },
  { id: "3", label: "3+ of 6 categories" },
  { id: "4", label: "4+ of 6 categories" },
  { id: "5", label: "5+ of 6 categories" },
  { id: "6", label: "All 6 categories" },
];
const presetOf = (w: Record<CategoryId, number>) => PRESETS.find((p) => weightsToQuery(p.w) === weightsToQuery(w))?.id ?? null;


export function Leaderboard({ models, orgs }: { models: Slim[]; orgs: { id: string; n: number }[] }) {
  const [f, setF] = useState<F>("all");
  const [org, setOrg] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("si");
  const [w, setW] = useState<Record<CategoryId, number>>(DEFAULT_WEIGHTS);
  const [price, setPrice] = useState("");
  const [ctx, setCtx] = useState("");
  const [mod, setMod] = useState("");
  const [cov, setCov] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [panel, setPanel] = useState(false);
  const [filters, setFilters] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const apply = () => {
      const p = new URLSearchParams(window.location.search);
      const pick = (k: string, opts: { id: string }[]) => (opts.some((o) => o.id === p.get(k)) ? p.get(k)! : "");
      const s = p.get("show");
      setF(s === "open" || s === "closed" ? s : "all");
      setOrg(p.get("org") ?? "");
      setQ(p.get("q") ?? "");
      const so = p.get("sort") as SortKey | null;
      setSort(so && SORTS.some((x) => x.id === so) ? so : "si");
      const pr = PRESETS.find((x) => x.id === p.get("preset"));
      const pw = pr ? pr.w : weightsFromQuery(p.get("w"));
      setW(pw ?? DEFAULT_WEIGHTS);
      if (pw && !presetOf(pw)) setPanel(true);
      const fp = pick("price", PRICES), fc = pick("ctx", CTXS), fm = pick("mod", MODS), fv = pick("cov", COVS);
      setPrice(fp);
      setCtx(fc);
      setMod(fm);
      setCov(fv);
      if (fp || fc || fm || fv) setFilters(true);
      setReady(true);
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const u = new URL(window.location.href);
    const set = (k: string, v: string | null) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
    set("show", f === "all" ? null : f);
    set("org", org || null);
    set("q", q.trim() || null);
    set("sort", sort === "si" ? null : sort);
    const pid = presetOf(w);
    set("preset", pid && pid !== "default" ? pid : null);
    set("w", pid ? null : weightsToQuery(w));
    set("price", price || null);
    set("ctx", ctx || null);
    set("mod", mod || null);
    set("cov", cov || null);
    window.history.replaceState(null, "", u.toString().replace(/%2C/gi, ","));
  }, [ready, f, org, q, sort, w, price, ctx, mod, cov]);

  const custom = weightsToQuery(w) !== weightsToQuery(DEFAULT_WEIGHTS);
  const activePreset = presetOf(w);
  const nFilters = [price, ctx, mod, cov].filter(Boolean).length + (org ? 1 : 0) + (f !== "all" ? 1 : 0);

  const rows = useMemo(() => {
    const val = (m: Slim): number | null => {
      if (sort === "si") return custom ? composite(m.cats, w).score : m.si;
      if (sort === "text") return m.text;
      if (sort === "textRank") return m.textRank;
      if (sort === "webdev") return m.webdevRank;
      if (sort === "price") return m.price;
      if (sort === "ctx") return m.ctx;
      return m.cats[sort as CategoryId] ?? null;
    };
    const ql = q.trim().toLowerCase();
    const words = ql.split(/\s+/).filter(Boolean);
    const maxP = price ? Number(price) : null,
      minC = ctx ? Number(ctx) : null,
      minCov = cov ? Number(cov) : null;
    const base = models.filter(
      (m) =>
        (f === "all" || (f === "open" ? m.open : !m.open)) &&
        (!org || m.org === org) &&
        (!words.length || words.every((x) => `${m.name} ${orgName(m.org)}`.toLowerCase().includes(x))) &&
        (maxP == null || (m.price != null && m.price < maxP)) &&
        (minC == null || (m.ctx != null && m.ctx >= minC)) &&
        (!mod || (m.mods ?? []).includes(mod)) &&
        (minCov == null || coverageOf(m.cats).n >= minCov),
    );
    const withV = base.map((m) => ({ m, v: val(m) }));
    const has = withV.filter((x): x is { m: Slim; v: number } => x.v != null);
    has.sort((a, b) => (ASC.has(sort) ? a.v - b.v || (b.m.si ?? 0) - (a.m.si ?? 0) : b.v - a.v));
    return { has, missing: withV.length - has.length };
  }, [models, f, org, q, sort, w, custom, price, ctx, mod, cov]);

  const S = SORTS.find((s) => s.id === sort)!;
  const vals = rows.has.map((r) => r.v);
  const hi = Math.max(...vals, 1),
    lo = sort === "text" ? Math.min(...vals) - 20 : 0;
  const width = (v: number) => {
    if (sort === "price") return Math.max(3, ((Math.log10(v + 0.01) - Math.log10(0.01)) / (Math.log10(hi + 0.01) - Math.log10(0.01))) * 100);
    if (sort === "textRank" || sort === "webdev") return Math.max(3, (1 - (v - 1) / Math.max(hi - 1, 1)) * 100);
    return Math.max(3, ((v - lo) / (hi - lo || 1)) * 100);
  };
  const disp = (v: number) => {
    if (sort === "price") return fmtPrice(v);
    if (sort === "text") return Math.round(v).toString();
    if (sort === "textRank" || sort === "webdev") return `#${Math.round(v)}`;
    if (sort === "ctx") return fmtCtx(v);
    return v.toFixed(0);
  };
  const wsum = Object.values(w).reduce((a, b) => a + b, 0);
  const reset = () => {
    setF("all");
    setOrg("");
    setQ("");
    setPrice("");
    setCtx("");
    setMod("");
    setCov("");
    setLimit(PAGE);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };
  const top4 = rows.has.slice(0, 4).map((r) => r.m.slug);
  const sel = (id: string, label: string, value: string, set: (v: string) => void, opts: { id: string; label: string }[]) => (
    <label style={{ display: "grid", gap: 4, fontSize: 12.5, color: "var(--muted)", fontWeight: 560 }}>
      {label}
      <select id={id} className="select" value={value} onChange={(e) => (set(e.target.value), setLimit(PAGE))}>
        {opts.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div>
      <div className="card" style={{ padding: 14, display: "grid", gap: 12 }}>
        <div className="presets" role="group" aria-label="Weight presets">
          <b style={{ fontSize: 14.5, marginRight: 2 }}>Rank for:</b>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="preset" aria-pressed={sort === "si" && activePreset === p.id} onClick={() => (setW(p.w), setSort("si"), setLimit(PAGE))}>
              {p.id === "default" ? "Balanced" : p.label}
            </button>
          ))}
          <button type="button" className="preset" aria-pressed={sort === "si" && !activePreset} aria-expanded={panel} onClick={() => (setPanel((x) => !x), setSort("si"))}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="sliders" /> Custom weights
            </span>
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={copy}>
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>

        {panel && (
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px 28px" }}>
              {CATEGORIES.map((c) => (
                <label key={c.id} style={{ display: "grid", gap: 6 }}>
                  <span style={{ display: "flex", justifyContent: "space-between", fontSize: 14.5 }}>
                    <span style={{ fontWeight: 580 }}>{c.label}</span>
                    <span className="tnum" style={{ color: "var(--muted)" }}>{wsum ? Math.round((w[c.id] / wsum) * 100) : 0}%</span>
                  </span>
                  <input type="range" min={0} max={60} step={5} value={w[c.id]} onChange={(e) => (setW({ ...w, [c.id]: Number(e.target.value) }), setSort("si"))} aria-label={`${c.label} weight`} />
                </label>
              ))}
            </div>
            <p className="note">
              Changes only re-rank this page, in your browser. Copy the link to save or share your weights and filters. <Link className="link" href="/methodology">How the score works</Link>
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <FilterSeg value={f} onChange={(v) => (setF(v), setLimit(PAGE))} size="sm" />
          <label className="sr-only" htmlFor="lb-sort">
            Rank by
          </label>
          <select id="lb-sort" className="select" value={sort} onChange={(e) => (setSort(e.target.value as SortKey), setLimit(PAGE))}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                Rank by: {s.label}
              </option>
            ))}
          </select>
          <div style={{ position: "relative", flex: "1 1 180px", minWidth: 160 }}>
            <span style={{ position: "absolute", left: 11, top: 11, color: "var(--faint)" }}>
              <Icon name="search" />
            </span>
            <input className="input" style={{ width: "100%", paddingLeft: 36 }} placeholder="Search models or providers" value={q} onChange={(e) => (setQ(e.target.value), setLimit(PAGE))} aria-label="Search models" />
          </div>
          <button type="button" className={`btn ${filters ? "primary" : ""}`} onClick={() => setFilters((x) => !x)} aria-expanded={filters}>
            Filters{nFilters ? ` (${nFilters})` : ""}
          </button>
        </div>

        {filters && (
          <div className="filters">
            <label style={{ display: "grid", gap: 4, fontSize: 12.5, color: "var(--muted)", fontWeight: 560 }}>
              Provider
              <select id="lb-org" className="select" value={org} onChange={(e) => (setOrg(e.target.value), setLimit(PAGE))}>
                <option value="">All providers</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {orgName(o.id)} ({o.n})
                  </option>
                ))}
              </select>
            </label>
            {sel("lb-price", "Blended price", price, setPrice, PRICES)}
            {sel("lb-ctx", "Context window", ctx, setCtx, CTXS)}
            {sel("lb-mod", "Input type", mod, setMod, MODS)}
            {sel("lb-cov", "Data coverage", cov, setCov, COVS)}
            <div style={{ display: "flex", alignItems: "end" }}>
              <button type="button" className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={reset} disabled={!nFilters && !q}>
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <span style={{ fontSize: 14, color: "var(--muted)" }}>
          <b style={{ color: "var(--text)" }}>{rows.has.length}</b> models
          {sort === "si" && activePreset && activePreset !== "default" ? ` · ${PRESETS.find((p) => p.id === activePreset)!.label} weights` : sort === "si" && custom ? " · your weights" : ""}
        </span>
        {top4.length >= 2 && (
          <Link className="btn" href={`/compare?m=${top4.join(",")}`}>
            Compare top {top4.length} →
          </Link>
        )}
      </div>

      <div className="card lb" style={{ marginTop: 10 }}>
        <div className="row lb-head" style={{ color: "var(--faint)", fontSize: 13, fontWeight: 600 }}>
          <span className="rk" style={{ color: "var(--faint)" }}>#</span>
          <span className="row-main">
            <span>Model</span>
            <span style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>{S.label}{custom && sort === "si" ? " (your weights)" : ""}</span>
              <span title="How many of the six categories have a result, the Arena text place, the context window, and the list price">Measured · Arena text · context · price</span>
            </span>
          </span>
          <span className="sc" style={{ color: "var(--faint)", fontSize: 13 }}>{S.unit === "$" ? "per 1M" : "Score"}</span>
        </div>
        {rows.has.slice(0, limit).map(({ m, v }, i) => (
          <Link key={m.slug} href={`/models/${m.slug}`} className="row">
            <span className={`rk ${i === 0 ? "top" : ""}`}>{i + 1}</span>
            <span className="row-main">
              <span className="nm">
                <Avatar org={m.org} />
                <span className="n" title={m.name}>{m.base}</span>
                <VariantChip v={m.variant} />
                <OpenTag open={m.open} />
              </span>
              <span className="lb-metrics">
                <span className="barw">
                  <span className={`bar ${m.open ? "open" : ""}`} style={{ width: `${width(v).toFixed(1)}%` }} />
                </span>
                <CoverageDots cats={m.cats} />
                <span className="lb-extra tnum" title={m.textRank == null ? "Not on the Arena text board. That is not a last-place rank." : "Place on the Arena text board"}>
                  {m.textRank != null ? `Text #${m.textRank}` : "No text rank"}
                </span>
                <span className="lb-extra tnum" title={m.ctx == null ? "No context length on the OpenRouter listing." : "Most tokens one request can hold, from OpenRouter"}>
                  {m.ctx != null ? fmtCtx(m.ctx) : "No context"}
                </span>
                <span className="lb-price tnum" style={{ fontSize: 13, color: "var(--faint)", minWidth: 58, textAlign: "right" }} title={sort === "price" ? "SIscope score" : m.price == null ? "No OpenRouter list price. Unknown is not free." : m.price === 0 ? "OpenRouter lists this at $0 per 1M tokens." : "List price per 1M tokens, three input tokens per output token"}>
                  {sort === "price" ? (m.si != null ? `SI ${m.si.toFixed(0)}` : "No score") : m.price != null ? fmtPrice(m.price) : "No list price"}
                </span>
              </span>
            </span>
            <span className="sc">{disp(v)}</span>
          </Link>
        ))}
        {rows.has.length === 0 && (
          <div className="nodata" style={{ padding: 24, textAlign: "center" }}>
            Nothing matches these filters.{" "}
            <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={reset}>
              Clear filters
            </button>
          </div>
        )}
        {rows.has.length > limit && (
          <div style={{ textAlign: "center", padding: 12 }}>
            <button className="btn" onClick={() => setLimit((l) => l + 60)}>
              Show more ({rows.has.length - limit} left)
            </button>
          </div>
        )}
      </div>
      <p className="note">
        {rows.has.length} models in this list.
        {rows.missing > 0 && ` ${rows.missing} match the filters but have no ${S.label} yet. A missing value is not zero.`}
        {(price || ctx || mod) && " Price, context and input filters only include models with an OpenRouter listing."}
        {sort === "text" && " Arena text scores work like chess ratings, from votes on chat answers."}
        {(sort === "textRank" || sort === "webdev") && " Place 1 is the top of that board. Models with no result are left out of the order."}
        {sort === "price" && " Bars use a log scale. The price is the OpenRouter list price, three input tokens per output token."}
        {sort === "ctx" && " Context is the longest request the OpenRouter listing allows."}
        {sort !== "text" && sort !== "textRank" && sort !== "webdev" && sort !== "price" && sort !== "ctx" && " Scores run from 0 to 100."} Green segments show how many of the six categories have a result.
      </p>
    </div>
  );
}
