/**
 * Homepage and compare defaults. Three distinct cards: overall, open-weight, and value.
 */
import { allModels, siRanked, type Enriched } from "./data";
import { measuredAndMissing, settingLabel, compareDefaultSlugs } from "./present";
import { fmtDate, fmtPrice } from "./format";
import { CHEAP_MAX, VALUE_MIN_SI } from "./tasks";
import { formatScore } from "./facts";
import { headlineEligible } from "./score";

export type DecisionCard = {
  kind: "overall" | "open" | "value";
  kicker: string;
  rankKind: string;
  slug: string;
  href: string;
  base: string;
  variant: string | null;
  name: string;
  org: string;
  open: boolean;
  score: string;
  unit: string;
  reason: string;
  limit: string;
  /** One line for the homepage card. The longer reason stays behind “Why”. */
  glance: string;
  /** Quiet source date. Empty when that card has no dated source. */
  asof: string;
};

export type Decisions = {
  overall: DecisionCard;
  open: DecisionCard;
  value: DecisionCard;
  compareSlugs: string[];
  compareHref: string;
  rankedCount: number;
  trackedCount: number;
};

const VALUE_CAPS = [CHEAP_MAX, 3, 10];
const VALUE_FLOORS = [VALUE_MIN_SI, 60];

function cardBase(kind: DecisionCard["kind"], m: Enriched, kicker: string, rankKind: string, score: string, unit: string, glance: string, reason: string, limit: string, asof: string): DecisionCard {
  return {
    kind,
    kicker,
    rankKind,
    slug: m.slug,
    href: `/models/${m.slug}`,
    base: m.base,
    variant: m.variant,
    name: settingLabel(m.base, m.variant),
    org: m.org,
    open: m.open,
    score,
    unit,
    glance,
    reason,
    limit,
    asof,
  };
}

function overallGlance(m: Enriched, total: number): string {
  const arena = m.arena.text ? `Arena text #${m.arena.text.rank}` : "no Arena text rank";
  return `#${m.siRank} of ${total} · ${arena}`;
}

function gapLimit(m: Enriched): string {
  const { missing } = measuredAndMissing(m.cats);
  if (!missing.length) return "Every score category has a measured result.";
  return `Not measured: ${missing.join(", ")}. A missing result is not a zero.`;
}

function capText(cap: number): string {
  return cap < 1 ? cap.toFixed(2) : String(cap);
}

function pickOpen(ranked: Enriched[], overall: Enriched): { m: Enriched; role: "best" | "next" | "fallback" } {
  const rest = ranked.filter((m) => m.slug !== overall.slug);
  const open = rest.find((m) => m.open && headlineEligible(m.comp)) ?? rest.find((m) => m.open);
  if (!open) return { m: rest[0] ?? overall, role: "fallback" };
  const absolute = ranked.find((m) => m.open && headlineEligible(m.comp)) ?? ranked.find((m) => m.open);
  return { m: open, role: absolute?.slug === open.slug ? "best" : "next" };
}

function pickValue(ranked: Enriched[], taken: Set<string>): { m: Enriched; cap: number | null; floor: number } | null {
  const priced = ranked.filter((m) => m.price && m.price.blended_per_m > 0 && !taken.has(m.slug));
  const passes: { cap: number; floor: number }[] = [];
  for (const cap of VALUE_CAPS) for (const floor of VALUE_FLOORS) passes.push({ cap, floor });
  for (const cap of VALUE_CAPS) passes.push({ cap, floor: 0 });
  for (const { cap, floor } of passes) {
    const hits = priced.filter((m) => (m.si ?? 0) >= floor && m.price!.blended_per_m <= cap);
    hits.sort((a, b) => b.si! - a.si! || a.price!.blended_per_m - b.price!.blended_per_m);
    if (hits[0]) return { m: hits[0], cap, floor };
  }
  const cheapest = [...priced].sort((a, b) => a.price!.blended_per_m - b.price!.blended_per_m)[0];
  return cheapest ? { m: cheapest, cap: null, floor: 0 } : null;
}

export function buildDecisions(ranked: Enriched[] = siRanked(), pool: Enriched[] = allModels()): Decisions {
  const eligible = ranked.filter((m) => headlineEligible(m.comp));
  const list = eligible.length ? eligible : ranked;
  const overallM = list[0];
  const n = ranked.length;
  const opened = pickOpen(list, overallM);
  const openM = opened.m;
  const taken = new Set([overallM.slug, openM.slug]);
  const valued = pickValue(list, taken) ?? pickValue(ranked, taken);
  const valueM = valued?.m ?? ranked.find((m) => !taken.has(m.slug)) ?? overallM;
  const valueCap = valued?.cap ?? null;
  const valueFloor = valued?.floor ?? 0;

  const overallBits = [`SIscope Score ${formatScore(overallM.si)}, a percentile composite, #${overallM.siRank} of ${n} scored models.`];
  if (overallM.arena.text) overallBits.push(`Arena text rank is #${overallM.arena.text.rank} of ${overallM.arena.text.board_size}, a separate chat-vote board.`);
  else overallBits.push("This setting has no Arena text rank.");

  const openKicker = opened.role === "best" ? "Best open-weight" : opened.role === "next" ? "Next open-weight" : "Next scored setting";
  const openReason = opened.role === "fallback"
    ? `No separate open-weight model cleared the headline rule, so this card is the next scored setting: ${formatScore(openM.si)}.`
    : opened.role === "next"
      ? `The overall card is already the best open-weight score, so this is the next open-weight setting: ${formatScore(openM.si)}.`
      : `Highest open-weight SIscope Score: ${formatScore(openM.si)}.`;

  const primary = valueCap === CHEAP_MAX && valueFloor === VALUE_MIN_SI;
  const capLabel = valueCap == null ? "Lowest list price" : `Under $${capText(valueCap)}/1M`;
  const valueReason = primary
    ? `Highest SIscope score (${valueM.si!.toFixed(0)}) listed at or under $${CHEAP_MAX} per 1M with a score of at least ${VALUE_MIN_SI}.`
    : `Nothing scored ${VALUE_MIN_SI} or higher is listed at $${CHEAP_MAX} or less per 1M, so this card uses ${valueCap == null ? "the lowest list price among scored models" : `a cap of $${capText(valueCap)} per 1M`}${valueFloor ? ` and a score of at least ${valueFloor}` : ""}.`;
  const priceBit = valueM.price ? ` Listed at ${fmtPrice(valueM.price.blended_per_m)} per 1M.` : "";

  const compareSlugs = compareDefaultSlugs([overallM.slug, openM.slug, valueM.slug]);
  return {
    overall: cardBase("overall", overallM, "Best overall", "SIscope score", formatScore(overallM.si), "", overallGlance(overallM, n), overallBits.join(" "), gapLimit(overallM), overallM.arena.text ? `Arena text through ${fmtDate(overallM.arena.text.date, { year: false })}` : ""),
    open: cardBase("open", openM, openKicker, "SIscope score", formatScore(openM.si), "", opened.role === "fallback" ? `Next score · #${openM.siRank}` : `Open-weight · #${openM.siRank}`, openReason, gapLimit(openM), openM.arena.text ? `Arena text through ${fmtDate(openM.arena.text.date, { year: false })}` : ""),
    value: cardBase(
      "value",
      valueM,
      `Best value · ${capLabel}`,
      "SIscope score",
      formatScore(valueM.si),
      "",
      capLabel,
      `${valueReason}${priceBit}`,
      gapLimit(valueM),
      valueM.price?.as_of ? `OpenRouter price checked ${fmtDate(valueM.price.as_of, { year: false })}` : "",
    ),
    compareSlugs,
    compareHref: `/compare?m=${compareSlugs.join(",")}`,
    rankedCount: n,
    trackedCount: pool.length,
  };
}
