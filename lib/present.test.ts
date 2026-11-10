import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import publish from "../data/publish.json";
import { modelBySlug, siRanked } from "./data";
import { buildDecisions } from "./decisions";
import { fmtPrice } from "./format";
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

test("score v0.2.0 weights and coverage gate stay put", () => {
  assert.equal(SCORE_VERSION, "0.2.0");
  assert.equal(COVERAGE_GATE, 0.7);
  assert.deepEqual(DEFAULT_WEIGHTS, { coding: 25, agents: 25, reasoning: 20, math: 15, chat: 10, instructions: 5 });
});

test("publish.json keeps the daily refresh stamp and no extra keys", () => {
  assert.deepEqual(Object.keys(publish), ["last_success_at"]);
  assert.match(publish.last_success_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
});

test("a setting label keeps the exact variant", () => {
  assert.equal(settingLabel("Claude Opus 5.5", "High"), "Claude Opus 5.5 (High)");
  assert.equal(settingLabel("Claude Opus 5.5", "Max"), "Claude Opus 5.5 (Max)");
  assert.equal(settingLabel("Plain", null), "Plain");
});

test("homepage picks link to the exact setting and do not swap rank systems", () => {
  const d = buildDecisions();
  const overall = modelBySlug(d.overall.slug)!;
  const coding = modelBySlug(d.coding.slug)!;
  assert.equal(d.overall.href, `/models/${overall.slug}`);
  assert.equal(d.coding.href, `/models/${coding.slug}`);
  assert.equal(d.overall.name, settingLabel(overall.base, overall.variant));
  assert.equal(d.coding.name, settingLabel(coding.base, coding.variant));
  assert.equal(d.overall.rankKind, "SIscope score");
  assert.equal(d.coding.rankKind, "Coding score");
  if (overall.variant) assert.match(d.overall.name, new RegExp(overall.variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  if (coding.variant) assert.match(d.coding.name, new RegExp(coding.variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  if (overall.slug !== coding.slug) assert.notEqual(d.overall.name, d.coding.name);
  if (overall.arena.text && overall.arena.text.rank !== 1) {
    assert.match(d.overall.reason, new RegExp(`Arena text rank is #${overall.arena.text.rank}`));
    assert.doesNotMatch(d.overall.reason, /Arena text rank is #1/);
  }
  if (!overall.arena.webdev) assert.doesNotMatch(`${d.overall.reason} ${d.overall.limit}`, /WebDev #|Arena WebDev rank/);
  if (coding.arena.webdev) assert.match(d.coding.reason, new RegExp(`Arena WebDev #${coding.arena.webdev.rank}`));
  if (coding.siRank !== 1) assert.match(d.coding.reason, /not the SIscope overall rank/);
  assert.match(d.compareHref, new RegExp(`/compare\\?m=${d.compareSlugs.join(",")}`));
  assert.ok(d.compareSlugs.length >= 2 && d.compareSlugs.length <= 3);
  assert.equal(d.compareSlugs[0], overall.slug);
  assert.ok(d.compareSlugs.includes(coding.slug));
  if (d.value) {
    const value = modelBySlug(d.value.slug)!;
    assert.equal(d.value.href, `/models/${value.slug}`);
    assert.equal(d.value.name, settingLabel(value.base, value.variant));
    assert.equal(d.value.score, fmtPrice(value.price!.blended_per_m));
    assert.match(d.value.reason, /SIscope score/);
    assert.ok(d.compareSlugs.includes(value.slug));
  }
});

test("compare defaults follow the decision picks and stop at three", () => {
  assert.deepEqual(compareDefaultSlugs(["overall", "coding", "value", "open"]), ["overall", "coding", "value"]);
  assert.deepEqual(compareDefaultSlugs(["same", "same", "value", "open"]), ["same", "value", "open"]);
  assert.deepEqual(compareDefaultSlugs(["only", "only", null, "open"]), ["only", "open"]);
  const d = buildDecisions();
  const open = siRanked().find((m) => m.open)!;
  if (d.value && d.overall.slug !== d.coding.slug && d.value.slug !== d.overall.slug && d.value.slug !== d.coding.slug) {
    assert.equal(d.compareSlugs.includes(open.slug), d.value.slug === open.slug);
  }
});

test("coverage names gaps and does not treat them as zero", () => {
  const cats = { coding: 99, reasoning: 98, math: 97, chat: 99, instructions: 99 };
  const note = scoreFootnote(cats, 0.75, 98);
  assert.match(note, /Not measured: Agents & tools/);
  assert.match(note, /not a zero/);
  assert.match(note, /weakest measured category/);
  assert.match(scoreFootnote({}, 0.2, null), /not zeros/);
  assert.match(scoreFootnote({ coding: 1, agents: 1, reasoning: 1, math: 1, chat: 1, instructions: 1 }, 1, 90), /All six categories/);
  const high = modelBySlug("claude-opus-5-5-high");
  if (high) {
    const { missing } = measuredAndMissing(high.cats);
    assert.ok(missing.includes("Agents & tools"));
    assert.equal(high.arena.webdev, undefined);
    const text = verdictParagraph({
      name: high.name,
      si: high.si,
      siRank: high.siRank,
      rankedTotal: siRanked().length,
      cats: high.cats,
      coverage: high.coverage,
      open: high.open,
      price: high.price?.blended_per_m ?? null,
      pricedShare: 0.1,
    });
    assert.match(text, /Claude Opus 5\.5 \(High\)/);
    assert.match(text, /Agents & tools/);
    assert.match(text, /not zeros/);
    assert.doesNotMatch(text, /Strong at everything|no weak spot|everything it's been tested/);
  }
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
  assert.equal(samePrice.tie, false);
  assert.equal(fmtPrice(1.001), "$1.001");
  assert.equal(fmtPrice(1.004), "$1.004");
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
  const live = modelBySlug("claude-opus-5-5-max");
  if (live && live.epoch.length) {
    const liveFacts = dateFacts(live);
    assert.ok(liveFacts.epochRuns.length > 0);
    assert.notEqual(liveFacts.epochRuns[0], liveFacts.epochFetched);
    const text = dateSentence(liveFacts);
    assert.match(text, /run/);
    assert.match(text, /fetched/);
  }
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
