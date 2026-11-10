import assert from "node:assert/strict";
import test from "node:test";
import { buildDecisions } from "./decisions";
import { priceChangeCopy, visibleChangeCount } from "./home-layout";
import { modelBySlug } from "./data";

test("change grids hide a remainder so every row is full", () => {
  assert.equal(visibleChangeCount(9, 4), 8);
  assert.equal(visibleChangeCount(9, 3), 9);
  assert.equal(visibleChangeCount(9, 2), 8);
  assert.equal(visibleChangeCount(9, 1), 9);
  assert.equal(visibleChangeCount(7, 4), 4);
  assert.equal(visibleChangeCount(2, 4), 2);
  assert.equal(visibleChangeCount(0, 3), 0);
});

test("a new OpenRouter listing is a blended price, not a made-up percent", () => {
  const fresh = priceChangeCopy("$0.1 in, $0.5 out per 1M tokens on OpenRouter");
  assert.equal(fresh.mode, "new");
  assert.equal(fresh.headline, "$0.2 /1M");
  assert.match(fresh.detail, /\$0\.1 in/);
  assert.match(fresh.detail, /\$0\.5 out/);
  assert.match(fresh.detail, /new list price/);
  assert.doesNotMatch(`${fresh.headline} ${fresh.detail}`, /%|→/);
  const cut = priceChangeCopy("from $8 to $4 per 1M");
  assert.equal(cut.mode, "changed");
  assert.equal(cut.headline, "$8 → $4");
  assert.match(cut.detail, /down/);
  assert.match(cut.detail, /-50%/);
});

test("homepage glances stay short and keep SIscope separate from Arena", () => {
  const d = buildDecisions();
  const overall = modelBySlug(d.overall.slug)!;
  assert.match(d.overall.glance, new RegExp(`#${overall.siRank} of \\d+`));
  assert.match(d.overall.glance, /Arena text #|no Arena text rank/);
  assert.ok(d.overall.glance.length < 48);
  assert.ok(d.coding.glance.length < 48);
  const coding = modelBySlug(d.coding.slug);
  if (coding?.arena.webdev) assert.match(d.coding.glance, /WebDev #/);
  if (coding && coding.siRank !== 1) assert.match(d.coding.glance, /not overall/);
  if (d.value) {
    assert.match(d.value.glance, /under \$1\/1M/);
    assert.ok(d.value.glance.length < 48);
  }
});
