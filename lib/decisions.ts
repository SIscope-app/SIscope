/**
 * Homepage and compare defaults. Wording only: who ranks first still comes from
 * the existing score and the existing value rule.
 */
import { allModels, siRanked, type Enriched } from "./data";
import { measuredAndMissing, settingLabel, compareDefaultSlugs } from "./present";
import { fmtPrice } from "./format";
import { CHEAP_MAX, VALUE_MIN_SI, TASKS, bestValue, taskRanking } from "./tasks";

export type DecisionCard = {
  kind: "overall" | "coding" | "value";
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
};

export type OpenPick = { slug: string; href: string; name: string; score: string; rank: number };

export type Decisions = {
  overall: DecisionCard;
  coding: DecisionCard;
  value: DecisionCard | null;
  open: OpenPick;
  compareSlugs: string[];
  compareHref: string;
  rankedCount: number;
  trackedCount: number;
};

function cardBase(kind: DecisionCard["kind"], m: Enriched, kicker: string, rankKind: string, score: string, unit: string, glance: string, reason: string, limit: string): DecisionCard {
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
  };
}

function overallGlance(m: Enriched, total: number): string {
  const arena = m.arena.text ? `Arena text #${m.arena.text.rank}` : "no Arena text rank";
  return `#${m.siRank} of ${total} · ${arena}`;
}

function codingGlance(m: Enriched): string {
  const web = m.arena.webdev ? `WebDev #${m.arena.webdev.rank}` : "no WebDev rank";
  return m.siRank === 1 ? `${web} · also overall #1` : `${web} · not overall`;
}

function gapLimit(m: Enriched): string {
  const { missing } = measuredAndMissing(m.cats);
  if (!missing.length) return "Every score category has a measured result.";
  return `Not measured: ${missing.join(", ")}. A missing result is not a zero.`;
}

function codingEvidence(m: Enriched): { built: string[]; absent: string[] } {
  const built: string[] = [];
  const absent: string[] = [];
  if (m.arena.webdev) built.push(`Arena WebDev #${m.arena.webdev.rank} of ${m.arena.webdev.board_size}`);
  else absent.push("no WebDev arena result");
  const coding = m.arena.text_categories?.cats.coding;
  if (coding) built.push(`text-arena coding prompts #${coding.rank} of ${coding.board_size}`);
  else absent.push("no text-arena coding result");
  const swe = m.epoch.find((e) => e.benchmark === "swe_bench_verified");
  if (swe) built.push(`SWE-bench Verified ${Math.round(swe.score * 100)}% correct`);
  else absent.push("no SWE-bench run");
  return { built, absent };
}

export function buildDecisions(ranked = siRanked()): Decisions {
  const overallM = ranked[0];
  const codingTask = TASKS.find((t) => t.slug === "coding")!;
  const codingM = taskRanking(codingTask)[0].m;
  const valueM = bestValue(ranked, [overallM.base]);
  const openM = ranked.find((m) => m.open) ?? overallM;
  const n = ranked.length;

  const overallBits = [`SIscope overall ${overallM.si!.toFixed(0)}/100, #${overallM.siRank} of ${n} scored models.`];
  if (overallM.arena.text) overallBits.push(`Arena text rank is #${overallM.arena.text.rank} of ${overallM.arena.text.board_size}, a separate chat-vote board.`);
  else overallBits.push("This setting has no Arena text rank.");
  if (overallM.arena.webdev) overallBits.push(`Arena WebDev rank is #${overallM.arena.webdev.rank} of ${overallM.arena.webdev.board_size}, also a separate board.`);

  const evidence = codingEvidence(codingM);
  const codingBits = [`Coding score ${codingM.cats.coding!.toFixed(0)}/100, the highest coding score in this snapshot.`];
  if (evidence.built.length) codingBits.push(`Built from ${evidence.built.join(", ")}.`);
  codingBits.push(codingM.siRank === 1 ? "This setting is also #1 by SIscope overall." : "This coding score is not the SIscope overall rank.");
  const codingLimit = evidence.absent.length ? `For this setting: ${evidence.absent.join("; ")}. Missing is not a zero.` : "This setting has every coding test we track.";

  let value: DecisionCard | null = null;
  if (valueM?.price) {
    const same = valueM.slug === overallM.slug ? "the overall pick" : valueM.slug === codingM.slug ? "the coding pick" : null;
    const vs = overallM.price && valueM.slug !== overallM.slug ? ` ${settingLabel(overallM.base, overallM.variant)} is listed at ${fmtPrice(overallM.price.blended_per_m)} per 1M.` : "";
    value = cardBase(
      "value",
      valueM,
      "Strong score under $1",
      "List price",
      fmtPrice(valueM.price.blended_per_m),
      "/1M",
      `Top score under $${CHEAP_MAX}/1M`,
      `Highest SIscope score (${valueM.si!.toFixed(0)}) among models listed at or under $${CHEAP_MAX} per 1M tokens with a score of at least ${VALUE_MIN_SI}.${same ? ` This is the same setting as ${same}.` : ""} Listed at ${fmtPrice(valueM.price.blended_per_m)} per 1M.${vs}`,
      gapLimit(valueM),
    );
  }

  const compareSlugs = compareDefaultSlugs([overallM.slug, codingM.slug, valueM?.slug, openM.slug]);
  return {
    overall: cardBase("overall", overallM, "Highest overall score", "SIscope score", overallM.si!.toFixed(0), "/100", overallGlance(overallM, n), overallBits.join(" "), gapLimit(overallM)),
    coding: cardBase("coding", codingM, "Highest coding score", "Coding score", codingM.cats.coding!.toFixed(0), "/100", codingGlance(codingM), codingBits.join(" "), codingLimit),
    value,
    open: { slug: openM.slug, href: `/models/${openM.slug}`, name: settingLabel(openM.base, openM.variant), score: openM.si!.toFixed(0), rank: openM.siRank! },
    compareSlugs,
    compareHref: `/compare?m=${compareSlugs.join(",")}`,
    rankedCount: n,
    trackedCount: allModels().length,
  };
}
