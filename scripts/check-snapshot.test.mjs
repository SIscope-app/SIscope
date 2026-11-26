import assert from "node:assert/strict";
import test from "node:test";
import { snapshotProblems } from "./check-snapshot.mjs";

const tiny = { minModels: 1, minPriced: 1, minArenaText: 1, minSources: 1 };

function model(over = {}) {
  return {
    slug: "example",
    name: "Example",
    base: "Example",
    org: "Lab",
    arena: { text: { rank: 4, board_size: 40, pct: 80, rating: 1400, lo: 1390, hi: 1410 } },
    epoch: [{ benchmark: "swe_bench_verified", score: 0.42, pct: 55 }],
    price: { input_per_m: 1, output_per_m: 3, blended_per_m: 1.5 },
    ...over,
  };
}

function files(models, over = {}) {
  return {
    models: { count: models.length, models },
    slugs: models.map((m) => m.slug),
    sources: {
      sources: ["arena", "epoch", "openrouter", "exgentic"].map((id) => ({
        id,
        name: id,
        as_of: "2026-11-16",
        fetched_at: "2026-11-16T00:00:00Z",
      })),
      blocked: [{ name: "Artificial Analysis", reason: "no scrape" }],
    },
    publish: { last_success_at: "2026-11-16T12:00:00Z" },
    ...over,
  };
}

test("a small sane snapshot has no problems", () => {
  assert.deepEqual(snapshotProblems(files([model()]), tiny), []);
});

test("NaN, a non-positive price, and a duplicate slug are rejected", () => {
  const nan = model({ arena: { text: { rank: 1, board_size: 10, pct: Number.NaN } } });
  assert.ok(snapshotProblems(files([nan]), tiny).some((p) => /not a finite number/.test(p)));

  const free = model({ price: { input_per_m: 0, output_per_m: 1, blended_per_m: 1 } });
  assert.ok(snapshotProblems(files([free]), tiny).some((p) => /input_per_m must be greater than 0/.test(p)));

  const negative = model({ price: { input_per_m: 1, output_per_m: -1, blended_per_m: 1 } });
  assert.ok(snapshotProblems(files([negative]), tiny).some((p) => /output_per_m must be greater than 0/.test(p)));

  const dup = files([model(), model({ name: "Other" })]);
  assert.ok(snapshotProblems(dup, tiny).some((p) => /not unique/.test(p)));
});

test("a percentile outside 0–100 and a blocked source are rejected", () => {
  const wide = model({ epoch: [{ benchmark: "gpqa", score: 0.1, pct: 140 }] });
  assert.ok(snapshotProblems(files([wide]), tiny).some((p) => /outside 0–100/.test(p)));

  const blocked = files([model()]);
  blocked.sources.sources.push({ id: "aa", name: "Artificial Analysis", as_of: "2026-11-01", fetched_at: "2026-11-01T00:00:00Z" });
  assert.ok(snapshotProblems(blocked, { ...tiny, minSources: 1 }).some((p) => /Artificial Analysis is listed as a source/.test(p)));

  const unblocked = files([model()], { sources: { sources: files([model()]).sources.sources, blocked: [] } });
  assert.ok(snapshotProblems(unblocked, tiny).some((p) => /not on the blocked list/.test(p)));
});

test("the default floors reject an empty snapshot", () => {
  const empty = snapshotProblems(files([]));
  assert.ok(empty.some((p) => /model count/.test(p)));
  assert.ok(empty.some((p) => /priced models/.test(p)));
  assert.ok(empty.some((p) => /arena text/.test(p)));
});
