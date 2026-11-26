import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fixtureModel, fixturePrice } from "./fixture-model";
import { formatScore, modelFacts } from "./facts";
import { changeNature } from "./home-layout";
import { commercialLine, commercialUse, weightClass } from "./license";
import { advise } from "./picker";
import { categoryCompare } from "./present";
import { bandLeaders, paretoFrontier } from "./value";
import { buildDecisions } from "./decisions";

test("a closed model is not described as non-commercial", () => {
  assert.equal(weightClass(false, "Proprietary"), "closed");
  assert.equal(weightClass(true, "Apache 2.0"), "open-source");
  assert.equal(weightClass(true, "Llama 3.1 Community"), "open-weight");
  assert.equal(weightClass(true, "Other"), "unknown");
  assert.equal(commercialUse("Proprietary"), null);
  assert.equal(commercialLine(false, "Proprietary", "openai").text, "Commercial use per provider terms");
  assert.match(commercialLine(false, "Proprietary", "openai").href ?? "", /openai\.com/);
  assert.equal(commercialLine(true, "Llama 3.1 Community").text, "Unknown");
  assert.equal(commercialLine(true, "CC-BY-NC-4.0").text, "Commercial use is not allowed by this licence");
});

test("the same model has one score, rank, price, context and date", () => {
  const m = fixtureModel({
    slug: "same",
    base: "Same",
    variant: "High",
    si: 85.4,
    siRank: 2,
    price: fixturePrice(1.25),
    arena: { text: { rank: 4, date: "2026-11-22", rating: 1400, lo: 1390, hi: 1410, pct: 80, board_size: 100, source: "arena", license: "CC-BY-4.0", fetched_at: "2026-11-22T00:00:00Z", votes: 10 } },
  });
  const facts = modelFacts({ si: m.si, siRank: m.siRank, price: m.price, asOf: m.arena.text?.date ?? null }, 10);
  assert.equal(facts.score, "85");
  assert.equal(facts.score, formatScore(m.si));
  assert.equal(facts.rank, "#2 of 10");
  assert.match(facts.price, /in/);
  assert.equal(facts.context, "128K");
  assert.match(facts.date, /Nov/);
  const pool = [
    fixtureModel({ slug: "top", base: "Top", si: 90, siRank: 1, price: fixturePrice(8), comp: m.comp, open: false }),
    m,
    fixtureModel({ slug: "open", base: "Open", si: 70, siRank: 3, price: fixturePrice(0.4), comp: m.comp, open: true }),
  ];
  const cards = buildDecisions(pool, pool);
  assert.equal(cards.overall.score, formatScore(pool[0].si));
  for (const file of ["app/page.tsx", "components/Leaderboard.tsx", "components/Compare.tsx", "components/Picker.tsx", "app/best/[task]/page.tsx", "app/models/[slug]/page.tsx"]) {
    assert.match(readFileSync(file, "utf8"), /formatScore|modelFacts|ScoreNote/);
  }
});

test("the picker names one model, a why line, and cheaper, open, and runner-up alternatives", () => {
  const cats = { coding: 80, agents: 40, reasoning: 70, math: 60, chat: 50, instructions: 55 };
  const rows = [
    { slug: "best", name: "Best (High)", open: false, si: 90, price: 4, priceIn: 2, priceOut: 10, writing: 1500, cats },
    { slug: "mid", name: "Mid", open: false, si: 70, price: 3, priceIn: 1.5, priceOut: 6, writing: 1400, cats: { ...cats, coding: 70 } },
    { slug: "cheap", name: "Cheap", open: false, si: 50, price: 0.4, priceIn: 0.2, priceOut: 1, writing: 1200, cats: { ...cats, coding: 40 } },
    { slug: "open", name: "Open", open: true, si: 66, price: 2, priceIn: 1, priceOut: 4, writing: 1300, cats: { ...cats, coding: 55 } },
  ];
  const coding = advise(rows, { use: "coding", quality: 100 });
  assert.equal(coding.primary?.slug, "best");
  assert.match(coding.primary?.why ?? "", /Strongest measured category/);
  assert.ok(coding.alternatives.some((a) => a.kind === "cheaper"));
  assert.ok(coding.alternatives.some((a) => a.kind === "open-weight"));
  assert.ok(coding.alternatives.some((a) => a.kind === "runner-up"));
  const cheap = advise(rows, { use: "lowest-cost", quality: 0 });
  assert.equal(cheap.primary?.slug, "cheap");
  const weights = advise(rows, { use: "open-weight", quality: 100 });
  assert.equal(weights.primary?.slug, "open");
});

test("a category names a winner only when every model is measured", () => {
  assert.equal(categoryCompare([80, 70]), "winner");
  assert.equal(categoryCompare([80, null]), "not-comparable");
  assert.equal(categoryCompare([70, 70]), "tie");
});

test("the value frontier keeps a model only when nothing is both cheaper and stronger", () => {
  const rows = [
    { slug: "a", name: "A", si: 40, price: 0.4 },
    { slug: "b", name: "B", si: 80, price: 1.5 },
    { slug: "c", name: "C", si: 70, price: 3 },
    { slug: "d", name: "D", si: 90, price: 8 },
  ];
  assert.deepEqual(paretoFrontier(rows).map((r) => r.slug), ["a", "b", "d"]);
  const bands = bandLeaders(rows);
  assert.equal(bands.find((b) => b.cap === 0.5)?.model.slug, "a");
  assert.equal(bands.find((b) => b.cap === 2)?.model.slug, "b");
  assert.equal(bands.find((b) => b.cap === 10)?.model.slug, "d");
});

test("a new board entry is coverage and a rank move is performance", () => {
  assert.equal(changeNature("up"), "performance");
  assert.equal(changeNature("new_entry"), "coverage");
  assert.equal(changeNature("price_new"), "price");
});
