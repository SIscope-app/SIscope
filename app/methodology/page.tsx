import { og } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { EPOCH_BENCHMARKS, SOURCES, siRanked } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { CATEGORIES, COVERAGE_GATE, SCORE_DATE, SCORE_VERSION } from "@/lib/score";

export const metadata: Metadata = {
  title: "Methodology: how the SIscope score works",
  description: `How SIscope ranks AI models: the v${SCORE_VERSION} score, its weights, data sources, licences and what we never do.`,
  alternates: { canonical: "/methodology" }, openGraph: og("/methodology"),
};

export default function Page() {
  const n = siRanked().length;
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Methodology · v{SCORE_VERSION} · {fmtDate(SCORE_DATE)}</div>
        <h1 className="h1" style={{ marginTop: 8 }}>How we score</h1>
        <p className="lede">Plain rules, published weights, every number linked to where it came from. If we change the recipe, the version number changes too.</p>
      </div>

      <section className="section" style={{ marginTop: 8 }}>
        <h2 className="h2" style={{ marginBottom: 14 }}>The SIscope score, at a glance</h2>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", height: 44, borderRadius: 12, overflow: "hidden", gap: 3 }} role="img" aria-label="Weights per category">
            {CATEGORIES.map((c, i) => (
              <div key={c.id} title={`${c.label}: ${c.weight}%`} style={{ flex: c.weight, background: `color-mix(in srgb, var(--accent) ${90 - i * 12}%, var(--card2))`, display: "grid", placeItems: "center", color: i < 3 ? "var(--accent-ink)" : "var(--text)", fontSize: 13, fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden" }}>
                {c.weight >= 10 ? `${c.short} ${c.weight}%` : `${c.weight}%`}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginTop: 18 }}>
            {CATEGORIES.map((c) => (
              <div key={c.id} className="card" style={{ padding: 16, boxShadow: "none", background: "var(--card2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b>{c.label}</b>
                  <b className="tnum" style={{ color: "var(--accent)" }}>{c.weight}%</b>
                </div>
                <div style={{ fontSize: 14, color: "var(--muted)", margin: "4px 0 8px" }}>{c.blurb}</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "var(--muted)" }}>
                  {c.components.map((k) => (
                    <li key={k.id}>{k.label}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section prose">
        <h2>How a score is built</h2>
        <p>
          <b>1. Everything becomes a percentile.</b> For each test, we rank every model that took it and turn its place into a number from 0 to 100: &quot;better than X% of the models that took this test&quot;. This puts chess-style vote ratings and percent-correct test scores on the same scale.
        </p>
        <p>
          <b>2. Categories average their tests.</b> A category score is the plain average of whichever of its tests the model has. We never show a number for a test a model didn&apos;t take.
        </p>
        <p>
          <b>3. The overall score is a weighted average of categories</b>, using the weights above. We only show it when the categories with data carry at least {Math.round(COVERAGE_GATE * 100)}% of the total weight. Otherwise you&apos;ll see &quot;no score yet&quot;. Today {n} models pass. If a model is missing a category, that category counts at the model&apos;s own weakest measured category, so a gap in the data can never push a model up the ranking.
        </p>
        <p>
          <b>4. Your weights, your ranking.</b> On the <Link href="/leaderboard">leaderboard</Link> you can change the weights. That re-ranks models in your browser only, and the link keeps your settings.
        </p>
        <h2>Matching models across sources</h2>
        <p>
          Arena lists each model with its reasoning setting (for example &quot;High&quot; or &quot;Max&quot;), and we treat each one as its own entry. An Epoch AI result is attached only when it is clearly the same model and the same setting: same reasoning level, same thinking budget, and the same dated snapshot. If Epoch tested a different setting or snapshot, we leave it out rather than guess. A list price attaches only to the same snapshot. It applies to every reasoning setting of that model, because providers charge the same per token; higher settings just use more tokens.
        </p>
        <h2>Price</h2>
        <p>
          Prices are list prices in US dollars per 1 million tokens, from the OpenRouter models API. The single &quot;blended&quot; price assumes 3 parts input to 1 part output, a typical chat mix. Free, batch-only and router listings are ignored. Open models are served by several providers on OpenRouter, so their price is OpenRouter&apos;s listed price, not the only one available. If a model isn&apos;t listed, we say &quot;no price yet&quot;.
        </p>
        <h2>Speed</h2>
        <p>
          Coming soon. We&apos;re building our own hourly speed tests. Until they run, we show no speed numbers at all.
        </p>
        <h2>Coverage</h2>
        <p>
          The coverage badge on model pages, the leaderboard and Compare counts how many of the six categories have at least one measured result for that model, and names the ones that don&apos;t. It is a plain count, separate from the weighted coverage the score uses for its {Math.round(COVERAGE_GATE * 100)}% rule, and it never changes a score. Low coverage means a score rests on fewer tests, not that the model is weak.
        </p>
        <h2>History and rank charts</h2>
        <p>
          We keep every Arena dataset update we have fetched. Model pages chart each model&apos;s text and WebDev rating and rank at those updates, and the home page charts today&apos;s top 8 by text rank. A line starts when a model first appears on the board; we never draw points between updates or before a model existed. The ratings come from the Arena dataset and can differ slightly from the live arena.ai page, which may use a different view or a newer update.
        </p>
        <h2>Cost calculator</h2>
        <p>
          The <Link href="/tools/cost">cost calculator</Link> estimates a monthly bill as: tokens per month ÷ 1,000,000 × (input share × input price + output share × output price). The input:output ratio sets the shares, so 3:1 means 75% input and 25% output. It uses only list prices for the exact model version, from OpenRouter. Reasoning tokens are billed as output, so thinking-heavy settings can cost more than the estimate. Prompt caching, batch discounts and taxes are not included.
        </p>
        <h2>Links to sources</h2>
        <p>
          Where a source has a stable public page, the number links to it: Arena leaderboards for human-vote ratings, Epoch AI benchmark pages (and the run log on model pages) for test results, and the OpenRouter model page for prices. Every link pattern was checked to load before we used it. When no stable page exists, we link to the dataset instead.
        </p>
        <h2>Sharing a view</h2>
        <p>
          The leaderboard keeps its weight preset (or your custom weights), filters and sort in the page address, and Compare and the cost calculator keep their picked models. Copy the link to share exactly what you see. Filters hide rows and number the rest from 1; they never change a score.
        </p>
        <h2>What we never do</h2>
        <ul>
          <li>Invent, estimate or fill in missing numbers. Missing means &quot;no data yet&quot;.</li>
          <li>Take paid placements. SIscope is free forever.</li>
          {SOURCES.blocked.map((b) => (
            <li key={b.name}>
              Use {b.name} data, directly or relayed through another feed. {b.reason}
            </li>
          ))}
          <li>Scrape websites. Every source is an open dataset or a public API.</li>
        </ul>

        <h2>Sources and licences</h2>
        <p>
          The time at the top of every page is the last refresh that finished deploying and checking the public site. A failed refresh does not move it. The dates in the table are when each source&apos;s own data was current, which can be earlier.
        </p>
      </section>
      <div className="card scroll-x">
        <table className="tbl">
          <thead>
            <tr>
              <th>Source</th>
              <th>Licence</th>
              <th>Used for</th>
              <th>Data as of</th>
            </tr>
          </thead>
          <tbody>
            {SOURCES.sources.map((s) => (
              <tr key={s.id}>
                <td>
                  <a className="link" href={s.home} rel="noopener">{s.name}</a>
                  <div style={{ fontSize: 12.5, color: "var(--faint)" }}>{s.attribution}</div>
                </td>
                <td>{s.license_url ? <a className="link" href={s.license_url} rel="noopener license">{s.license}</a> : s.license}</td>
                <td style={{ color: "var(--muted)" }}>{s.used_for}</td>
                <td className="tnum" style={{ whiteSpace: "nowrap" }}>{fmtDate(s.as_of)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="section prose">
        <h2>Epoch AI tests we use</h2>
        <ul>
          {Object.entries(EPOCH_BENCHMARKS).map(([k, b]) => (
            <li key={k}>
              <b>{b.label}</b>: {b.description}. {b.n} models tested.
            </li>
          ))}
        </ul>
        <h2>Changelog</h2>
        <ul>
          <li>
            <b>Site update</b> (3 Nov 2026): Compare up to four models, leaderboard filters and shareable weight presets, coverage badges, rank-over-time charts, a cost calculator and links from numbers to their sources. Scores did not change.
          </li>
          <li>
            <b>v{SCORE_VERSION}</b> ({fmtDate(SCORE_DATE)}): missing categories now count at the model&apos;s weakest measured category instead of being skipped, and Epoch results attach only to an exact setting match.
          </li>
          <li>
            <b>v0.1.0</b> (3 Nov 2026): first public version. Six categories, Arena + Epoch AI inputs, {Math.round(COVERAGE_GATE * 100)}% coverage rule.
          </li>
        </ul>
        <p>
          Raw data is free to use: <a href="/api/v0/models.json">/api/v0/models.json</a>. Please keep the source attributions.
        </p>
      </section>
    </div>
  );
}
