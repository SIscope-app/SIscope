import assert from "node:assert/strict";
import test from "node:test";
import { buildDecisions } from "./decisions";
import { fmtPrice, fmtPriceExact } from "./format";
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

test("prices keep cents, including trailing zeros", () => {
  assert.equal(fmtPrice(0), "$0");
  assert.equal(fmtPrice(null), "n/a");
  assert.equal(fmtPrice(0.1), "$0.10");
  assert.equal(fmtPrice(0.5), "$0.50");
  assert.equal(fmtPrice(0.54), "$0.54");
  assert.equal(fmtPrice(0.5437), "$0.54");
  assert.equal(fmtPrice(0.025), "$0.03");
  assert.equal(fmtPrice(0.006), "$0.006");
  assert.equal(fmtPrice(1.2505), "$1.25");
  assert.equal(fmtPrice(8), "$8.00");
  assert.equal(fmtPrice(20), "$20.00");
  assert.equal(fmtPriceExact(0.5437), "$0.5437");
  assert.equal(fmtPriceExact(0.025), "$0.025");
  assert.equal(fmtPriceExact(1.2505), "$1.2505");
  assert.equal(fmtPriceExact(0.006), "$0.006");
});

test("a new OpenRouter listing is a blended price, not a made-up percent", () => {
  const fresh = priceChangeCopy("$0.1 in, $0.5 out per 1M tokens on OpenRouter");
  assert.equal(fresh.mode, "new");
  assert.equal(fresh.headline, "$0.20 /1M");
  assert.match(fresh.detail, /\$0\.10 in/);
  assert.match(fresh.detail, /\$0\.50 out/);
  assert.match(fresh.detail, /new list price/);
  assert.doesNotMatch(`${fresh.headline} ${fresh.detail}`, /%|→/);
  const cut = priceChangeCopy("from $8 to $4 per 1M");
  assert.equal(cut.mode, "changed");
  assert.equal(cut.headline, "$8.00 → $4.00");
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
