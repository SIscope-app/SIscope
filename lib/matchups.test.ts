import assert from "node:assert/strict";
import test from "node:test";
import { matchupByKey, popularMatchups } from "./matchups";

test("fifty popular matchups have unique addresses", () => {
  const ranked = [];
  for (let i = 0; i < 12; i++) {
    ranked.push({ slug: `m${i}-high`, base: `Family ${i}` });
    ranked.push({ slug: `m${i}-low`, base: `Family ${i}` });
  }
  const pairs = popularMatchups(ranked);
  assert.equal(pairs.length, 50);
  assert.equal(new Set(pairs.map((p) => p.key)).size, 50);
  assert.ok(pairs.every((p) => p.key === `${p.left}-vs-${p.right}`));
  assert.equal(pairs[0].key, "m0-high-vs-m1-high");
  assert.ok(pairs.every((p) => p.left.endsWith("-high") && p.right.endsWith("-high")));
  assert.equal(matchupByKey(ranked, pairs[0].key)?.left, pairs[0].left);
  assert.equal(matchupByKey(ranked, "not-a-pair"), undefined);
});
