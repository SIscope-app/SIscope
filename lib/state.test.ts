import assert from "node:assert/strict";
import test from "node:test";
import { buildState, modelSummary, type StateModel } from "./state";

function model(partial: Partial<StateModel> & Pick<StateModel, "slug" | "name" | "si">): StateModel {
  return {
    slug: partial.slug,
    name: partial.name,
    base: partial.base ?? partial.name,
    org: partial.org ?? "lab",
    open: partial.open ?? false,
    si: partial.si,
    siRank: partial.siRank ?? null,
    cats: partial.cats ?? {},
    comp: partial.comp ?? {},
    price: partial.price ?? null,
    textDate: partial.textDate ?? "2026-11-16",
    historyText: partial.historyText ?? [],
    historyWeb: partial.historyWeb ?? [],
  };
}

const price = (blended: number, as_of = "2026-11-16") => ({ blended_per_m: blended, input_per_m: blended, output_per_m: blended * 3, as_of });

test("state facts come from the snapshot and do not invent a price series", () => {
  const models = [
    model({ slug: "ace", name: "Ace", org: "anthropic", si: 90, siRank: 1, cats: { coding: 80, chat: 70 }, comp: { "arena.webdev": 80, "arena.text": 70 }, price: price(8), historyText: [["2026-10-01", 1400, 20], ["2026-11-16", 1500, 4]] }),
    model({ slug: "bee", name: "Bee", org: "google", si: 88, siRank: 2, open: true, cats: { coding: 60, agents: 99, chat: 50 }, comp: { "arena.text.coding": 60, "arena.agent": 99, "arena.text": 50 }, price: price(0.4), historyText: [["2026-11-01", 1490, 2]] }),
    model({ slug: "coy", name: "Coy", org: "google", si: 70, siRank: 3, cats: { math: 95 }, comp: { "arena.text.math": 95 }, price: price(1) }),
  ];
  const gap = [
    { d: "2026-10-01", closed: 1500, open: 1400, closed_name: "Ace", open_name: "Bee" },
    { d: "2026-11-16", closed: 1520, open: 1460, closed_name: "Ace", open_name: "Bee" },
  ];
  const state = buildState(models, gap, "2026-11-16");
  assert.equal(state.overall?.title, "Ace");
  assert.equal(state.overall?.href, "/models/ace");
  assert.equal(state.jobs.find((j) => j.id === "agents")?.title, "Bee");
  assert.equal(state.jobs.find((j) => j.id === "coding")?.title, "Ace");
  assert.equal(state.openModel?.title, "Bee");
  assert.equal(state.gap?.now, 60);
  assert.equal(state.gap?.then, 100);
  assert.equal(state.nearTop?.href, "/models/bee");
  assert.equal(state.frontierPrice, null);
  assert.equal(state.releases[0]?.title, "Bee");
  assert.equal(state.movers[0]?.title, "Ace");
  assert.equal(state.movers[0]?.places, 16);
  assert.equal(state.lab?.title, "2 from google");
  assert.ok(state.glance.length >= 4 && state.glance.length <= 5);
  assert.equal(modelSummary(models[0]), "Ranks #1 overall; best at coding; $8.00 in / $24.00 out; open weights: no.");
});
