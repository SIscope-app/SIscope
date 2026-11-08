"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Slim } from "@/lib/data";
import { fmtPrice } from "@/lib/format";
import { openrouterUrl } from "@/lib/links";
import { Avatar, OpenTag, VariantChip } from "./Avatar";
import { ModelPicker } from "./ModelPicker";

const VOLUMES = [
  { t: 1e6, label: "1M" },
  { t: 1e7, label: "10M" },
  { t: 1e8, label: "100M" },
  { t: 1e9, label: "1B" },
];
const RATIOS = [
  { id: "1:1", label: "1 : 1 (even)" },
  { id: "3:1", label: "3 : 1 (typical chat)" },
  { id: "10:1", label: "10 : 1 (long documents, RAG)" },
  { id: "20:1", label: "20 : 1 (coding agents, big context)" },
  { id: "1:3", label: "1 : 3 (mostly writing)" },
];
const MAX = 12;

function money(v: number): string {
  if (v === 0) return "$0";
  if (v < 0.01) return "<$0.01";
  if (v < 100) return "$" + v.toFixed(2);
  return "$" + Math.round(v).toLocaleString("en-US");
}
function tokensLabel(t: number): string {
  if (t >= 1e9) return `${+(t / 1e9).toFixed(2)}B`;
  if (t >= 1e6) return `${+(t / 1e6).toFixed(2)}M`;
  return `${+(t / 1e3).toFixed(1)}K`;
}

export function CostCalc({ models, defaults }: { models: Slim[]; defaults: string[] }) {
  const [tokens, setTokens] = useState(1e7);
  const [ratio, setRatio] = useState("3:1");
  const [sel, setSel] = useState<string[]>(defaults);
  const [sort, setSort] = useState<"cost" | "si">("cost");
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect */
    const t = Number(p.get("t"));
    if (t > 0 && t <= 1e13) setTokens(Math.round(t));
    if (RATIOS.some((r) => r.id === p.get("r"))) setRatio(p.get("r")!);
    if (p.get("s") === "si") setSort("si");
    const m = p.get("m");
    if (m) {
      const ok = [...new Set(m.split(","))].filter((s) => models.some((x) => x.slug === s)).slice(0, MAX);
      if (ok.length) setSel(ok.length === 1 ? [ok[0], ...defaults.filter((d) => d !== ok[0]).slice(0, 4)] : ok);
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [models, defaults]);

  useEffect(() => {
    if (!ready) return;
    const u = new URL(window.location.href);
    u.searchParams.set("t", String(tokens));
    u.searchParams.set("r", ratio);
    u.searchParams.set("m", sel.join(","));
    if (sort === "si") u.searchParams.set("s", "si");
    else u.searchParams.delete("s");
    window.history.replaceState(null, "", u.toString().replace(/%2C/gi, ","));
  }, [ready, tokens, ratio, sel, sort]);

  const [a, b] = ratio.split(":").map(Number);
  const inShare = a / (a + b);
  const rows = useMemo(() => {
    const list = sel
      .map((s) => models.find((m) => m.slug === s))
      .filter((m): m is Slim => !!m && m.priceIn != null && m.priceOut != null)
      .map((m) => ({ m, cost: (tokens / 1e6) * (inShare * m.priceIn! + (1 - inShare) * m.priceOut!) }));
    list.sort((x, y) => (sort === "cost" ? x.cost - y.cost : (y.m.si ?? -1) - (x.m.si ?? -1)));
    return list;
  }, [sel, models, tokens, inShare, sort]);
  const maxCost = Math.max(...rows.map((r) => r.cost), 1e-9);
  const cheapest = rows.length ? rows.reduce((x, y) => (y.cost < x.cost ? y : x)) : null;
  const priciest = rows.length ? rows.reduce((x, y) => (y.cost > x.cost ? y : x)) : null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div>
      <div className="card" style={{ padding: 18, display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <label htmlFor="cc-tokens" style={{ fontWeight: 650 }}>
            Tokens per month <span style={{ color: "var(--muted)", fontWeight: 450 }}>(input + output, in millions)</span>
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              id="cc-tokens"
              className="input"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              style={{ width: 140 }}
              value={+(tokens / 1e6).toFixed(4)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v >= 0 && v <= 1e7) setTokens(Math.round(v * 1e6));
              }}
            />
            <div className="seg sm" role="group" aria-label="Quick volumes">
              {VOLUMES.map((v) => (
                <button key={v.t} type="button" aria-pressed={tokens === v.t} onClick={() => setTokens(v.t)}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 8, fontWeight: 650 }}>
            Input : output
            <select className="select" value={ratio} onChange={(e) => setRatio(e.target.value)}>
              {RATIOS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <div style={{ fontSize: 14, color: "var(--muted)", paddingBottom: 10 }}>
            {tokensLabel(tokens * inShare)} input + {tokensLabel(tokens * (1 - inShare))} output tokens a month
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            {sel.length < MAX ? <ModelPicker models={models} exclude={sel} onPick={(s) => setSel([...sel, s])} placeholder="Add a model with a list price" /> : <span className="nodata">That&apos;s {MAX} models. Remove one to add another.</span>}
          </div>
          <button type="button" className="btn" onClick={copy}>
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      </div>

      {cheapest && priciest && rows.length > 1 && (
        <div className="stats section" style={{ marginTop: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="card stat">
            <div className="k">Cheapest of these</div>
            <div className="v">{money(cheapest.cost)}</div>
            <div className="d">a month with {cheapest.m.name}</div>
          </div>
          <div className="card stat">
            <div className="k">Priciest of these</div>
            <div className="v">{money(priciest.cost)}</div>
            <div className="d">a month with {priciest.m.name}</div>
          </div>
          <div className="card stat">
            <div className="k">Spread</div>
            <div className="v">{cheapest.cost > 0 ? `${Math.round(priciest.cost / cheapest.cost).toLocaleString("en-US")}×` : "n/a"}</div>
            <div className="d">between cheapest and priciest</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
        <h2 className="h2" style={{ margin: 0 }}>Estimated monthly cost</h2>
        <div className="seg sm" role="group" aria-label="Sort">
          <button type="button" aria-pressed={sort === "cost"} onClick={() => setSort("cost")}>
            Cheapest first
          </button>
          <button type="button" aria-pressed={sort === "si"} onClick={() => setSort("si")}>
            Smartest first
          </button>
        </div>
      </div>
      <div className="card lb" style={{ marginTop: 10 }}>
        {rows.length === 0 && <div className="nodata" style={{ padding: 24, textAlign: "center" }}>Add a model to see its cost.</div>}
        {rows.map(({ m, cost }) => (
          <div key={m.slug} className="cost-row">
            <span style={{ minWidth: 0, display: "grid", gap: 3 }}>
              <Link href={`/models/${m.slug}`} className="nm">
                <Avatar org={m.org} />
                <span className="n" title={m.name}>{m.base}</span>
                <VariantChip v={m.variant} />
                <OpenTag open={m.open} />
              </Link>
              <span style={{ fontSize: 12.5, color: "var(--faint)" }}>
                {m.si != null ? `SIscope ${m.si.toFixed(0)} · ` : "No SIscope score · "}
                <a href={openrouterUrl(m.orId!)} rel="noopener" target="_blank" style={{ textDecoration: "underline dotted", textUnderlineOffset: 3 }}>
                  {fmtPrice(m.priceIn)} in · {fmtPrice(m.priceOut)} out per 1M
                </a>
              </span>
            </span>
            <span className="barw cost-bar">
              <span className={`bar ${m.open ? "open" : ""}`} style={{ width: `${Math.max(2, (cost / maxCost) * 100).toFixed(1)}%` }} />
            </span>
            <span className="cv">
              {money(cost)}
              <small>per month</small>
            </span>
            <button type="button" className="x" aria-label={`Remove ${m.name}`} onClick={() => setSel(sel.filter((s) => s !== m.slug))}>
              ×
            </button>
          </div>
        ))}
      </div>
      <p className="note">
        Estimate = tokens × (input share × input price + output share × output price), using OpenRouter list prices for the exact model version. Reasoning models also bill their hidden thinking as output, so real bills can be higher. Taxes, caching discounts and batch pricing are not included.
      </p>
    </div>
  );
}
