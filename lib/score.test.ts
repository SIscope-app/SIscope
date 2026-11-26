import assert from "node:assert/strict";
import test from "node:test";
import { categoryScores, composite, headlineEligible, MISSING_PERCENTILE, percentileAgainst, type Components } from "./score";

test("a percentile uses the reference list, not a larger population", () => {
  const reference = [10, 20, 30, 40];
  assert.equal(percentileAgainst(30, reference), 66.7);
  assert.equal(percentileAgainst(5, reference), 0);
  assert.equal(percentileAgainst(40, reference), 100);
  assert.equal(percentileAgainst(1000, reference), 100);
  assert.equal(percentileAgainst(30, [30]), null);
});

test("a missing category and a thin category cannot outrank a fuller result", () => {
  const shared = {
    "arena.text.coding": 70,
    "arena.text.hard_prompts": 70,
    "arena.text.math": 70,
    "arena.text": 70,
    "arena.text.instruction_following": 70,
  };
  const partial: Components = { ...shared };
  const full: Components = {
    ...shared,
    "arena.webdev": 80,
    "epoch.swe_bench_verified": 80,
    "arena.agent": 60,
    "epoch.gpqa_diamond": 75,
    "epoch.simpleqa_verified": 75,
    "epoch.otis_mock_aime": 74,
    "epoch.frontiermath": 74,
  };
  for (const key of Object.keys(shared)) assert.ok((full[key] ?? 0) >= (partial[key] ?? 0));
  const fullScore = composite(categoryScores(full)).score!;
  const partialScore = composite(categoryScores(partial)).score!;
  assert.ok(fullScore > partialScore);
  assert.equal(composite(categoryScores(partial)).provisional, true);
  assert.ok(partialScore < 70);
  assert.equal(MISSING_PERCENTILE, 25);
});

test("fewer sources inside a category score lower than the same sources plus another", () => {
  const one = categoryScores({ "arena.webdev": 90 });
  const two = categoryScores({ "arena.webdev": 90, "arena.text.coding": 80 });
  assert.ok(two.coding! > one.coding!);
  assert.ok(one.coding! < 90);
});

test("headline picks need full coverage or two independent sources", () => {
  assert.equal(headlineEligible({ "arena.text": 90, "arena.text.coding": 90, "arena.text.math": 90, "arena.text.hard_prompts": 90, "arena.text.instruction_following": 90 }), false);
  assert.equal(headlineEligible({ "arena.text": 90, "arena.webdev": 80 }), true);
  assert.equal(
    headlineEligible({
      "arena.webdev": 1,
      "arena.agent": 1,
      "epoch.gpqa_diamond": 1,
      "arena.text.math": 1,
      "arena.text": 1,
      "arena.text.instruction_following": 1,
    }),
    true,
  );
});
