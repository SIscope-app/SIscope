"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Slim } from "@/lib/data";
import { CATEGORIES } from "@/lib/score";
import { orgName } from "@/lib/orgs";
import { fmtCtx, fmtPrice } from "@/lib/format";
import { ARENA_BOARD_URL, epochBenchUrl, openrouterUrl } from "@/lib/links";
import { compareSummary, displayedWinners, priceStatus, splitCovered, type ScoreRow } from "@/lib/present";
import { Avatar } from "./Avatar";
import { Radar } from "./charts";
import { CoverageDots, coverageOf } from "./Coverage";
import { ModelPicker } from "./ModelPicker";

const COLORS = ["var(--c-closed)", "var(--c-open)", "var(--c-good)", "var(--c-down)"];
const MAX = 4;

type Tile = {
  k: string;
  title: string;
  desc: string;
  src?: { href: string; label: string; internal?: boolean };
  get: (m: Slim) => number | null;
  fmt: (v: number, m: Slim) => React.ReactNode;
  best: "hi" | "lo";
  /** bar width 0-100 for a value, given the known values in the tile */
  width: (v: number, known: number[]) => number;
  href?: (m: Slim) => string | null;
  /** Shown when this model has no result. */
  empty: string;
};

const pctW = (v: number) => v;
const relW = (v: number, known: number[]) => {
  const lo = Math.min(...known) - 60,
    hi = Math.max(...known);
  return hi > lo ? ((v - lo) / (hi - lo)) * 100 : 100;
};

function settingName(m: { base: string; variant: string | null; name: string }) {
  return m.variant ? `${m.base} (${m.variant})` : m.name;
}

function readSlugs(models: Slim[], defaults: string[]): string[] | null {
  const q = new URLSearchParams(window.location.search).get("m");
  if (!q) return null;
  const ok = [...new Set(q.split(","))].filter((s) => models.some((m) => m.slug === s)).slice(0, MAX);
  if (!ok.length) return null;
  if (ok.length === 1) {
    const extra = defaults.find((d) => d !== ok[0]);
    return extra ? [ok[0], extra] : ok;
  }
  return ok;
}

function writeUrl(next: string[], hist: "push" | "replace") {
  const u = new URL(window.location.href);
  u.searchParams.set("m", next.join(","));
  const url = u.toString().replace(/%2C/gi, ",");
  if (url === window.location.href) return;
  if (hist === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

export function Compare({ models, defaults, benches }: { models: Slim[]; defaults: string[]; benches: { id: string; label: string; description: string }[] }) {
  const [sel, setSel] = useState<string[]>(defaults);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const fromUrl = readSlugs(models, defaults);
    const initial = fromUrl ?? defaults;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSel(initial);
    writeUrl(initial, "replace");
    const onPop = () => setSel(readSlugs(models, defaults) ?? defaults);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [models, defaults]);
  const update = (next: string[]) => {
    setSel(next);
    writeUrl(next, "push");
  };
  const chosen = sel.map((s) => models.find((m) => m.slug === s)!).filter(Boolean);

  const arenaTile = (k: "text" | "webdev" | "vision", title: string, desc: string, rank: (m: Slim) => number | null): Tile => ({
    k,
    title,
    desc,
    src: { href: ARENA_BOARD_URL[k], label: "Arena ↗" },
    get: (m) => m[k],
    fmt: (v, m) => (
      <>
        {Math.round(v)}
        {rank(m) != null && <small>#{rank(m)}</small>}
      </>
    ),
    best: "hi",
    width: relW,
    empty: "No result",
  });

  const tiles: Tile[] = [
    { k: "si", title: "SIscope score", desc: "0 to 100, from measured categories. Not an Arena rank.", src: { href: "/methodology", label: "How it works", internal: true }, get: (m) => m.si, fmt: (v) => v.toFixed(1), best: "hi", width: pctW, empty: "No score" },
    arenaTile("text", "Arena: text", "Blind human votes on chat answers. Separate from the SIscope score.", (m) => m.textRank),
    arenaTile("webdev", "Arena: WebDev", "Human votes on web apps the models build. Separate from the SIscope score.", (m) => m.webdevRank),
    arenaTile("vision", "Arena: vision", "Human votes on questions about images.", (m) => m.visionRank),
    ...benches.map(
      (b): Tile => ({
        k: `epoch.${b.id}`,
        title: b.label,
        desc: `${b.description}. Epoch AI run, share correct.`,
        src: { href: epochBenchUrl(b.id), label: "Epoch AI ↗" },
        get: (m) => (m.epoch[b.id] != null ? m.epoch[b.id] * 100 : null),
        fmt: (v) => `${v.toFixed(0)}%`,
        best: "hi",
        width: pctW,
        empty: "No result",
      }),
    ),
    {
      k: "price",
      title: "Blended price",
      desc: "Per 1M tokens, 3 parts input to 1 part output. Lower wins. Unknown is not free.",
      get: (m) => m.price,
      fmt: (v) => fmtPrice(v),
      best: "lo",
      width: (v, known) => (v / Math.max(...known, 0.0001)) * 100,
      href: (m) => (m.orId ? openrouterUrl(m.orId) : null),
      empty: "No list price",
    },
    { k: "ctx", title: "Context window", desc: "Most tokens one request can hold, from the OpenRouter listing", get: (m) => m.ctx, fmt: (v) => fmtCtx(v), best: "hi", width: (v, known) => (v / Math.max(...known)) * 100, href: (m) => (m.orId ? openrouterUrl(m.orId) : null), empty: "No listing" },
  ];

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };
  const priced = chosen.filter((m) => m.price != null);
  const rows: ScoreRow[] = chosen.map((m) => ({ slug: m.slug, name: settingName(m), si: m.si, cats: m.cats, price: m.price }));
  const trade = compareSummary(rows);
  const { shown: shownTiles, hidden: hiddenTiles } = splitCovered(tiles, (t) => chosen.some((m) => t.get(m) != null));
  const { shown: shownCats, hidden: hiddenCats } = splitCovered([...CATEGORIES], (c) => chosen.some((m) => m.cats[c.id] != null));

  return (
    <div>
      <div className="card" style={{ padding: 16, display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1fr)" }}>
        <div className="cmp-chips">
          {chosen.map((m, i) => (
            <span key={m.slug} className="cmp-chip">
              <span className="sw" style={{ background: COLORS[i] }} aria-hidden="true" />
              <Avatar org={m.org} size={20} />
              <Link href={`/models/${m.slug}`} className="n" title={`${settingName(m)} by ${orgName(m.org)}`}>
                {settingName(m)}
              </Link>
              <button type="button" aria-label={`Remove ${settingName(m)}`} disabled={chosen.length <= 2} style={chosen.length <= 2 ? { opacity: 0.35, cursor: "not-allowed" } : undefined} onClick={() => update(sel.filter((s) => s !== m.slug))}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            {chosen.length < MAX ? (
              <ModelPicker models={models} exclude={sel} onPick={(s) => update([...sel, s])} />
            ) : (
              <span className="nodata">Four models is the limit. Remove one to add another.</span>
            )}
          </div>
          <button type="button" className="btn" onClick={share}>
            {copied ? "Link copied" : "Copy link"}
          </button>
          {priced.length > 0 && (
            <Link className="btn" href={`/tools/cost?m=${priced.map((m) => m.slug).join(",")}`}>
              Monthly cost →
            </Link>
          )}
        </div>
      </div>

      <div className="card tradeoff">
        <h2 className="h2">Tradeoff</h2>
        <p>{trade.summary}</p>
        {trade.limits.map((line) => (
          <p key={line} className="decide-limit">{line}</p>
        ))}
      </div>

      <div className="grid2 section" style={{ gridTemplateColumns: "1fr 1.2fr", marginTop: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <h2 className="h2">Shapes side by side</h2>
          <p className="sub">Bigger shape, stronger on the categories we measured. A spoke at the centre has no result, which is not a zero.</p>
          <div style={{ marginTop: 10 }}>
            <Radar series={chosen.map((m, i) => ({ label: settingName(m), cats: m.cats, color: COLORS[i], dashed: i % 2 === 1 }))} />
          </div>
          <div className="legend" style={{ justifyContent: "center" }}>
            {chosen.map((m, i) => (
              <span key={m.slug} className="lg">
                <span style={{ width: 12, height: 12, borderRadius: 4, background: COLORS[i] }} /> {settingName(m)}
              </span>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h2 className="h2">Category scores</h2>
          <p className="sub" style={{ marginBottom: 8 }}>Percentiles from 0 to 100. A row names a winner only when at least two models have a result. Ties are marked.</p>
          {shownCats.map((c) => {
            const vals = chosen.map((m) => m.cats[c.id] ?? null);
            const { win, tie } = displayedWinners(vals, "hi", (n) => n.toFixed(1));
            return (
              <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>
                  {c.label}
                  {tie ? <span className="tie"> Tie</span> : null}
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  {chosen.map((m, i) => {
                    const v = vals[i];
                    return (
                      <div key={m.slug} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 48px", gap: 10, alignItems: "center" }}>
                        {v == null ? (
                          <span className="nodata" style={{ fontSize: 13 }} title="No result yet. Not a zero.">No result</span>
                        ) : (
                          <span className="barw" style={{ height: 9 }}>
                            <span className="bar" style={{ width: `${Math.max(3, v)}%`, background: COLORS[i] }} />
                          </span>
                        )}
                        <span className="tnum" style={{ textAlign: "right", fontSize: 14, fontWeight: win[i] ? 750 : 500, color: win[i] ? "var(--text)" : "var(--muted)" }}>
                          <span className="sr-only">{settingName(m)}: </span>
                          {v == null ? <span title="No result yet. Not a zero.">n/a</span> : v.toFixed(1)}
                          {win[i] ? <span className="sr-only">{tie ? ", tie" : ", best"}</span> : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {hiddenCats.length > 0 && (
            <p className="note">Hidden, because none of these models have a result: {hiddenCats.map((c) => c.label).join(", ")}. A missing result is not a zero.</p>
          )}
          <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
            {chosen.map((m, i) => {
              const c = coverageOf(m.cats);
              return (
                <div key={m.slug} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--muted)", minWidth: 0 }}>
                  <span style={{ color: COLORS[i], fontWeight: 700 }} aria-hidden="true">●</span>
                  <CoverageDots cats={m.cats} label />
                  <span style={{ minWidth: 0 }}>{c.missing.length ? `Missing: ${c.missing.join(", ")}` : "All categories have data"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <section className="section">
        <h2 className="h2">The numbers behind it</h2>
        <p className="sub" style={{ marginBottom: 14 }}>Each shown tile links to its source. Best value in green, and only when at least two models have that number. A missing result is never a zero.</p>
        <div className="tiles">
          {shownTiles.map((t) => {
            const vals = chosen.map((m) => t.get(m));
            const known = vals.filter((v): v is number => v != null);
            const { win } = displayedWinners(vals, t.best, (n) => (t.k === "price" ? fmtPrice(n) : t.k === "ctx" ? fmtCtx(n) : t.k.startsWith("epoch") ? `${n.toFixed(0)}%` : t.k === "si" ? n.toFixed(1) : String(Math.round(n))));
            return (
              <div key={t.k} className="card tile">
                <div className="tile-h">
                  <b>{t.title}</b>
                  {t.src &&
                    (t.src.internal ? (
                      <Link href={t.src.href}>{t.src.label}</Link>
                    ) : (
                      <a href={t.src.href} rel="noopener" target="_blank">
                        {t.src.label}
                      </a>
                    ))}
                </div>
                <div className="tile-d">{t.desc}</div>
                {chosen.map((m, i) => {
                  const v = vals[i];
                  const href = v != null && t.href ? t.href(m) : null;
                  const val = v == null ? null : t.fmt(v, m);
                  const emptyTitle = t.k === "price" ? priceStatus(null).detail : "No result yet. Not a zero.";
                  return (
                    <div key={m.slug} className="tile-r" title={settingName(m)}>
                      <span className="sw" style={{ background: COLORS[i] }} aria-hidden="true" />
                      {v == null ? (
                        <span className="nodata" title={emptyTitle}>{t.empty}</span>
                      ) : (
                        <span className="barw">
                          <span className="bar" style={{ width: `${Math.max(3, Math.min(100, t.width(v, known))).toFixed(1)}%`, background: COLORS[i] }} />
                        </span>
                      )}
                      <span className={`v ${win[i] ? "best" : ""}`}>
                        <span className="sr-only">{settingName(m)}: </span>
                        {v == null ? (
                          <span title={emptyTitle}>n/a</span>
                        ) : href ? (
                          <a href={href} rel="noopener" target="_blank" title={t.k === "price" ? priceStatus(v).detail : "Open the source"} style={{ textDecoration: "underline dotted", textUnderlineOffset: 3 }}>
                            {val}
                          </a>
                        ) : (
                          val
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {hiddenTiles.length > 0 && (
          <p className="note">Hidden, because none of these models have a result: {hiddenTiles.map((t) => t.title).join(", ")}. A missing result is not a zero.</p>
        )}
        <p className="note">Arena scores work like chess ratings; the small number is the rank on that board. Prices are OpenRouter list prices. A listed $0 is free. “No list price” means the model is not on OpenRouter. Speed: coming soon.</p>
      </section>
    </div>
  );
}
