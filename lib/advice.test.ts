import assert from "node:assert/strict";
import test from "node:test";
import { budgetPicks, suggestions } from "./advice";
import type { Enriched } from "./data";
import { fixtureModel, fixturePrice } from "./fixture-model";

function ranked(): Enriched[] {
  return [
    fixtureModel({ slug: "pricey", base: "Pricey", si: 95, siRank: 1, price: fixturePrice(12) }),
    fixtureModel({ slug: "mid", base: "Mid", variant: "High", si: 90, siRank: 2, price: fixturePrice(4) }),
    fixtureModel({ slug: "cheap", base: "Cheap", si: 80, siRank: 3, open: true, price: fixturePrice(0.4) }),
    fixtureModel({ slug: "low", base: "Low", si: 70, siRank: 4, price: fixturePrice(0.2) }),
  ];
}

test("budget caps name the strongest score under the cap, without repeating a model", () => {
  const picks = budgetPicks(ranked());
  assert.deepEqual(
    picks.map((p) => [p.cap, p.slug, p.score]),
    [
      [0.5, "cheap", "80"],
      [10, "mid", "90"],
    ],
  );
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
  const all = [
    fixtureModel({ slug: "closed-mid", base: "Closed", variant: "High", si: 80, siRank: 3, open: false, price: fixturePrice(4) }),
    fixtureModel({ slug: "closed-low", base: "Closed", variant: "Low", si: 70, siRank: 5, price: fixturePrice(1) }),
    fixtureModel({ slug: "other", base: "Other", si: 78, siRank: 4, price: fixturePrice(2) }),
    fixtureModel({ slug: "top", base: "Top", si: 90, siRank: 1, price: fixturePrice(8) }),
    fixtureModel({ slug: "open-best", base: "Open", si: 76, siRank: 6, open: true, price: fixturePrice(0.5) }),
  ];
  const priced = all[0];
  const rows = suggestions(priced, all);
  assert.ok(rows.length >= 1);
  assert.ok(rows.length <= 3);
  const known = new Set(all.map((m) => m.slug));
  for (const row of rows) {
    assert.ok(known.has(row.slug));
    assert.notEqual(row.slug, priced.slug);
    assert.ok(row.line.length > 0);
  }
  assert.ok(rows.some((row) => row.slug === "closed-low"));
});

test("a model with no neighbours returns an empty list", () => {
  const solo = fixtureModel({ slug: "only", base: "Only", si: 10, open: true, price: null });
  assert.deepEqual(suggestions(solo, [solo]), []);
});
