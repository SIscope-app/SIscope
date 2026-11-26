import assert from "node:assert/strict";
import test from "node:test";
import { buildDecisions } from "./decisions";
import { fmtPrice, fmtPriceExact } from "./format";
import { changeRangeLabel, lastRankChange, materialChanges, priceChangeCopy, visibleChangeCount } from "./home-layout";
import { fixtureArena, fixtureModel, fixturePrice } from "./fixture-model";
import { shownGap } from "./format";
import { LIVE_TASKS, TASKS } from "./tasks";

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
  const prose = priceChangeCopy("$0.5437 in, $1.2505 out per 1M tokens on OpenRouter");
  assert.equal(prose.detail, "$0.54 in · $1.25 out · new list price");
  assert.doesNotMatch(`${prose.headline} ${prose.detail}`, /\d\.\d{3}/);
});

test("the change range is the dates on the cards, and an unchanged gap is dropped", () => {
  const changes = [
    { kind: "holds_leader", date: "2026-11-11", text: "holds" },
    { kind: "gap", date: "2026-11-11", text: "Open models 47 points behind", sub: "was 47" },
    { kind: "price_new", date: "2026-11-12", text: "price" },
    { kind: "price_new", date: "2026-11-10", text: "older price" },
  ];
  const gap = [
    { closed: 1538.3, open: 1491.7 },
    { closed: 1538.4, open: 1491.6 },
  ];
  assert.equal(shownGap(1538.4, 1491.6), 46);
  const shown = materialChanges(changes, gap);
  assert.equal(shown.some((c) => c.kind === "gap"), false);
  assert.equal(changeRangeLabel(shown, (d) => d.slice(5)), "3 updates from 11-10 to 11-12.");
  assert.equal(lastRankChange(shown), "2026-11-11");
  const moved = materialChanges(changes, [
    { closed: 1500, open: 1450 },
    { closed: 1510, open: 1450 },
  ]);
  assert.equal(moved.some((c) => c.kind === "gap"), true);
});

test("the homepage job grid leaves unmeasured categories for the methodology page", () => {
  assert.equal(TASKS.some((t) => t.slug === "fast" && t.soon), true);
  assert.equal(LIVE_TASKS.some((t) => t.slug === "fast"), false);
  assert.ok(LIVE_TASKS.length >= 1);
});

test("homepage glances stay short and keep SIscope separate from Arena", () => {
  const overall = fixtureModel({
    slug: "overall-high",
    base: "Overall",
    variant: "High",
    si: 96,
    siRank: 1,
    cats: { coding: 70 },
    arena: { text: fixtureArena(27) },
    price: fixturePrice(8),
  });
  const coding = fixtureModel({
    slug: "coder-max",
    base: "Coder",
    variant: "Max",
    si: 90,
    siRank: 4,
    cats: { coding: 99 },
    arena: { webdev: fixtureArena(3) },
    price: fixturePrice(6),
  });
  const value = fixtureModel({
    slug: "value-pro",
    base: "Value",
    si: 82,
    siRank: 8,
    cats: { coding: 40 },
    price: fixturePrice(0.54),
  });
  const pool = [overall, coding, value];
  const d = buildDecisions(pool, pool);
  assert.equal(d.overall.glance, "#1 of 3 · Arena text #27");
  assert.ok(d.overall.glance.length < 48);
  assert.equal(d.coding.glance, "WebDev #3 · not overall");
  assert.ok(d.coding.glance.length < 48);
  assert.equal(d.value?.glance, "Top score under $1/1M");
  assert.ok((d.value?.glance.length ?? 0) < 48);
  assert.doesNotMatch(d.value?.reason ?? "", /\$\d+\.\d{3}/);
});
