import assert from "node:assert/strict";
import test from "node:test";
import { siRanked } from "./data";
import { matchupByKey, popularMatchups } from "./matchups";

test("fifty popular matchups have unique addresses", () => {
  const pairs = popularMatchups(siRanked());
  assert.equal(pairs.length, 50);
  assert.equal(new Set(pairs.map((p) => p.key)).size, 50);
  assert.ok(pairs.every((p) => p.key === `${p.left}-vs-${p.right}`));
  assert.equal(matchupByKey(siRanked(), pairs[0].key)?.left, pairs[0].left);
  assert.equal(matchupByKey(siRanked(), "not-a-pair"), undefined);
});
