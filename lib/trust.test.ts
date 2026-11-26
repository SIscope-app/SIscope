import assert from "node:assert/strict";
import test from "node:test";
import { composite, COVERAGE_GATE } from "./score";
import { arenaTextMargins, categorySources, measuredScore, provisionalScore, tieWithPrevious } from "./trust";

test("the floor formula matches the official score above the gate and stays blank below it", () => {
  const full = { coding: 80, agents: 70, reasoning: 60, math: 50, chat: 90, instructions: 40 };
  const gated = measuredScore(full);
  const official = composite(full);
  assert.equal(official.score != null, true);
  assert.ok(Math.abs(gated.score! - official.score!) < 1e-9);
  assert.equal(gated.imputed.length, 0);
  assert.equal(provisionalScore(full), null);

  const thin = { coding: 80 };
  const low = measuredScore(thin);
  assert.equal(low.official, null);
  assert.ok(low.coverage < COVERAGE_GATE);
  assert.equal(low.score, 38.75);
  assert.ok(low.imputed.includes("agents"));
  assert.equal(provisionalScore(thin), 38.75);
  assert.equal(composite(thin).score, null);
});

test("a category built from one input is marked single source", () => {
  const onlyWeb = categorySources({ "arena.webdev": 70 }, "coding");
  assert.equal(onlyWeb.n, 1);
  assert.match(onlyWeb.only ?? "", /WebDev/);
  const both = categorySources({ "arena.webdev": 70, "epoch.swe_bench_verified": 80 }, "coding");
  assert.equal(both.n, 2);
  assert.equal(both.only, null);
  assert.equal(categorySources({ "arena.agent": 10 }, "agents").n, 1);
});

test("Arena intervals produce a rank range and a near-tie label", () => {
  const margins = arenaTextMargins([
    { slug: "a", rank: 1, rating: 1500, lo: 1490, hi: 1510 },
    { slug: "b", rank: 2, rating: 1495, lo: 1480, hi: 1505 },
    { slug: "c", rank: 3, rating: 1400, lo: 1390, hi: 1410 },
  ]);
  assert.equal(margins.get("a")?.tied, true);
  assert.ok((margins.get("a")?.to ?? 0) > (margins.get("a")?.from ?? 0));
  assert.equal(margins.get("c")?.tied, false);
  assert.equal(margins.get("c")?.from, 3);
  assert.equal(margins.get("c")?.to, 3);
});

test("ties use the displayed score, and Arena ranges only when the scores are close", () => {
  const marks = tieWithPrevious([
    { score: 91.2, lo: 1500, hi: 1520 },
    { score: 90.6, lo: 1490, hi: 1510 },
    { score: 87.6, lo: 1400, hi: 1410 },
    { score: 86.8, lo: 1405, hi: 1420 },
  ]);
  assert.deepEqual(marks, [null, "score", null, "arena"]);
});

test("settings that share a base link, and a thin setting can show a provisional score", () => {
  const max = { slug: "example-max", base: "Example", si: null as number | null, cats: { coding: 80 } };
  const xhigh = { slug: "example-xhigh", base: "Example", si: 70, cats: { coding: 70, agents: 70, reasoning: 70, math: 70, chat: 70, instructions: 70 } };
  assert.equal(max.base, xhigh.base);
  assert.equal(max.si, null);
  assert.equal(provisionalScore(max.cats), 38.75);
  assert.equal(provisionalScore(xhigh.cats), null);
  const siblings = [max, xhigh].filter((m) => m.base === max.base).map((m) => m.slug);
  assert.deepEqual(siblings, ["example-max", "example-xhigh"]);
});
