import assert from "node:assert/strict";
import test from "node:test";
import { budgetPicks, suggestions } from "./advice";
import { siRanked, type Enriched } from "./data";

test("budget caps name the strongest score under the cap, without repeating a model", () => {
  const picks = budgetPicks(siRanked());
  assert.ok(picks.length >= 1);
  const slugs = picks.map((p) => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const p of picks) {
    assert.match(p.href, new RegExp(`^/leaderboard\\?price=${p.cap}$`));
    assert.ok(Number(p.score) >= 75);
    assert.match(p.price, /^\$\d/);
  }
  const caps = picks.map((p) => p.cap);
  assert.deepEqual(caps, [...caps].sort((a, b) => a - b));
});

test("suggestions stay inside the models we already have", () => {
  const all = siRanked();
  const priced = all.find((m) => m.price && m.si != null && !m.open);
  assert.ok(priced);
  const rows = suggestions(priced!, all);
  assert.ok(rows.length >= 1);
  assert.ok(rows.length <= 3);
  const known = new Set(all.map((m) => m.slug));
  for (const row of rows) {
    assert.ok(known.has(row.slug));
    assert.notEqual(row.slug, priced!.slug);
    assert.ok(row.line.length > 0);
  }
});

test("a model with no neighbours returns an empty list", () => {
  const solo = { slug: "only", base: "Only", variant: null, si: 10, open: true, price: null } as Enriched;
  assert.deepEqual(suggestions(solo, [solo]), []);
});
