import assert from "node:assert/strict";
import test from "node:test";
import { allModels, modelBySlug } from "./data";
import { composite, COVERAGE_GATE } from "./score";
import { categorySources, measuredScore, provisionalScore, tieWithPrevious } from "./trust";

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
  assert.equal(low.score, 80);
  assert.ok(low.imputed.includes("agents"));
  assert.equal(provisionalScore(thin), 80);
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

test("ties use the displayed score, and Arena ranges only when the scores are close", () => {
  const marks = tieWithPrevious([
    { score: 91.2, lo: 1500, hi: 1520 },
    { score: 90.6, lo: 1490, hi: 1510 },
    { score: 87.6, lo: 1400, hi: 1410 },
    { score: 86.8, lo: 1405, hi: 1420 },
  ]);
  assert.deepEqual(marks, [null, "score", null, "arena"]);
});

test("Claude Fable 5.2 settings link to each other and can show a provisional score", () => {
  const max = modelBySlug("claude-fable-5-2-max");
  const xhigh = modelBySlug("claude-fable-5-2-xhigh");
  assert.ok(max && xhigh);
  assert.equal(max!.base, xhigh!.base);
  assert.equal(max!.si, null);
  const prov = provisionalScore(max!.cats);
  if (prov != null) assert.ok(prov > 0 && prov <= 100);
  const siblings = allModels().filter((m) => m.base === max!.base).map((m) => m.slug);
  assert.ok(siblings.includes("claude-fable-5-2-max"));
  assert.ok(siblings.includes("claude-fable-5-2-xhigh"));
});
