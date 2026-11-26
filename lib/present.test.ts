import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDecisions } from "./decisions";
import { fixtureArena, fixtureModel, fixturePrice } from "./fixture-model";
import { fmtPrice, fmtPriceExact } from "./format";
import {
  compareDefaultSlugs,
  compareSummary,
  dateFacts,
  dateSentence,
  displayedWinners,
  measuredAndMissing,
  priceStatus,
  scoreFootnote,
  settingLabel,
  splitCovered,
  verdictParagraph,
} from "./present";
import { CATEGORIES, COVERAGE_GATE, DEFAULT_WEIGHTS, SCORE_VERSION } from "./score";

const eligibleComp = {
  "arena.text": 80,
  "arena.webdev": 70,
  "arena.agent": 60,
  "arena.text.coding": 75,
  "arena.text.math": 70,
  "arena.text.hard_prompts": 70,
  "arena.text.instruction_following": 70,
};

test("score v0.3.1 keeps the v0.3.0 weights and coverage gate", () => {
  assert.equal(SCORE_VERSION, "0.3.1");
  assert.equal(COVERAGE_GATE, 0.7);
  assert.deepEqual(DEFAULT_WEIGHTS, { coding: 25, agents: 25, reasoning: 20, math: 15, chat: 10, instructions: 5 });
});

test("a setting label keeps the exact variant", () => {
  assert.equal(settingLabel("Claude Opus 5.5", "High"), "Claude Opus 5.5 (High)");
  assert.equal(settingLabel("Claude Opus 5.5", "Max"), "Claude Opus 5.5 (Max)");
  assert.equal(settingLabel("Plain", null), "Plain");
});

function decisionFixtures() {
  const overall = fixtureModel({
    slug: "overall-high",
    base: "Overall",
    variant: "High",
    si: 96,
    siRank: 1,
    cats: { coding: 70, agents: 90, reasoning: 90, math: 90, chat: 90, instructions: 90 },
    arena: { text: fixtureArena(27, { board_size: 400 }) },
    price: fixturePrice(8),
    comp: eligibleComp,
  });
  const coding = fixtureModel({
    slug: "coder-max",
    base: "Coder",
    variant: "Max",
    si: 90,
    siRank: 4,
    cats: { coding: 99, agents: 70, reasoning: 70, math: 70, chat: 70, instructions: 70 },
    arena: { webdev: fixtureArena(3, { board_size: 80 }) },
    price: fixturePrice(6),
    comp: eligibleComp,
  });
  const value = fixtureModel({
    slug: "value-pro",
    base: "Value",
    variant: "Pro",
    si: 82,
    siRank: 12,
    open: false,
    cats: { coding: 50 },
    price: fixturePrice(0.5),
    comp: eligibleComp,
  });
  const open = fixtureModel({
    slug: "open-best",
    base: "Open",
    si: 78,
    siRank: 20,
    open: true,
    cats: { coding: 40 },
    price: fixturePrice(0.4),
    comp: eligibleComp,
  });
  const pool = [overall, coding, value, open];
  return { overall, coding, value, open, decisions: buildDecisions(pool, pool) };
}

test("homepage picks are three distinct non-empty settings", () => {
  const { overall, value, open, decisions: d } = decisionFixtures();
  assert.equal(d.overall.href, `/models/${overall.slug}`);
  assert.equal(d.open.href, `/models/${open.slug}`);
  assert.equal(d.value.href, `/models/${value.slug}`);
  assert.equal(d.overall.name, "Overall (High)");
  assert.equal(d.open.name, settingLabel(open.base, open.variant));
  assert.equal(d.value.name, settingLabel(value.base, value.variant));
  assert.equal(d.overall.rankKind, "SIscope score");
  assert.equal(d.open.rankKind, "SIscope score");
  assert.equal(d.value.rankKind, "SIscope score");
  assert.equal(d.value.score, value.si!.toFixed(0));
  assert.match(d.overall.reason, /Arena text rank is #27/);
  assert.doesNotMatch(d.overall.reason, /Arena text rank is #1/);
  assert.match(d.value.reason, /SIscope score/);
  assert.match(d.value.glance, /Under \$1\/1M/);
  const slugs = [d.overall.slug, d.open.slug, d.value.slug];
  assert.equal(new Set(slugs).size, 3);
  for (const card of [d.overall, d.open, d.value]) {
    assert.ok(card.slug);
    assert.ok(card.name);
    assert.ok(card.score);
  }
  assert.deepEqual(d.compareSlugs, slugs);
});

test("an empty value card falls back to the next stated cap", () => {
  const overall = fixtureModel({ slug: "overall", base: "Overall", si: 96, siRank: 1, price: fixturePrice(8), comp: eligibleComp, open: false });
  const pricey = fixtureModel({ slug: "pricey", base: "Pricey", si: 90, siRank: 2, price: fixturePrice(12), comp: eligibleComp, open: false });
  const open = fixtureModel({ slug: "open-mid", base: "Open", si: 70, siRank: 3, price: fixturePrice(4), comp: eligibleComp, open: true });
  const value = fixtureModel({ slug: "value-3", base: "Value", si: 66, siRank: 4, price: fixturePrice(2.4), comp: eligibleComp, open: false });
  const d = buildDecisions([overall, pricey, open, value], [overall, pricey, open, value]);
  assert.equal(d.value.slug, value.slug);
  assert.match(d.value.kicker, /Under \$3\/1M/);
  assert.match(d.value.reason, /Nothing scored 75/);
  assert.equal(new Set([d.overall.slug, d.open.slug, d.value.slug]).size, 3);
  for (const card of [d.overall, d.open, d.value]) assert.ok(card.score);
});

test("compare defaults follow the decision picks and stop at three", () => {
  assert.deepEqual(compareDefaultSlugs(["overall", "coding", "value", "open"]), ["overall", "coding", "value"]);
  assert.deepEqual(compareDefaultSlugs(["same", "same", "value", "open"]), ["same", "value", "open"]);
  assert.deepEqual(compareDefaultSlugs(["only", "only", null, "open"]), ["only", "open"]);
  const { open, decisions: d } = decisionFixtures();
  assert.equal(d.compareSlugs.includes(open.slug), true);
  assert.notEqual(d.value.slug, open.slug);
});

test("coverage names gaps and does not treat them as zero", () => {
  const cats = { coding: 99, reasoning: 98, math: 97, chat: 99, instructions: 99 };
  const note = scoreFootnote(cats, 0.75, 98);
  assert.match(note, /Not measured: Agents & tools/);
  assert.match(note, /not a zero/);
  assert.match(note, /reference 25th percentile/);
  assert.match(note, /provisional/);
  assert.match(scoreFootnote({}, 0.2, null), /not zeros/);
  assert.match(scoreFootnote({ coding: 1, agents: 1, reasoning: 1, math: 1, chat: 1, instructions: 1 }, 1, 90), /All six categories/);
  const { missing } = measuredAndMissing(cats);
  assert.ok(missing.includes("Agents & tools"));
  const text = verdictParagraph({
    name: "Example (High)",
    si: 90,
    siRank: 2,
    rankedTotal: 40,
    cats,
    coverage: 0.75,
    open: false,
    price: 5,
    pricedShare: 0.1,
  });
  assert.match(text, /Example \(High\)/);
  assert.match(text, /Agents & tools/);
  assert.match(text, /not zeros/);
  assert.doesNotMatch(text, /Strong at everything|no weak spot|everything it's been tested/);
});

test("a listed zero is not the same fact as a missing price", () => {
  const unknown = priceStatus(null);
  const free = priceStatus(0);
  const priced = priceStatus(0.54);
  assert.equal(unknown.kind, "unknown");
  assert.equal(free.kind, "free");
  assert.equal(priced.kind, "priced");
  assert.equal(free.short, "$0");
  assert.notEqual(unknown.short, free.short);
  assert.match(unknown.detail, /not free/);
  assert.match(unknown.detail, /do not guess/);
  assert.doesNotMatch(unknown.short, /\$0|–|—/);
  assert.equal(priced.short, "$0.54");
});

test("category winners include ties and ignore a single present value", () => {
  const tie = displayedWinners([99.4, null, 99.2], "hi", (n) => n.toFixed(0));
  assert.deepEqual(tie.win, [true, false, true]);
  assert.equal(tie.tie, true);
  const solo = displayedWinners([100, null, null], "hi", (n) => n.toFixed(0));
  assert.deepEqual(solo.win, [false, false, false]);
  assert.equal(solo.tie, false);
  const lower = displayedWinners([8, null, 0.54], "lo", fmtPrice);
  assert.deepEqual(lower.win, [false, false, true]);
  assert.equal(lower.tie, false);
  const samePrice = displayedWinners([1.001, 1.004], "lo", fmtPrice);
  assert.equal(samePrice.tie, true);
  assert.equal(fmtPrice(1.001), "$1.00");
  assert.equal(fmtPrice(1.004), "$1.00");
  const exactSplit = displayedWinners([1.001, 1.004], "lo", fmtPriceExact);
  assert.equal(exactSplit.tie, false);
  const sameCent = displayedWinners([1, 1], "lo", fmtPrice);
  assert.equal(sameCent.tie, true);
});

test("compare summary states ties, supported savings, and unknown prices", () => {
  const rows = [
    { slug: "high", name: "Opus (High)", si: 99, cats: { coding: 80, chat: 99 }, price: 8 },
    { slug: "max", name: "Opus (Max)", si: 90, cats: { coding: 100, agents: 100 }, price: 8 },
    { slug: "value", name: "Value (Pro)", si: 90, cats: { coding: 70 }, price: 0.5 },
  ];
  const { summary, limits } = compareSummary(rows);
  assert.match(summary, /Opus \(High\) leads on SIscope score \(99\.0\)/);
  assert.match(summary, /Opus \(Max\) leads Coding \(100\.0\)/);
  assert.match(summary, /tie on Chat|Chat/);
  assert.match(summary, /only Opus \(Max\) has Agents/);
  assert.match(summary, /\$0\.50 per 1M/);
  assert.match(summary, /\$8/);
  assert.match(summary, /16×/);
  assert.equal(limits.length, 1);
  assert.match(limits[0], /not a zero/);

  const unknown = compareSummary([
    { slug: "a", name: "A (High)", si: 10, cats: { coding: 10 }, price: null },
    { slug: "b", name: "B (Max)", si: 20, cats: { coding: 20 }, price: 0 },
  ]);
  assert.match(unknown.summary, /listed at \$0/);
  assert.match(unknown.limits.join(" "), /Unknown is not free/);
  assert.doesNotMatch(unknown.summary, /cheaper|savings/i);

  const tied = compareSummary([
    { slug: "a", name: "A (High)", si: 88.21, cats: { math: 70.01 }, price: 2 },
    { slug: "b", name: "B (High)", si: 88.24, cats: { math: 70.04 }, price: 2 },
  ]);
  assert.match(tied.summary, /tie on SIscope score \(88\.2\)/);
  assert.match(tied.summary, /tie on Math/);
  const near = compareSummary([
    { slug: "h", name: "Opus (High)", si: 99, cats: { coding: 99.8 }, price: 8 },
    { slug: "m", name: "Opus (Max)", si: 90, cats: { coding: 100 }, price: 8 },
  ]);
  assert.match(near.summary, /Opus \(Max\) leads Coding \(100\.0\)/);
  assert.doesNotMatch(near.summary, /tie on Coding/);
});

test("empty detail groups are the ones nobody has", () => {
  const tiles = [
    { title: "SIscope score", has: true },
    { title: "Agent arena", has: false },
    { title: "SWE-bench", has: false },
  ];
  const split = splitCovered(tiles, (t) => t.has);
  assert.deepEqual(split.shown.map((t) => t.title), ["SIscope score"]);
  assert.deepEqual(split.hidden.map((t) => t.title), ["Agent arena", "SWE-bench"]);
});

test("benchmark run dates stay distinct from fetch dates", () => {
  const facts = dateFacts({
    arena: { webdev: { rank: 1, date: "2026-11-08", lo: 1, hi: 2, pct: 100, board_size: 10, source: "arena", license: "CC-BY-4.0", fetched_at: "2026-11-09T22:18:05Z" } },
    epoch: [{ run_date: "2026-09-22", fetched_at: "2026-11-09T22:18:10Z" }],
    price: { openrouter_id: "x", input_per_m: 1, output_per_m: 1, blended_per_m: 1, context_length: 1, modalities_in: null, as_of: "2026-11-09T22:18:10Z", source: "openrouter", license: "terms", fetched_at: "2026-11-09T22:18:10Z" },
  });
  const sentence = dateSentence(facts);
  assert.match(sentence, /Arena board date/);
  assert.match(sentence, /fetched/);
  assert.match(sentence, /Epoch tests were run/);
  assert.notEqual(facts.arenaBoard, facts.arenaFetched);
  assert.notEqual(facts.epochRuns[0], facts.epochFetched);
});

test("the pages wire exact settings, compare summary, and an unknown-model noindex", () => {
  const home = readFileSync("app/page.tsx", "utf8");
  const compare = readFileSync("components/Compare.tsx", "utf8");
  const missing = readFileSync("app/not-found.tsx", "utf8");
  const model = readFileSync("app/models/[slug]/page.tsx", "utf8");
  assert.match(home, /buildDecisions/);
  assert.match(home, /Arena history through/);
  assert.match(compare, /compareSummary/);
  assert.match(compare, /popstate/);
  assert.match(compare, /No list price/);
  assert.match(missing, /index:\s*false/);
  assert.match(model, /notFound\(\)/);
  assert.match(model, /scoreFootnote/);
  assert.match(model, /index: false/);
  assert.doesNotMatch(model, /export const dynamicParams/);
  for (const id of CATEGORIES) assert.ok(id);
});
