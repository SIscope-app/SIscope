"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Slim } from "@/lib/data";
import { CATEGORIES } from "@/lib/score";
import { orgName } from "@/lib/orgs";
import { fmtCtx, fmtPrice } from "@/lib/format";
import { ARENA_BOARD_URL, epochBenchUrl, openrouterUrl } from "@/lib/links";
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
};

const pctW = (v: number) => v;
const relW = (v: number, known: number[]) => {
  const lo = Math.min(...known) - 60,
    hi = Math.max(...known);
  return hi > lo ? ((v - lo) / (hi - lo)) * 100 : 100;
};

export function Compare({ models, defaults, benches }: { models: Slim[]; defaults: string[]; benches: { id: string; label: string; description: string }[] }) {
  const [sel, setSel] = useState<string[]>(defaults);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("m");
    if (q) {
      const ok = [...new Set(q.split(","))].filter((s) => models.some((m) => m.slug === s)).slice(0, MAX);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (ok.length) setSel(ok.length === 1 ? [ok[0], defaults.find((d) => d !== ok[0])!] : ok);
    }
  }, [models, defaults]);
  const update = (next: string[]) => {
    setSel(next);
    const u = new URL(window.location.href);
    u.searchParams.set("m", next.join(","));
    window.history.replaceState(null, "", u.toString().replace(/%2C/gi, ","));
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
  });

  const tiles: Tile[] = [
    { k: "si", title: "SIscope score", desc: "0 to 100, all categories weighted", src: { href: "/methodology", label: "How it works", internal: true }, get: (m) => m.si, fmt: (v) => v.toFixed(0), best: "hi", width: pctW },
    arenaTile("text", "Arena: text", "Blind human votes on chat answers", (m) => m.textRank),
    arenaTile("webdev", "Arena: WebDev", "Human votes on web apps the models build", (m) => m.webdevRank),
    arenaTile("vision", "Arena: vision", "Human votes on questions about images", (m) => m.visionRank),
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
      }),
    ),
    {
      k: "price",
      title: "Blended price",
      desc: "Per 1M tokens, 3 parts input to 1 part output. Lower wins.",
      get: (m) => m.price,
      fmt: (v) => fmtPrice(v),
      best: "lo",
      width: (v, known) => (v / Math.max(...known)) * 100,
      href: (m) => (m.orId ? openrouterUrl(m.orId) : null),
    },
    { k: "ctx", title: "Context window", desc: "Most tokens one request can hold", get: (m) => m.ctx, fmt: (v) => fmtCtx(v), best: "hi", width: (v, known) => (v / Math.max(...known)) * 100, href: (m) => (m.orId ? openrouterUrl(m.orId) : null) },
  ];

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };
  const priced = chosen.filter((m) => m.price != null);

  return (
    <div>
      <div className="card" style={{ padding: 16, display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1fr)" }}>
        <div className="cmp-chips">
          {chosen.map((m, i) => (
            <span key={m.slug} className="cmp-chip">
              <span className="sw" style={{ background: COLORS[i] }} aria-hidden="true" />
              <Avatar org={m.org} size={20} />
              <Link href={`/models/${m.slug}`} className="n" title={`${m.name} by ${orgName(m.org)}`}>
                {m.name}
              </Link>
              <button type="button" aria-label={`Remove ${m.name}`} disabled={chosen.length <= 2} style={chosen.length <= 2 ? { opacity: 0.35, cursor: "not-allowed" } : undefined} onClick={() => update(sel.filter((s) => s !== m.slug))}>
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

      <div className="grid2 section" style={{ gridTemplateColumns: "1fr 1.2fr", marginTop: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <h2 className="h2">Shapes side by side</h2>
          <p className="sub">Bigger shape, stronger model. A spoke with no data sits at the centre.</p>
          <div style={{ marginTop: 10 }}>
            <Radar series={chosen.map((m, i) => ({ label: m.name, cats: m.cats, color: COLORS[i], dashed: i % 2 === 1 }))} />
          </div>
          <div className="legend" style={{ justifyContent: "center" }}>
            {chosen.map((m, i) => (
              <span key={m.slug} className="lg">
                <span style={{ width: 12, height: 12, borderRadius: 4, background: COLORS[i] }} /> {m.base}
              </span>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h2 className="h2">Category scores</h2>
          <p className="sub" style={{ marginBottom: 8 }}>Percentiles from 0 to 100. The winner in each row is in bold.</p>
          {CATEGORIES.map((c) => {
            const vals = chosen.map((m) => m.cats[c.id] ?? null);
            const known = vals.filter((v): v is number => v != null);
            const best = known.length > 1 ? Math.max(...known) : null;
            return (
              <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>{c.label}</div>
                <div style={{ display: "grid", gap: 4 }}>
                  {chosen.map((m, i) => {
                    const v = vals[i];
                    return (
                      <div key={m.slug} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 48px", gap: 10, alignItems: "center" }}>
                        {v == null ? (
                          <span className="nodata" style={{ fontSize: 13 }}>No data yet</span>
                        ) : (
                          <span className="barw" style={{ height: 9 }}>
                            <span className="bar" style={{ width: `${Math.max(3, v)}%`, background: COLORS[i] }} />
                          </span>
                        )}
                        <span className="tnum" style={{ textAlign: "right", fontSize: 14, fontWeight: v != null && v === best ? 750 : 500, color: v != null && v === best ? "var(--text)" : "var(--muted)" }}>
                          {v == null ? "–" : v.toFixed(0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
            {chosen.map((m, i) => {
              const c = coverageOf(m.cats);
              return (
                <div key={m.slug} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--muted)", minWidth: 0 }}>
                  <span style={{ color: COLORS[i], fontWeight: 700 }} aria-hidden="true">●</span>
                  <CoverageDots cats={m.cats} label />
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.missing.length ? `Missing: ${c.missing.join(", ")}` : "All categories have data"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <section className="section">
        <h2 className="h2">The numbers behind it</h2>
        <p className="sub" style={{ marginBottom: 14 }}>Each tile links to its source. Best value in green. &ldquo;No data&rdquo; means the source hasn&apos;t tested that model, never a zero.</p>
        <div className="tiles">
          {tiles.map((t) => {
            const vals = chosen.map((m) => t.get(m));
            const known = vals.filter((v): v is number => v != null);
            const best = known.length > 1 ? (t.best === "hi" ? Math.max(...known) : Math.min(...known)) : null;
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
                  return (
                    <div key={m.slug} className="tile-r" title={m.name}>
                      <span className="sw" style={{ background: COLORS[i] }} aria-hidden="true" />
                      {v == null ? (
                        <span className="nodata">No data</span>
                      ) : (
                        <span className="barw">
                          <span className="bar" style={{ width: `${Math.max(3, Math.min(100, t.width(v, known))).toFixed(1)}%`, background: COLORS[i] }} />
                        </span>
                      )}
                      <span className={`v ${v != null && v === best ? "best" : ""}`}>
                        <span className="sr-only">{m.base}: </span>
                        {v == null ? "–" : href ? (
                          <a href={href} rel="noopener" target="_blank" title="Open on OpenRouter" style={{ textDecoration: "underline dotted", textUnderlineOffset: 3 }}>
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
        <p className="note">Arena scores work like chess ratings; the small number is the rank on that board. Prices are OpenRouter list prices for the exact model. Speed: coming soon.</p>
      </section>
    </div>
  );
}
