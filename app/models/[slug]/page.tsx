import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, OpenTag } from "@/components/Avatar";
import { HistoryChart, Radar, RankChart } from "@/components/charts";
import { CoverageDots, coverageOf, coverageText } from "@/components/Coverage";
import { ARENA_BOARD_URL, epochBenchUrl, openrouterUrl } from "@/lib/links";
import { CatBars } from "@/components/CatBars";
import { JsonLd } from "@/components/JsonLd";
import { EPOCH_BENCHMARKS, allModels, modelBySlug, siRanked, sourceById } from "@/lib/data";
import { fmtCtx, fmtDate, fmtInt, fmtPrice, fmtPriceExact } from "@/lib/format";
import { orgName } from "@/lib/orgs";
import { suggestions } from "@/lib/advice";
import { CopyButton } from "@/components/CopyButton";
import { dateFacts, dateSentence, priceStatus, scoreFootnote, settingLabel, verdictParagraph } from "@/lib/present";
import { COVERAGE_GATE } from "@/lib/score";
import { SITE, og } from "@/lib/site";

// This route has to read the slug before it can render. Opt out of the dev-only instant-navigation notice.
export const instant = false;

export function generateStaticParams() {
  return allModels().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/models/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const m = modelBySlug(slug);
  if (!m) return { title: "Model not found", robots: { index: false, follow: true } };
  const bits = [m.si != null ? `SIscope score ${m.si.toFixed(0)}/100` : null, m.price ? `${fmtPrice(m.price.blended_per_m)} per 1M tokens` : null].filter(Boolean).join(", ");
  return {
    title: m.name,
    description: `${m.name} by ${orgName(m.org)}. ${bits ? bits + ". " : ""}Arena ranks, written-test scores and the OpenRouter list price.`,
    alternates: { canonical: `/models/${m.slug}` }, openGraph: og(`/models/${m.slug}`),
  };
}

const BOARDS = [
  { k: "text", label: "Arena text", what: "People vote on chat answers" },
  { k: "webdev", label: "Arena WebDev", what: "People vote on web apps the model builds" },
  { k: "vision", label: "Arena vision", what: "People vote on answers about images" },
  { k: "agent", label: "Arena agents", what: "Scores from real multi-step sessions" },
] as const;

const PROMPT_KINDS: [string, string][] = [
  ["coding", "Coding prompts"],
  ["math", "Math prompts"],
  ["creative_writing", "Writing prompts"],
  ["instruction_following", "Instruction prompts"],
  ["hard_prompts", "Hard prompts"],
  ["multi_turn", "Back-and-forth chats"],
  ["longer_query", "Long questions"],
  ["non_english", "Languages other than English"],
];

const MODALITY: Record<string, string> = {
  text: "Text",
  image: "Images",
  file: "Files",
  audio: "Audio",
  video: "Video",
};

export default async function ModelPage({ params }: PageProps<"/models/[slug]">) {
  const { slug } = await params;
  const m = modelBySlug(slug);
  // Unknown slugs are not prebuilt. notFound() stops the page before it streams, which keeps a 404 and a noindex tag.
  if (!m) notFound();
  const ranked = siRanked();
  const priced = allModels().filter((x) => x.price);
  const pricedShare = m.price ? priced.filter((x) => x.price!.blended_per_m > m.price!.blended_per_m).length / priced.length : null;
  const color = m.open ? "var(--c-open)" : "var(--c-closed)";
  const siblings = allModels().filter((x) => x.base === m.base && x.slug !== m.slug);
  const rival = ranked.find((x) => x.slug !== m.slug && x.open !== m.open) ?? ranked.find((x) => x.slug !== m.slug);
  const arenaSrc = sourceById("arena");
  const epochSrc = sourceById("epoch");
  const orSrc = sourceById("openrouter");
  const cov = coverageOf(m.cats);
  const dates = dateFacts(m);
  const when = dateSentence(dates);
  const price = priceStatus(m.price?.blended_per_m ?? null);
  const verdict = verdictParagraph({
    name: settingLabel(m.base, m.variant),
    si: m.si,
    siRank: m.siRank,
    rankedTotal: ranked.length,
    cats: m.cats,
    coverage: m.coverage,
    open: m.open,
    price: m.price?.blended_per_m ?? null,
    pricedShare,
  });

  return (
    <div className="wrap">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Leaderboard", item: `${SITE.url}/leaderboard` },
                { "@type": "ListItem", position: 2, name: m.name, item: `${SITE.url}/models/${m.slug}` },
              ],
            },
            {
              "@type": "Dataset",
              name: `${m.name} scores and price`,
              description: `Human-vote rankings, independent benchmark results and list price for ${m.name}.`,
              url: `${SITE.url}/models/${m.slug}`,
              creator: { "@type": "Organization", name: "SIscope" },
              isBasedOn: [arenaSrc.home, epochSrc.home, orSrc.home],
              license: "https://creativecommons.org/licenses/by/4.0/",
              dateModified: m.arena.text?.date ?? arenaSrc.as_of,
            },
          ],
        }}
      />
      <div className="page-head">
        <div className="crumbs">
          <Link href="/leaderboard">Leaderboard</Link> / {orgName(m.org)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Avatar org={m.org} size={48} />
          <div style={{ minWidth: 0 }}>
            <h1 className="h1 model-title" style={{ margin: 0 }}>
              <span>{m.base}</span>
              {m.variant ? <span className="setting">{m.variant}</span> : <span className="setting">Default</span>}
            </h1>
            <p className="sub" style={{ marginTop: 6 }}>This page is one setting. Other settings of {m.base} are scored on their own.</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 6, color: "var(--muted)", fontSize: 15 }}>
              {orgName(m.org)} <OpenTag open={m.open} showClosed /> <span className="chip">{m.model_license}</span>
            </div>
          </div>
        </div>
        <div className="kf" role="list" aria-label="Key facts">
          <div className="card stat lead" role="listitem">
            <div className="k">SIscope score</div>
            <div className="v">{m.si != null ? <>{m.si.toFixed(0)}<small>/100</small></> : <span className="nodata" style={{ fontSize: 17 }}>No score yet</span>}</div>
            <div className="d">{m.si != null ? `#${m.siRank} of ${ranked.length} scored models. Not an Arena rank.` : `${Math.round(m.coverage * 100)}% of the weight is measured. A score needs ${COVERAGE_GATE * 100}%.`}</div>
          </div>
          {(["text", "webdev"] as const).map((b) => {
            const a = m.arena[b];
            return (
              <div key={b} className="card stat" role="listitem">
                <div className="k">{b === "text" ? "Arena text rank" : "Arena WebDev rank"}</div>
                <div className="v">{a ? `#${a.rank}` : <span className="nodata" style={{ fontSize: 17 }}>Not on board</span>}</div>
                <div className="d">{a ? `of ${a.board_size} · vote score ${Math.round(a.rating!)}` : "Not on this board. That is not a zero."}</div>
              </div>
            );
          })}
          <div className="card stat" role="listitem">
            <div className="k">List price</div>
            <div className="v">{price.kind === "unknown" ? <span className="nodata" style={{ fontSize: 17 }}>{price.short}</span> : <>{price.short}<small>/1M</small></>}</div>
            <div className="d">{m.price ? `${fmtPriceExact(m.price.input_per_m)} in · ${fmtPriceExact(m.price.output_per_m)} out. Three input tokens per output token, from OpenRouter.` : "No public list price. That is unknown, not free."}</div>
          </div>
          <div className="card stat" role="listitem">
            <div className="k">Context window</div>
            <div className="v">{m.price?.context_length ? fmtCtx(m.price.context_length) : <span className="nodata" style={{ fontSize: 17 }}>No data yet</span>}</div>
            <div className="d">{m.price?.context_length ? `${fmtInt(m.price.context_length)} tokens` : "Not on the OpenRouter listing"}</div>
          </div>
          <div className="card stat" role="listitem">
            <div className="k">Weights</div>
            <div className="v" style={{ color: m.open ? "var(--open-ink)" : undefined }}>{m.open ? "Open" : "Closed"}</div>
            <div className="d" title={m.model_license}>{m.model_license}</div>
          </div>
          <div className="card stat" role="listitem">
            <div className="k">Categories measured</div>
            <div className="v">{cov.n}<small>/{cov.total}</small><CoverageDots cats={m.cats} /></div>
            <div className="d" title={coverageText(m.cats)}>{cov.missing.length ? `Missing: ${cov.missing.join(", ")}` : "Every category has data"}</div>
          </div>
          <div className="card stat" role="listitem">
            <div className="k">{dates.arenaBoard ? "Arena board date" : dates.epochRuns.length ? "Epoch run" : "Price checked"}</div>
            <div className="v" style={{ fontSize: 20, paddingBlock: 4 }}>{fmtDate(dates.arenaBoard ?? dates.epochRuns[0] ?? dates.priceAsOf)}</div>
            <div className="d">{dates.arenaBoard ? `Ranking published${dates.arenaFetched ? ` · fetched ${fmtDate(dates.arenaFetched)}` : ""}` : dates.epochRuns.length ? "When the test was run, not when we fetched it" : "OpenRouter list price"}</div>
          </div>
        </div>
        {(m.arena.vision || m.arena.agent || m.price?.modalities_in?.length) && (
          <p className="score-note">
            {m.arena.vision ? `Arena vision #${m.arena.vision.rank} of ${m.arena.vision.board_size}. ` : "No Arena vision result. "}
            {m.arena.agent ? `Arena agents #${m.arena.agent.rank} of ${m.arena.agent.board_size}. ` : "No Arena agent result. "}
            {m.price?.modalities_in?.length ? `OpenRouter lists inputs: ${m.price.modalities_in.map((id) => MODALITY[id] ?? id).join(", ")}.` : ""}
          </p>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          {rival && (
            <Link className="btn primary" href={`/compare?m=${m.slug},${rival.slug}`}>
              Compare with {settingLabel(rival.base, rival.variant)}
            </Link>
          )}
          <Link className="btn" href={`/compare?m=${m.slug}`}>
            Add another model
          </Link>
          {m.price && (
            <Link className="btn" href={`/tools/cost?m=${m.slug}`}>
              Price a month
            </Link>
          )}
          <CopyButton text={`${SITE.url}/models/${m.slug}`} label="page" caption="Copy link" />
        </div>
        {suggestions(m, allModels()).length > 0 && (
          <div className="alts">
            <h2 className="h2" style={{ fontSize: 18 }}>Nearby choices</h2>
            {suggestions(m, allModels()).map((s) => (
              <Link key={s.slug} href={`/models/${s.slug}`} className="card alt">
                <span className="n">{s.name}</span>
                <span className="note" style={{ margin: 0 }}>{s.line}</span>
              </Link>
            ))}
          </div>
        )}
        {siblings.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, alignItems: "center", fontSize: 14, color: "var(--muted)" }}>
            Other settings of this model:
            {siblings.slice(0, 6).map((s) => (
              <Link key={s.slug} href={`/models/${s.slug}`} className="src">
                {s.variant ?? "Default"}
                {s.si != null ? ` · ${s.si.toFixed(0)}` : ""}
              </Link>
            ))}
          </div>
        )}
        <p className="score-note">{scoreFootnote(m.cats, m.coverage, m.si)}</p>
        {when ? <p className="score-note">{when}</p> : null}
        <p className="score-note">The SIscope score is not an Arena rank. A board with no result is missing data, not a zero.</p>
        <details className="score-note">
          <summary>Arena text rank by prompt type</summary>
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
            {PROMPT_KINDS.map(([id, label]) => {
              const cat = m.arena.text_categories?.cats[id];
              return (
                <li key={id}>
                  {label}: {cat ? `#${cat.rank} of ${cat.board_size}` : "No result"}
                </li>
              );
            })}
          </ul>
        </details>
      </div>

      <div className="card verdict">
        <div className="eyebrow" style={{ marginBottom: 6 }}>Verdict</div>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.5 }}>{verdict}</p>
      </div>

      <section className="section">
        <div className="grid2" style={{ gridTemplateColumns: "1fr 1.2fr" }}>
          <div className="card" style={{ padding: 20 }}>
            <h2 className="h2">Where it is strong</h2>
            <p className="sub">Each spoke is one category. The edge is 100. A spoke at the centre has no result, and that is not a zero.</p>
            <div style={{ marginTop: 10 }}>
              <Radar series={[{ label: m.name, cats: m.cats, color }]} />
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <h2 className="h2">Score by category</h2>
            <p className="sub" style={{ marginBottom: 10 }}>90 means better than about 90% of models measured on that category.</p>
            <CatBars cats={m.cats} open={m.open} />
            <p className="note">
              <Link className="link" href="/methodology">What goes into each category</Link> ·{" "}
              {rival && (
                <Link className="link" href={`/compare?m=${m.slug},${rival.slug}`}>
                  Compare with {settingLabel(rival.base, rival.variant)}
                </Link>
              )}
            </p>
          </div>
        </div>
      </section>

      {(m.history.text || m.history.webdev) && (
        <section className="section">
          <div className="grid2" style={{ gridTemplateColumns: m.history.text && m.history.webdev ? "1fr 1fr" : "1fr" }}>
            {m.history.text && (
              <div className="card" style={{ padding: 20 }}>
                <h2 className="h2">Chat votes over time</h2>
                <p className="sub">Vote score, then place on the Arena text board. {m.history.text.length} updates on file.</p>
                <HistoryChart points={m.history.text} color={color} wide={!m.history.webdev} />
                <RankChart points={m.history.text} color={color} label="Arena text place" />
                <p className="note"><a className="link" href={ARENA_BOARD_URL.text} rel="noopener">Text arena on Arena ↗</a></p>
              </div>
            )}
            {m.history.webdev && (
              <div className="card" style={{ padding: 20 }}>
                <h2 className="h2">Web-app votes over time</h2>
                <p className="sub">Vote score, then place on the Arena WebDev board. {m.history.webdev.length} updates on file.</p>
                <HistoryChart points={m.history.webdev} color={color} wide={!m.history.text} />
                <RankChart points={m.history.webdev} color={color} label="Arena WebDev place" />
                <p className="note"><a className="link" href={ARENA_BOARD_URL.webdev} rel="noopener">WebDev arena on Arena ↗</a></p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="h2">Written tests</h2>
        <p className="sub" style={{ marginBottom: 14 }}>Epoch AI runs the same test for every model. The bar is the share of questions answered correctly. A missing test is not a zero.</p>
        {m.epoch.length === 0 ? (
          <p className="note" style={{ marginTop: 0 }}>No Epoch AI run is attached to this setting. A missing run is not a zero.</p>
        ) : (
          <div className="bench-grid">
            {m.epoch.map((e) => {
              const b = EPOCH_BENCHMARKS[e.benchmark];
              return (
                <div key={e.benchmark} className="card" style={{ padding: 18, display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <a href={epochBenchUrl(e.benchmark)} rel="noopener" style={{ fontWeight: 700 }} title={`${b?.label ?? e.benchmark} on Epoch AI`}>{b?.label ?? e.benchmark}</a>
                    <span className="tnum" style={{ fontWeight: 750, fontSize: 20 }}>{Math.round(e.score * 100)}%</span>
                  </div>
                  <span className="barw">
                    <span className={`bar ${m.open ? "open" : ""}`} style={{ width: `${Math.max(2, e.score * 100)}%` }} />
                  </span>
                  <div style={{ fontSize: 13.5, color: "var(--muted)" }}>{b?.description}</div>
                  <div style={{ fontSize: 13, color: "var(--faint)" }}>
                    {e.pct != null && e.tested_models ? `Better than ${Math.round(e.pct)}% of ${e.tested_models} tested models. ` : ""}
                    {e.approx ? `Tested with a different setting (${e.tested_as}). ` : ""}
                    {e.run_date ? `Run ${fmtDate(e.run_date)}.` : "Run date not published."} Fetched {fmtDate(e.fetched_at)}.
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <a className="src" href={epochBenchUrl(e.benchmark)} rel="noopener">Epoch AI results ↗</a>
                    {e.log_url && (
                      <a className="src" href={e.log_url} rel="noopener nofollow">
                        Run log ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="h2">Vote boards</h2>
        <p className="sub" style={{ marginBottom: 14 }}>People compare two anonymous answers and pick one. The score works like a chess rating. A blank row is a missing result, not a zero.</p>
        <div className="card scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>Arena</th>
                <th>Rank</th>
                <th>Score</th>
                <th>Range (95%)</th>
                <th>Votes</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {BOARDS.map((b) => {
                const a = m.arena[b.k];
                return (
                  <tr key={b.k}>
                    <td>
                      <a href={ARENA_BOARD_URL[b.k]} rel="noopener" style={{ fontWeight: 600 }} className="link">{b.label} ↗</a>
                      <div style={{ fontSize: 12.5, color: "var(--faint)" }}>{b.what}</div>
                    </td>
                    {a ? (
                      <>
                        <td className="tnum">#{a.rank} of {a.board_size}</td>
                        <td className="tnum">{b.k === "agent" ? `${((a.score ?? 0) * 100).toFixed(1)}%` : Math.round(a.rating!)}</td>
                        <td className="tnum" style={{ color: "var(--muted)" }}>{b.k === "agent" ? `${(a.lo * 100).toFixed(1)}–${(a.hi * 100).toFixed(1)}%` : `${Math.round(a.lo)}–${Math.round(a.hi)}`}</td>
                        <td className="tnum" style={{ color: "var(--muted)" }}>{fmtInt(a.votes ?? a.sessions)}</td>
                        <td style={{ color: "var(--muted)" }}>{fmtDate(a.date)}</td>
                      </>
                    ) : (
                      <td colSpan={5} className="nodata">Not on this board yet</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note">
          Source: <a className="link" href={arenaSrc.home} rel="noopener">{arenaSrc.name}</a>, {arenaSrc.license}. The date in each row is when Arena published that board. We fetched the dataset {fmtDate(arenaSrc.fetched_at)}. “Not on this board yet” is a missing result, not a zero.
        </p>
      </section>

      <section className="section">
        <h2 className="h2">What a million tokens costs</h2>
        {m.price ? (
          <div>
            <div className="price-grid">
              {([
                ["Input", fmtPriceExact(m.price.input_per_m), "per 1M tokens"],
                ["Output", fmtPriceExact(m.price.output_per_m), "per 1M tokens"],
                ["Blended", fmtPriceExact(m.price.blended_per_m), "3 in : 1 out, per 1M"],
                ["Context window", fmtCtx(m.price.context_length), "max tokens per request"],
              ] as const).map(([k, v, d]) => (
                <div key={k} className="card stat">
                  <div className="k">{k}</div>
                  <div className="v">{v}</div>
                  <div className="d">{d}</div>
                </div>
              ))}
              <div className="card stat">
                <div className="k">Speed</div>
                <div className="v"><span className="soon">Not measured yet</span></div>
                <div className="d">our own tests</div>
              </div>
            </div>
            <p className="note">
              List price from the OpenRouter models API, {fmtDate(m.price.as_of)}: <a className="link" href={openrouterUrl(m.price.openrouter_id)} rel="noopener">{m.price.openrouter_id} on OpenRouter ↗</a>. Providers can charge differently.
            </p>
          </div>
        ) : (
          <p className="note" style={{ marginTop: 0 }}>{price.detail} We only show OpenRouter list prices, matched to this model&apos;s snapshot.</p>
        )}
      </section>
    </div>
  );
}
