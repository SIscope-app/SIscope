import Link from "next/link";
import { ChangeBoard } from "@/components/ChangeBoard";
import { HomeShell } from "@/components/HomeShell";
import { GapChart, RankLines, LINE_COLORS } from "@/components/charts";
import { Avatar, VariantChip } from "@/components/Avatar";
import { Icon } from "@/components/Icons";
import { JsonLd } from "@/components/JsonLd";
import type { TopItem } from "@/components/HomeShell";
import type { ScatterPt } from "@/components/Scatter";
import { CHANGES, allModels, siRanked, textRanked, type Enriched } from "@/lib/data";
import { buildDecisions, type DecisionCard } from "@/lib/decisions";
import { ARENA_BOARD_URL } from "@/lib/links";
import { fmtDate, fmtPrice } from "@/lib/format";
import { priceChangeCopy } from "@/lib/home-layout";
import { orgName } from "@/lib/orgs";
import { TASKS, taskRanking } from "@/lib/tasks";
import { SITE, og } from "@/lib/site";

export const metadata = { alternates: { canonical: "/" }, openGraph: og("/") };

function row(m: Enriched): TopItem {
  return { slug: m.slug, name: m.name, base: m.base, variant: m.variant, org: m.org, open: m.open, si: m.si!, price: m.price ? fmtPrice(m.price.blended_per_m) : null };
}

function Decision({ card }: { card: DecisionCard }) {
  return (
    <article className={`card decide ${card.kind === "overall" ? "decide-lead" : ""}`}>
      <div className="decide-top">
        <h2 className="decide-k">
          <Icon name={card.kind === "coding" ? "code" : card.kind === "value" ? "value" : "star"} /> {card.kicker}
        </h2>
        <details className="why">
          <summary>Why</summary>
          <div className="why-pop">
            <p>{card.reason}</p>
            <p>{card.limit}</p>
          </div>
        </details>
      </div>
      <Link href={card.href} className="decide-name">
        <span>{card.base}</span>
        {card.variant ? <span className="setting">{card.variant}</span> : null}
      </Link>
      <div className="decide-mid">
        <p className="decide-org">
          <Avatar org={card.org} size={16} />
          <span>{orgName(card.org)}</span>
          <span className="decide-kind">{card.rankKind}</span>
        </p>
        <p className="decide-score">
          <b>{card.score}</b>
          <small>{card.unit}</small>
        </p>
      </div>
      <p className="decide-glance">{card.glance}</p>
    </article>
  );
}

export default function Home() {
  const ranked = siRanked();
  const picks = buildDecisions(ranked);
  const open = ranked.find((m) => m.slug === picks.open.slug)!;

  const scatter: ScatterPt[] = ranked
    .filter((m) => m.price && m.price.blended_per_m > 0)
    .slice(0, 80)
    .map((m) => ({ slug: m.slug, name: m.name, base: m.base, variant: m.variant, org: m.org, open: m.open, x: m.price!.blended_per_m, y: m.si!, xin: m.price!.input_per_m, xout: m.price!.output_per_m }));

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
      <p className="lede hero-lede">Exact setting on each pick. SIscope ranks and Arena ranks are separate.</p>
      <div className="decisions">
        <Decision card={picks.overall} />
        <Decision card={picks.coding} />
        {picks.value ? (
          <Decision card={picks.value} />
        ) : (
          <article className="card decide">
            <h2 className="decide-k">
              <Icon name="value" /> Best value
            </h2>
            <p className="decide-why">No model with a SIscope score of at least 75 is listed at or under $1 per 1M tokens right now.</p>
            <Link className="more" href="/best/cheap">See cheap models</Link>
          </article>
        )}
      </div>
      <div className="decide-actions">
        <Link className="btn primary" href={picks.compareHref}>Compare these picks</Link>
      </div>
    </>
  );

  const quiet = (
    <p className="quiet-stats">
      <Link href={picks.open.href}>Best open: {picks.open.name}</Link>
      <a href="#gap-h">Open vs closed {gapNow} pts{gapDelta === 0 ? "" : `, ${Math.abs(gapDelta)} ${gapDelta > 0 ? "wider" : "narrower"} than ${fmtDate(g0.d, { year: false })}`}</a>
      <span>{picks.rankedCount} scored · {picks.trackedCount} tracked · Arena history through {fmtDate(lastDate)}</span>
    </p>
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
        {g1.open_name.replace(/ \(.*\)$/, "") !== open.base ? <> Our &ldquo;Best open model&rdquo; pick ({picks.open.name}) uses the full SIscope score, which also counts independent tests. The gap above is Arena text only.</> : null}
      </p>
    </div>
  );

  const ICON: Record<string, { c: string; s: string; k: string }> = {
    holds_leader: { c: "var(--accent)", s: "★", k: "Still #1" },
    new_leader: { c: "var(--accent)", s: "★", k: "New #1" },
    up: { c: "var(--c-good)", s: "↑", k: "Moved up" },
    down: { c: "var(--c-down)", s: "↓", k: "Moved down" },
    gap: { c: "var(--c-open)", s: "↔", k: "Open vs closed" },
    new_entry: { c: "var(--accent)", s: "+", k: "New on a board" },
    price_new: { c: "var(--c-good)", s: "$", k: "New price" },
    price_cut: { c: "var(--c-good)", s: "↓", k: "Price change" },
  };
  const changes = (
    <ChangeBoard>
      {CHANGES.changes.map((c, i) => {
        const ic = ICON[c.kind] ?? { c: "var(--muted)", s: "•", k: "Update" };
        const price = c.kind === "price_new" || c.kind === "price_cut" ? priceChangeCopy(c.sub) : null;
        const source = c.source === "openrouter" ? "OpenRouter" : c.board === "webdev" ? "Arena WebDev" : "Arena text";
        const inner = (
          <>
            <span className="ic" style={{ color: ic.c, background: `color-mix(in srgb, ${ic.c} 14%, transparent)` }} aria-hidden="true">
              {ic.s}
            </span>
            <span className="chg-body">
              <span className="k">{ic.k}</span>
              <span className="t">{price ? (c.model ?? c.text) : c.text}</span>
              {price ? (
                <>
                  <span className="chg-price">{price.headline}</span>
                  <span className="s">{price.detail}</span>
                </>
              ) : (
                <span className="s">{c.sub}</span>
              )}
              <span className="s chg-meta">{fmtDate(c.date, { year: false })} · {source}</span>
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
    </ChangeBoard>
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
                  <VariantChip v={w.variant} />
                </span>
                <span className="alt">{t.slug === "open" || t.slug === "cheap" ? (t.slug === "cheap" && w.price ? `${fmtPrice(w.price.blended_per_m)} per 1M tokens` : "Top open-weight pick") : o ? <>Best open: {o.base}{o.variant ? ` (${o.variant})` : ""}</> : "No open model with data yet"}</span>
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
      <RankLines dates={histDates} series={top8.map((m, i) => ({ label: m.variant ? `${m.base} (${m.variant})` : m.base, color: LINE_COLORS[i], points: m.history.text ?? [] }))} />
      <div className="legend" style={{ marginTop: 8 }}>
        {top8.map((m, i) => (
          <Link key={m.slug} href={`/models/${m.slug}`} className="lg">
            <span style={{ width: 12, height: 12, borderRadius: 4, background: LINE_COLORS[i] }} aria-hidden="true" />
            Arena text #{m.arena.text!.rank} {m.variant ? `${m.base} (${m.variant})` : m.base}
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
      <HomeShell hero={hero} taskChips={taskChips} quiet={quiet} gap={gapCard} changes={changes} changesSub={`${CHANGES.changes.length} updates from ${fmtDate(CHANGES.prev, { year: false })} to ${fmtDate(CHANGES.week_to, { year: false })}.`} rankChart={rankChart} tasks={tasks} scatter={scatter} top={top} />
    </>
  );
}
