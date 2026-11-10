/**
 * Presentation helpers. They do not change the score, weights, or coverage gate.
 * Missing results stay missing: they are never shown as zero and never called free.
 */
import { fmtDate, fmtPrice } from "./format";
import { CATEGORIES, COVERAGE_GATE, type CategoryId, type CategoryScores } from "./score";
import type { EpochResult, Model } from "./types";

export const RANK_NOTE =
  "SIscope overall blends the categories we measured. Arena text, WebDev and agent ranks are separate boards, so two settings of the same model can lead different lists. A missing test is left out, not scored as zero.";

export function settingLabel(base: string, variant: string | null | undefined): string {
  const b = base.trim();
  return variant ? `${b} (${variant})` : b;
}

export function measuredAndMissing(cats: CategoryScores): { measured: string[]; missing: string[] } {
  const measured: string[] = [];
  const missing: string[] = [];
  for (const c of CATEGORIES) (cats[c.id] == null ? missing : measured).push(c.label);
  return { measured, missing };
}

/** One line under a SIscope score. States the floor rule only when a score is actually shown. */
export function scoreFootnote(cats: CategoryScores, coverage: number, si: number | null): string {
  const { measured, missing } = measuredAndMissing(cats);
  if (si == null) {
    return `No SIscope score yet: measured categories cover ${Math.round(coverage * 100)}% of the weight, and ${Math.round(COVERAGE_GATE * 100)}% is required. Missing results are not zeros.`;
  }
  if (!missing.length) return "All six categories have a measured result. Nothing was filled in.";
  return `Measured: ${measured.join(", ")}. Not measured: ${missing.join(", ")}. A missing result is not a zero. The missing weight counts as this model's weakest measured category, so the gap cannot raise the score.`;
}

export type PriceStatus = { kind: "unknown" | "free" | "priced"; short: string; detail: string };

/** Unknown, listed free, and a positive list price are different facts. */
export function priceStatus(v: number | null | undefined): PriceStatus {
  if (v == null) {
    return {
      kind: "unknown",
      short: "No list price",
      detail: "Not listed on OpenRouter. Unknown is not free, and we do not guess a price.",
    };
  }
  if (v === 0) {
    return { kind: "free", short: "$0", detail: "OpenRouter lists this at $0 per 1M tokens." };
  }
  return { kind: "priced", short: fmtPrice(v), detail: `${fmtPrice(v)} per 1M tokens, blended 3 parts input to 1 part output, from OpenRouter.` };
}

export type DateFacts = {
  arenaBoard: string | null;
  arenaFetched: string | null;
  epochRuns: string[];
  epochFetched: string | null;
  priceAsOf: string | null;
};

export function dateFacts(m: { arena: Model["arena"]; epoch: Pick<EpochResult, "run_date" | "fetched_at">[]; price: Model["price"] }): DateFacts {
  const boards = [m.arena.text, m.arena.webdev, m.arena.vision, m.arena.agent].filter((b): b is NonNullable<typeof b> => !!b);
  const runs = [...new Set(m.epoch.map((e) => e.run_date).filter((d): d is string => !!d))].sort();
  return {
    arenaBoard: boards.map((b) => b.date).sort().at(-1) ?? null,
    arenaFetched: boards.map((b) => b.fetched_at).sort().at(-1) ?? null,
    epochRuns: runs,
    epochFetched: m.epoch.map((e) => e.fetched_at).sort().at(-1) ?? null,
    priceAsOf: m.price?.as_of ?? null,
  };
}

/** Board date, run date, and fetch date stay labeled as different events. */
export function dateSentence(f: DateFacts): string {
  const bits: string[] = [];
  if (f.arenaBoard) {
    bits.push(`Arena board date ${fmtDate(f.arenaBoard)} is when that ranking was published${f.arenaFetched ? `; we fetched it ${fmtDate(f.arenaFetched)}` : ""}.`);
  }
  if (f.epochRuns.length) {
    const run = f.epochRuns.length === 1 ? fmtDate(f.epochRuns[0]) : `${fmtDate(f.epochRuns[0])} to ${fmtDate(f.epochRuns[f.epochRuns.length - 1])}`;
    bits.push(`Epoch tests were run ${run}${f.epochFetched ? ` and fetched ${fmtDate(f.epochFetched)}` : ""}.`);
  }
  if (f.priceAsOf) bits.push(`The OpenRouter price was checked ${fmtDate(f.priceAsOf)}.`);
  return bits.join(" ");
}

export function verdictParagraph(m: {
  name: string;
  si: number | null;
  siRank: number | null;
  rankedTotal: number;
  cats: CategoryScores;
  coverage: number;
  open: boolean;
  price: number | null;
  /** Share of priced models that cost more than this one. */
  pricedShare: number | null;
}): string {
  const { measured, missing } = measuredAndMissing(m.cats);
  const parts: string[] = [];
  if (m.si != null && m.siRank) {
    parts.push(`${m.name} is #${m.siRank} of ${m.rankedTotal} by SIscope score (${m.si.toFixed(0)}/100).`);
  } else {
    parts.push(`${m.name} does not have an overall SIscope score yet (${Math.round(m.coverage * 100)}% of the weight is measured; ${Math.round(COVERAGE_GATE * 100)}% is required).`);
  }
  if (missing.length) {
    parts.push(`Measured: ${measured.join(", ")}. Not measured: ${missing.join(", ")}. Those gaps are not zeros.`);
  }
  const known = CATEGORIES.filter((c) => m.cats[c.id] != null).map((c) => ({ label: c.label.toLowerCase(), v: m.cats[c.id]! }));
  if (known.length >= 2) {
    const s = [...known].sort((a, b) => b.v - a.v);
    const top = s[0];
    const low = s[s.length - 1];
    if (top.v - low.v >= 8) parts.push(`Among measured categories, strongest at ${top.label} and weakest at ${low.label}.`);
    else if (missing.length) parts.push(`The measured categories sit close together, led by ${top.label}. That does not cover ${missing.join(", ")}.`);
    else parts.push(`Strong across every measured category, especially ${top.label}.`);
  } else if (known.length === 1) {
    parts.push(`The only measured category is ${known[0].label}.`);
  }
  const price = priceStatus(m.price);
  if (price.kind === "unknown") parts.push("There is no OpenRouter list price, so this is not treated as free.");
  else if (price.kind === "free") parts.push("OpenRouter lists the blended price at $0 per 1M tokens.");
  else if (m.pricedShare != null) {
    const p = Math.round(m.pricedShare * 100);
    parts.push(p >= 60 ? `The list price is lower than ${p}% of priced models.` : p <= 25 ? `On the pricey side: the list price is higher than ${100 - p}% of priced models.` : "Mid-range list price.");
  }
  if (m.open) parts.push("Weights are open, so you can run it yourself.");
  return parts.join(" ");
}

export type ScoreRow = {
  slug: string;
  name: string;
  si: number | null;
  cats: Partial<Record<CategoryId, number | null>>;
  price: number | null;
};

/** Winners at the precision the screen shows. One known value is not a win. Null is not a loss. */
export function displayedWinners(values: (number | null)[], mode: "hi" | "lo", format: (n: number) => string): { win: boolean[]; tie: boolean } {
  const win = values.map(() => false);
  const known = values.flatMap((v, i) => (v == null ? [] : [{ v, i }]));
  if (known.length < 2) return { win, tie: false };
  let best = known[0].v;
  for (const k of known) if (mode === "hi" ? k.v > best : k.v < best) best = k.v;
  const shown = format(best);
  let n = 0;
  for (const k of known) {
    if (format(k.v) === shown) {
      win[k.i] = true;
      n++;
    }
  }
  return { win, tie: n > 1 };
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/**
 * Short, deterministic tradeoff. Capability and price claims are included only
 * when at least two models have that result. Entirely empty groups are omitted
 * by the caller; this text does not treat a gap as zero.
 */
export function compareSummary(rows: ScoreRow[]): { summary: string; limits: string[] } {
  if (rows.length < 2) return { summary: "Add a second model to see a tradeoff.", limits: [] };
  const parts: string[] = [];
  const limits: string[] = [];

  const scoreText = (n: number) => n.toFixed(1);
  const siVals = rows.map((r) => r.si);
  const siWin = displayedWinners(siVals, "hi", scoreText);
  const siKnown = rows.filter((r) => r.si != null);
  if (siKnown.length === 0) parts.push("None of these models have a SIscope score.");
  else if (siKnown.length === 1) parts.push(`Only ${siKnown[0].name} has a SIscope score (${siKnown[0].si!.toFixed(0)}).`);
  else if (siWin.tie) {
    const names = rows.filter((_, i) => siWin.win[i]).map((r) => r.name);
    parts.push(`${joinNames(names)} tie on SIscope score (${scoreText(rows.find((_, i) => siWin.win[i])!.si!)}).`);
  } else {
    const i = siWin.win.indexOf(true);
    parts.push(`${rows[i].name} leads on SIscope score (${scoreText(rows[i].si!)}).`);
  }

  const catBits: string[] = [];
  for (const c of CATEGORIES) {
    const vals = rows.map((r) => (typeof r.cats[c.id] === "number" ? (r.cats[c.id] as number) : null));
    const known = vals.filter((v) => v != null).length;
    if (known === 0) continue;
    if (known === 1) {
      const i = vals.findIndex((v) => v != null);
      catBits.push(`only ${rows[i].name} has ${c.short} (${scoreText(vals[i]!)})`);
      continue;
    }
    const w = displayedWinners(vals, "hi", scoreText);
    const siLeader = siWin.win.indexOf(true);
    if (w.tie) catBits.push(`${joinNames(rows.filter((_, i) => w.win[i]).map((r) => r.name))} tie on ${c.short}`);
    else {
      const i = w.win.indexOf(true);
      if (siWin.tie || i !== siLeader || known < rows.length) catBits.push(`${rows[i].name} leads ${c.short} (${scoreText(vals[i]!)})`);
    }
  }
  if (catBits.length) parts.push(`${catBits[0].charAt(0).toUpperCase()}${catBits[0].slice(1)}${catBits.length > 1 ? `; ${catBits.slice(1).join("; ")}` : ""}.`);
  else if (siKnown.length >= 2) parts.push("Where at least two models have a category result, the same model leads.");

  const priced = rows.filter((r): r is ScoreRow & { price: number } => r.price != null);
  const unpriced = rows.filter((r) => r.price == null);
  if (priced.length >= 2) {
    const w = displayedWinners(rows.map((r) => r.price), "lo", (n) => fmtPrice(n));
    const cheap = rows[w.win.indexOf(true)];
    const dear = priced.reduce((a, b) => (a.price >= b.price ? a : b));
    if (w.tie && w.win.filter(Boolean).length === priced.length) {
      parts.push(`The listed blended price is ${fmtPrice(priced[0].price)} per 1M tokens for each model that has one.`);
    } else if (w.tie) {
      parts.push(`${joinNames(rows.filter((_, i) => w.win[i]).map((r) => r.name))} tie for the lowest blended list price (${fmtPrice(cheap.price)} per 1M).`);
    } else if (cheap.price != null && dear.slug !== cheap.slug && dear.price > cheap.price) {
      if (cheap.price === 0) parts.push(`${cheap.name} is listed at $0 per 1M tokens. ${dear.name} is listed at ${fmtPrice(dear.price)}.`);
      else {
        const ratio = dear.price / cheap.price;
        const factor = ratio >= 1.15 ? `, about ${ratio >= 10 ? `${Math.round(ratio)}×` : `${ratio.toFixed(1)}×`} as much` : "";
        parts.push(`${cheap.name} has the lowest blended list price, ${fmtPrice(cheap.price)} per 1M. ${dear.name} is ${fmtPrice(dear.price)}${factor}.`);
      }
    }
  } else if (priced.length === 1) {
    parts.push(
      priced[0].price === 0
        ? `${priced[0].name} is listed at $0 per 1M tokens.`
        : `Only ${priced[0].name} has a blended list price (${fmtPrice(priced[0].price)} per 1M).`,
    );
  }
  if (unpriced.length) limits.push(`No OpenRouter list price for ${joinNames(unpriced.map((r) => r.name))}. Unknown is not free.`);
  if (CATEGORIES.some((c) => rows.some((r) => typeof r.cats[c.id] === "number") && rows.some((r) => typeof r.cats[c.id] !== "number"))) {
    limits.push("Where a model has no result, that gap is not a zero and it is not counted as a loss.");
  }
  return { summary: parts.join(" "), limits };
}

/** First distinct slugs, at most three. Later slugs are fallbacks, not coverage picks. */
export function compareDefaultSlugs(slugs: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const s of slugs) {
    if (!s || out.includes(s)) continue;
    out.push(s);
    if (out.length === 3) break;
  }
  return out;
}

export function splitCovered<T>(items: T[], present: (item: T) => boolean): { shown: T[]; hidden: T[] } {
  const shown: T[] = [];
  const hidden: T[] = [];
  for (const item of items) (present(item) ? shown : hidden).push(item);
  return { shown, hidden };
}
