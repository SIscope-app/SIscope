import Link from "next/link";
import { HomeShell } from "@/components/HomeShell";
import { GapChart, RankLines, LINE_COLORS } from "@/components/charts";
import { Avatar } from "@/components/Avatar";
import { Icon, type IconName } from "@/components/Icons";
import { JsonLd } from "@/components/JsonLd";
import type { TopItem } from "@/components/HomeShell";
import type { ScatterPt } from "@/components/Scatter";
import { CHANGES, allModels, siRanked, textRanked, type Enriched } from "@/lib/data";
import { ARENA_BOARD_URL } from "@/lib/links";
import { fmtDate, fmtPrice } from "@/lib/format";
import { TASKS, taskRanking, bestValue } from "@/lib/tasks";
import { SITE, og } from "@/lib/site";

export const metadata = { alternates: { canonical: "/" }, openGraph: og("/") };

function row(m: Enriched): TopItem {
  return { slug: m.slug, name: m.name, base: m.base, variant: m.variant, org: m.org, open: m.open, si: m.si!, price: m.price ? fmtPrice(m.price.blended_per_m) : null };
}

function KeyTile(p: { href: string; icon: IconName; label: string; value: string; unit?: string; m?: Enriched; line?: string; sub: string; accent?: boolean; live?: boolean }) {
  return (
    <Link href={p.href} className={`card kt ${p.accent ? "kt-accent" : ""}`}>
      <span className="kt-l">
        <Icon name={p.icon} /> {p.label}
      </span>
      <span className="kt-v">
        {p.value}
        {p.unit ? <small>{p.unit}</small> : null}
      </span>
      {p.m ? (
        <span className="kt-m">
          <Avatar org={p.m.org} size={18} />
          <span className="n" title={p.m.name}>{p.m.base}</span>
        </span>
      ) : (
        <span className="kt-m">{p.live ? <span className="dot" aria-hidden="true" /> : null}<span className="n">{p.line}</span></span>
      )}
      <span className="kt-s">{p.sub}</span>
    </Link>
  );
}

export default function Home() {
  const ranked = siRanked();
  const smartest = ranked[0];
  const coding = taskRanking(TASKS.find((t) => t.slug === "coding")!)[0].m;
  const open = ranked.find((m) => m.open)!;
  const value = bestValue(ranked, [smartest.base]);
  const pricedTop = ranked.filter((m) => m.price).slice(0, 10);
  const topAvg = pricedTop.reduce((a, m) => a + m.price!.blended_per_m, 0) / pricedTop.length;

  const scatter: ScatterPt[] = ranked
    .filter((m) => m.price && m.price.blended_per_m > 0)
    .slice(0, 80)
    .map((m) => ({ slug: m.slug, name: m.name, base: m.base, org: m.org, open: m.open, x: m.price!.blended_per_m, y: m.si!, xin: m.price!.input_per_m, xout: m.price!.output_per_m }));

  // One row per model on the home page: keep its best-scoring setting.
  const seen = new Set<string>();
  const top: TopItem[] = ranked
    .filter((m) => (seen.has(m.base) ? false : (seen.add(m.base), true)))
    .slice(0, 120)
    .map(row);
  const gap = CHANGES.gap;
  const g1 = gap[gap.length - 1];
  const g0 = gap[0];
  const lastDate = g1.d;

  const gapNow = Math.round(g1.closed - g1.open);
  const gapThen = Math.round(g0.closed - g0.open);
  const gapDelta = gapNow - gapThen;

  const hero = (
    <>
      <h1 className="h1 hero-h1">Which AI is best right now?</h1>
      <p className="lede hero-lede">The numbers that matter, from blind human votes and independent tests. Tap any tile for the detail.</p>
    </>
  );

  const keyNumbers = (
    <div className="kn">
      <KeyTile href={`/models/${smartest.slug}`} icon="star" label="#1 overall" value={smartest.si!.toFixed(0)} unit="/100" m={smartest} sub={`SIscope score · top of ${ranked.length}`} accent />
      <KeyTile href="/best/coding" icon="code" label="#1 for coding" value={coding.cats.coding!.toFixed(0)} unit="/100" m={coding} sub={coding.arena.webdev ? `#${coding.arena.webdev.rank} in WebDev arena` : "Coding score"} />
      {value ? (
        <KeyTile href={`/models/${value.slug}`} icon="value" label="Best value" value={fmtPrice(value.price!.blended_per_m)} unit="/1M" m={value} sub={`SIscope ${value.si!.toFixed(0)} · ${Math.round(topAvg / value.price!.blended_per_m)}× cheaper than the top 10`} />
      ) : (
        <KeyTile href="/best/cheap" icon="value" label="Best value" value="–" sub="No model meets the bar yet" />
      )}
      <KeyTile href={`/models/${open.slug}`} icon="open" label="Best open model" value={open.si!.toFixed(0)} unit="/100" m={open} sub={`#${open.siRank} overall · ${open.model_license}`} />
      <KeyTile
        href="#gap-h"
        icon="compare"
        label="Open vs closed"
        value={String(gapNow)}
        unit="pts"
        line="Closed leads in votes"
        sub={`${gapDelta > 0 ? "▲ " : gapDelta < 0 ? "▼ " : ""}${gapDelta === 0 ? "Same as" : `${Math.abs(gapDelta)} pts ${gapDelta > 0 ? "wider" : "narrower"} than`} ${fmtDate(g0.d, { year: false })}`}
      />
      <KeyTile href="/leaderboard" icon="list" label="Models tracked" value={String(allModels().length)} line={`${ranked.length} fully scored`} sub={`Data as of ${fmtDate(lastDate)}`} live />
    </div>
  );

  const taskChips = (
    <nav className="tchips" aria-label="Best AI for a task">
      <span className="tchips-l">Best for</span>
      {TASKS.map((t) => (
        <Link key={t.slug} href={`/best/${t.slug}`} className="tchip">
          <Icon name={t.icon} /> {t.label}
        </Link>
      ))}
    </nav>
  );

  const gapCard = (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 className="h2" id="gap-h">Open vs closed</h2>
      <p className="sub" style={{ marginTop: 0 }}>
        How far the best open model trails the best closed one in blind human votes (Arena text scores).
      </p>
      <div className="big" style={{ margin: "6px 0 2px" }}>
        <b>{gapNow} pts</b>
        <span>gap today · {gapThen} pts on {fmtDate(g0.d)}</span>
      </div>
      <GapChart points={gap} />
      <div className="legend">
        <span className="lg">
          <svg width="22" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="22" y2="3" stroke="var(--c-closed)" strokeWidth="3" />
          </svg>
          Top closed: {g1.closed_name.replace(/ \(.*\)$/, "")} ({Math.round(g1.closed)})
        </span>
        <span className="lg">
          <svg width="22" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="22" y2="3" stroke="var(--c-open)" strokeWidth="3" strokeDasharray="6 4" />
          </svg>
          Top open in votes: {g1.open_name.replace(/ \(.*\)$/, "")} ({Math.round(g1.open)})
        </span>
      </div>
      <p className="note" style={{ marginTop: "auto" }}>
        Arena text scores work like chess ratings: a 50-point lead means the leader wins roughly 57% of head-to-head votes.
        {g1.open_name.replace(/ \(.*\)$/, "") !== open.base ? <> Our &ldquo;Best open model&rdquo; pick ({open.base}) uses the full SIscope score, which also counts independent tests.</> : null}
      </p>
    </div>
  );

  const ICON: Record<string, { c: string; s: string; k: string }> = {
    new_leader: { c: "var(--accent)", s: "★", k: "New #1" },
    up: { c: "var(--c-good)", s: "↑", k: "Moved up" },
    down: { c: "var(--c-down)", s: "↓", k: "Moved down" },
    gap: { c: "var(--c-open)", s: "↔", k: "Open vs closed" },
    new_entry: { c: "var(--accent)", s: "+", k: "New on a board" },
    price_new: { c: "var(--c-good)", s: "$", k: "New price" },
    price_cut: { c: "var(--c-good)", s: "$", k: "Price cut" },
  };
  const changes = (
    <div className="chg-grid">
      {CHANGES.changes.map((c, i) => {
        const ic = ICON[c.kind] ?? { c: "var(--muted)", s: "•", k: "Update" };
        const inner = (
          <>
            <span className="ic" style={{ color: ic.c, background: `color-mix(in srgb, ${ic.c} 14%, transparent)` }} aria-hidden="true">
              {ic.s}
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="k" style={{ display: "block" }}>
                {ic.k}
              </span>
              <span className="t" style={{ display: "block" }}>
                {c.text}
              </span>
              <span className="s" style={{ display: "block" }}>
                {c.sub}
              </span>
              <span className="s" style={{ display: "block", color: "var(--faint)" }}>
                {fmtDate(c.date)} · {c.source === "openrouter" ? "OpenRouter prices" : c.board === "webdev" ? "Arena WebDev" : "Arena text"}
              </span>
            </span>
          </>
        );
        return c.slug ? (
          <Link key={i} href={`/models/${c.slug}`} className="card chg">
            {inner}
          </Link>
        ) : (
          <div key={i} className="card chg">
            {inner}
          </div>
        );
      })}
    </div>
  );

  const tasks = (
    <div className="tasks">
      {TASKS.map((t) => {
        const r = taskRanking(t);
        const w = r[0]?.m;
        const o = r.find((x) => x.m.open && x.m !== w)?.m;
        return (
          <Link key={t.slug} href={`/best/${t.slug}`} className="card task">
            <span className="tl">
              <Icon name={t.icon} /> {t.label}
            </span>
            {t.soon ? (
              <>
                <span className="soon" style={{ alignSelf: "flex-start" }}>
                  Coming soon
                </span>
                <span className="alt">Our own speed tests are on the way.</span>
              </>
            ) : w ? (
              <>
                <span className="nm" style={{ fontSize: 15 }}>
                  <Avatar org={w.org} size={20} />
                  <span className="n" title={w.name}>{w.base}</span>
                </span>
                <span className="alt">{t.slug === "open" || t.slug === "cheap" ? (t.slug === "cheap" && w.price ? `${fmtPrice(w.price.blended_per_m)} per 1M tokens` : "Top open-weight pick") : o ? <>Best open: {o.base}</> : "No open model with data yet"}</span>
              </>
            ) : (
              <span className="nodata">No data yet</span>
            )}
          </Link>
        );
      })}
    </div>
  );

  const seenBase = new Set<string>();
  const top8 = textRanked()
    .filter((m) => (seenBase.has(m.base) ? false : (seenBase.add(m.base), true)))
    .slice(0, 8);
  const allDates = [...new Set(allModels().flatMap((m) => (m.history.text ?? []).map((p) => p[0])))].sort();
  const firstTop = top8.flatMap((m) => (m.history.text ?? []).map((p) => p[0])).sort()[0] ?? allDates[0];
  const histDates = allDates.filter((d) => d >= firstTop);
  const rankChart = (
    <div className="card" style={{ padding: 20 }}>
      <RankLines dates={histDates} series={top8.map((m, i) => ({ label: m.base, color: LINE_COLORS[i], points: m.history.text ?? [] }))} />
      <div className="legend" style={{ marginTop: 8 }}>
        {top8.map((m, i) => (
          <Link key={m.slug} href={`/models/${m.slug}`} className="lg">
            <span style={{ width: 12, height: 12, borderRadius: 4, background: LINE_COLORS[i] }} aria-hidden="true" />
            #{m.arena.text!.rank} {m.base}
          </Link>
        ))}
      </div>
      <p className="note">
        Text arena rank at each Arena update from {fmtDate(histDates[0])} to {fmtDate(histDates[histDates.length - 1])}, when the first of these models appeared. A line starts when its model first shows up; a lone dot means it is brand new. Source:{" "}
        <a className="link" href={ARENA_BOARD_URL.text} rel="noopener">Arena text leaderboard</a>.
      </p>
    </div>
  );

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "SIscope",
          url: SITE.url,
          description: SITE.description,
        }}
      />
      <HomeShell hero={hero} keyNumbers={keyNumbers} taskChips={taskChips} gap={gapCard} changes={changes} changesSub={`${CHANGES.changes.length} changes between the Arena updates of ${fmtDate(CHANGES.prev)} and ${fmtDate(CHANGES.week_to)}, plus new prices.`} rankChart={rankChart} tasks={tasks} scatter={scatter} top={top} />
    </>
  );
}
