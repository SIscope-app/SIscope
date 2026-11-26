import Link from "next/link";
import { ChangeBoard } from "@/components/ChangeBoard";
import { HomeShell } from "@/components/HomeShell";
import { budgetPicks } from "@/lib/advice";
import { coverageOf } from "@/components/Coverage";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icons";
import { JsonLd } from "@/components/JsonLd";
import type { TopItem } from "@/components/HomeShell";
import type { ScatterPt } from "@/components/Scatter";
import { AGENTS, allModels, CHANGES, ensureData, siRanked, textPublishDate, type Enriched } from "@/lib/data";
import { headlineEligible } from "@/lib/score";
import { buildDecisions, type DecisionCard } from "@/lib/decisions";
import { fmtDate, fmtInOut, shownGap } from "@/lib/format";
import { changeRangeLabel, materialChanges, priceChangeCopy } from "@/lib/home-layout";
import { orgName } from "@/lib/orgs";
import { CATEGORIES, COVERAGE_GATE } from "@/lib/score";
import { LIVE_TASKS, taskRanking } from "@/lib/tasks";
import { buildState, toStateModel } from "@/lib/state";
import { SITE, og } from "@/lib/site";

export const metadata = { alternates: { canonical: "/" }, openGraph: og("/") };

function row(m: Enriched): TopItem {
  const c = coverageOf(m.cats);
  return {
    slug: m.slug,
    name: m.name,
    base: m.base,
    variant: m.variant,
    org: m.org,
    open: m.open,
    si: m.si!,
    price: m.price ? fmtInOut(m.price.input_per_m, m.price.output_per_m) : null,
    measured: `${c.n}/${c.total} measured`,
    lo: m.arena.text?.lo ?? null,
    hi: m.arena.text?.hi ?? null,
  };
}

function Decision({ card }: { card: DecisionCard }) {
  return (
    <article className={`card decide ${card.kind === "overall" ? "decide-lead" : ""}`}>
      <div className="decide-top">
        <h2 className="decide-k">
          <Icon name={card.kind === "open" ? "open" : card.kind === "value" ? "value" : "star"} /> {card.kicker}
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
        <span>{card.name}</span>
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
      {card.asof ? <p className="decide-asof">{card.asof}</p> : null}
    </article>
  );
}

export default async function Home() {
  await ensureData();
  const ranked = siRanked();
  const picks = buildDecisions(ranked);
  const priced = ranked.filter((m) => m.price && m.price.blended_per_m > 0);
  const scatter: ScatterPt[] = priced
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

  const gapNow = shownGap(g1.closed, g1.open);
  const gapThen = shownGap(g0.closed, g0.open);
  const gapDelta = gapNow - gapThen;

  const glance = buildState(allModels().map(toStateModel), gap, textPublishDate() || lastDate, orgName).glance;
  const hero = (
    <>
      <nav className="glance" aria-label="At a glance">
        {glance.map((item) => (
          <Link key={item.id} href={item.href} className="glance-item">
            <span className="glance-k">{item.kicker}</span>
            <span className="glance-v">{item.title}</span>
          </Link>
        ))}
        <Link href="/state-of-ai" className="glance-more">State of AI</Link>
      </nav>
      <h1 className="h1 hero-h1">Start with one of three models</h1>
      <p className="lede hero-lede">Each card is one setting. The score and the Arena rank are different numbers.</p>
      <p className="score-note">
        The score weights {CATEGORIES.map((c) => `${c.short.toLowerCase()} ${c.weight}`).join(", ")}. It is shown when measured categories cover at least {Math.round(COVERAGE_GATE * 100)}% of that weight. <Link href="/methodology">How the score is built</Link>
      </p>
      <div className="decisions">
        <Decision card={picks.overall} />
        <Decision card={picks.open} />
        <Decision card={picks.value} />
      </div>
      <div className="decide-actions">
        <Link className="btn primary" href={picks.compareHref}>Compare these three</Link>
        <Link className="btn" href="/pick">Which model do you need?</Link>
      </div>
      <div className="budgets">
        <span className="budgets-l">Highest score under a cap</span>
        {budgetPicks(ranked).map((b) => (
          <Link key={b.cap} href={b.href} className="budget">
            <b>Under ${b.cap < 1 ? b.cap.toFixed(2) : b.cap}</b>
            <span>{b.name}</span>
            <span className="tnum">{b.score}</span>
          </Link>
        ))}
      </div>
    </>
  );

  const quiet = (
    <p className="quiet-stats">
      <a href="#gap-h">Open vs closed {gapNow} pts{gapDelta === 0 ? "" : `, ${Math.abs(gapDelta)} ${gapDelta > 0 ? "wider" : "narrower"} than ${fmtDate(g0.d, { year: false })}`}</a>
      <span>Rounded closed Arena text rating minus the rounded open rating, same day.</span>
      <span>{picks.rankedCount} scored · {picks.trackedCount} tracked · Arena history through {fmtDate(lastDate)}</span>
    </p>
  );

  const taskChips = (
    <nav className="tchips" aria-label="Best AI for a task">
      <span className="tchips-l">Best for</span>
      {LIVE_TASKS.map((t) => (
        <Link key={t.slug} href={`/best/${t.slug}`} className="tchip">
          <Icon name={t.icon} /> {t.label}
        </Link>
      ))}
    </nav>
  );

  const gapCard = (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
      <h2 className="h2" id="gap-h">Open weights versus closed</h2>
      <p className="sub" style={{ marginTop: 0 }}>Rounded closed Arena text rating minus the rounded open rating. {Math.round(g1.closed)} closed, {Math.round(g1.open)} open.</p>
      <div className="big" style={{ margin: "4px 0" }}>
        <b>{gapNow} pts</b>
        <span>{gapThen} pts on {fmtDate(g0.d, { year: false })}</span>
      </div>
      <Link className="more" href="/trends">See the charts</Link>
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
  const shownChanges = materialChanges(CHANGES.changes, CHANGES.gap);
  const changes = (
    <>
    <ChangeBoard>
      {shownChanges.map((c, i) => {
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
    <p className="note"><Link href="/changes">Every update</Link> · <Link href="/feed.xml">Atom feed</Link></p>
    </>
  );

  const tasks = (
    <div className="tasks">
        {LIVE_TASKS.map((t) => {
        const r = taskRanking(t);
        const eligible = r.filter((x) => headlineEligible(x.m.comp));
        const w = eligible[0]?.m;
        const o = eligible.find((x) => x.m.open && x.m !== w)?.m;
        return (
          <Link key={t.slug} href={`/best/${t.slug}`} className="card task">
            <span className="tl">
              <Icon name={t.icon} /> {t.label}
            </span>
            {t.soon ? (
              <>
                <span className="soon" style={{ alignSelf: "flex-start" }}>
                  Not measured yet
                </span>
                <span className="alt">Our own speed runs are not in this snapshot.</span>
              </>
            ) : w ? (
              <>
                <span className="nm" style={{ fontSize: 15 }}>
                  <Avatar org={w.org} size={20} />
                  <span className="n">{w.name}</span>
                </span>
                <span className="alt">SIscope {w.si!.toFixed(0)}{t.slug === "cheap" && w.price ? ` · ${fmtInOut(w.price.input_per_m, w.price.output_per_m)}` : o ? ` · Best open: ${o.name}` : ""}</span>
                {t.slug === "agents" ? <span className="alt">Arena Agent board, {fmtDate(AGENTS.arena_agent.publish_date, { year: false })}. The Open Agent Leaderboard ({fmtDate(AGENTS.exgentic.dataset_last_modified, { year: false })}) is not in this score.</span> : null}
              </>
            ) : (
              <span className="nodata">No result yet</span>
            )}
          </Link>
        );
      })}
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
      <HomeShell hero={hero} taskChips={taskChips} quiet={quiet} gap={gapCard} changes={changes} changesSub={changeRangeLabel(shownChanges, (d) => fmtDate(d, { year: false }))} tasks={tasks} scatter={scatter} scored={ranked.length} priced={priced.length} top={top} />
    </>
  );
}
