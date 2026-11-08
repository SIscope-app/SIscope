// Writes the static JSON API to public/api/v0/. Runs before `next build`.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BUILT_AT, SOURCES, allModels } from "../lib/data";
import { orgName } from "../lib/orgs";
import { CATEGORIES, COVERAGE_GATE, SCORE_VERSION } from "../lib/score";

const out = join(process.cwd(), "public", "api", "v0");
mkdirSync(out, { recursive: true });
const models = allModels().map((m) => ({
  slug: m.slug,
  name: m.name,
  source_name: m.raw_name,
  base: m.base,
  variant: m.variant,
  org: m.org,
  open_weights: m.open,
  model_license: m.model_license,
  siscope: { score: m.si == null ? null : Math.round(m.si * 10) / 10, rank: m.siRank, coverage: Math.round(m.coverage * 100) / 100, categories: Object.fromEntries(Object.entries(m.cats).map(([k, v]) => [k, Math.round((v as number) * 10) / 10])) },
  arena: m.arena,
  epoch: m.epoch,
  price: m.price,
  url: `https://siscope.app/models/${m.slug}`,
}));
const doc = {
  name: "SIscope models API",
  version: "v0",
  built_at: BUILT_AT,
  score: { version: SCORE_VERSION, coverage_gate: COVERAGE_GATE, weights: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.weight])), docs: "https://siscope.app/methodology" },
  sources: SOURCES.sources.map(({ id, name, home, license, license_url, attribution, as_of }) => ({ id, name, home, license, license_url, attribution, as_of })),
  attribution: "Please credit SIscope and the original sources listed here.",
  count: models.length,
  models,
};
writeFileSync(join(out, "models.json"), JSON.stringify(doc));
console.log(`wrote public/api/v0/models.json (${models.length} models)`);

// Small index for the header quick search: [slug, name, provider, SIscope score or null, open (1/0)].
// Sorted by score so the best matches come first; fetched lazily the first time search opens.
const idx = [...allModels()]
  .sort((a, b) => (b.si ?? -1) - (a.si ?? -1))
  .map((m) => [m.slug, m.name, orgName(m.org), m.si == null ? null : Math.round(m.si), m.open ? 1 : 0]);
writeFileSync(join(process.cwd(), "public", "search.json"), JSON.stringify(idx));
console.log(`wrote public/search.json (${idx.length} entries)`);
