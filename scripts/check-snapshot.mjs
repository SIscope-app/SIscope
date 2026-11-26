/**
 * Sanity check for a fetched snapshot. Counts, finite numbers, and positive
 * list prices only. It does not name a model or require a particular score.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const DEFAULT_LIMITS = { minModels: 100, minPriced: 20, minArenaText: 50, minSources: 4 };

const REQUIRED_SOURCES = ["arena", "epoch", "openrouter", "exgentic"];

function finite(value, label, problems) {
  if (typeof value !== "number" || !Number.isFinite(value)) problems.push(`${label} is not a finite number`);
}

function walk(value, path, problems) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) problems.push(`${path} is not a finite number`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${path}[${i}]`, problems));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) walk(item, `${path}.${key}`, problems);
  }
}

/** @returns {string[]} problems. Empty means the snapshot is sane. */
export function snapshotProblems(files, limits = DEFAULT_LIMITS) {
  const problems = [];
  const list = files.models?.models;
  if (!Array.isArray(list)) {
    problems.push("models.json has no models array");
    return problems;
  }
  if (list.length < limits.minModels) problems.push(`model count ${list.length} is below ${limits.minModels}`);
  if (files.models.count !== list.length) problems.push(`models.json count ${files.models.count} does not match ${list.length} models`);
  const slugs = list.map((m) => m.slug);
  if (new Set(slugs).size !== slugs.length) problems.push("model slugs are not unique");
  if (Array.isArray(files.slugs)) {
    const fromFile = [...files.slugs].map(String).sort();
    const fromModels = [...slugs].sort();
    if (fromFile.length !== fromModels.length || fromFile.some((slug, i) => slug !== fromModels[i])) {
      problems.push("slugs.json does not match models.json");
    }
  }

  let priced = 0;
  let arenaText = 0;
  for (const m of list) {
    const id = m.slug || m.name || "(unnamed)";
    if (!m.slug || !m.name || !m.base || !m.org) problems.push(`${id} is missing slug, name, base, or org`);
    walk(m, id, problems);
    const arena = m.arena ?? {};
    for (const key of ["text", "webdev", "vision", "agent"]) {
      const block = arena[key];
      if (!block) continue;
      if (key === "text") arenaText += 1;
      finite(block.rank, `${id} ${key} rank`, problems);
      if (typeof block.rank === "number" && block.rank < 1) problems.push(`${id} ${key} rank is below 1`);
      finite(block.board_size, `${id} ${key} board size`, problems);
      if (typeof block.board_size === "number" && block.board_size < 1) problems.push(`${id} ${key} board is empty`);
      if (block.pct != null) {
        finite(block.pct, `${id} ${key} percentile`, problems);
        if (typeof block.pct === "number" && (block.pct < 0 || block.pct > 100)) problems.push(`${id} ${key} percentile is outside 0–100`);
      }
    }
    for (const [cat, entry] of Object.entries(arena.text_categories?.cats ?? {})) {
      if (entry?.pct != null) {
        finite(entry.pct, `${id} ${cat} percentile`, problems);
        if (typeof entry.pct === "number" && (entry.pct < 0 || entry.pct > 100)) problems.push(`${id} ${cat} percentile is outside 0–100`);
      }
    }
    for (const row of m.epoch ?? []) {
      finite(row.score, `${id} ${row.benchmark ?? "epoch"} score`, problems);
      if (row.pct != null) {
        finite(row.pct, `${id} epoch percentile`, problems);
        if (typeof row.pct === "number" && (row.pct < 0 || row.pct > 100)) problems.push(`${id} epoch percentile is outside 0–100`);
      }
    }
    if (m.price) {
      priced += 1;
      for (const key of ["input_per_m", "output_per_m", "blended_per_m"]) {
        finite(m.price[key], `${id} ${key}`, problems);
        if (typeof m.price[key] === "number" && !(m.price[key] > 0)) problems.push(`${id} ${key} must be greater than 0`);
      }
    }
  }
  if (priced < limits.minPriced) problems.push(`priced models ${priced} is below ${limits.minPriced}`);
  if (arenaText < limits.minArenaText) problems.push(`arena text rows ${arenaText} is below ${limits.minArenaText}`);

  const sources = files.sources?.sources;
  if (!Array.isArray(sources) || sources.length < limits.minSources) {
    problems.push(`source count ${sources?.length ?? 0} is below ${limits.minSources}`);
  } else {
    const ids = new Set(sources.map((s) => s.id));
    for (const id of REQUIRED_SOURCES) if (!ids.has(id)) problems.push(`missing source ${id}`);
    for (const source of sources) {
      if (!source.as_of || !source.fetched_at) problems.push(`${source.id ?? source.name} is missing as_of or fetched_at`);
      if (/artificial analysis/i.test(`${source.name ?? ""} ${source.id ?? ""}`)) problems.push("Artificial Analysis is listed as a source");
      if (files.publish?.last_success_at && source.as_of === files.publish.last_success_at) {
        problems.push(`${source.id} as_of is the same value as the site success time`);
      }
    }
  }
  const blocked = files.sources?.blocked;
  if (!Array.isArray(blocked) || !blocked.some((b) => b.name === "Artificial Analysis")) {
    problems.push("Artificial Analysis is not on the blocked list");
  }

  const publish = files.publish;
  if (!publish || Object.keys(publish).some((key) => key !== "last_success_at")) problems.push("publish.json must contain only last_success_at");
  if (!publish?.last_success_at || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(publish.last_success_at)) {
    problems.push("last_success_at is not a UTC timestamp");
  }
  return problems;
}

export function readSnapshot(root = process.cwd()) {
  const read = (name) => JSON.parse(readFileSync(`${root}/data/${name}`, "utf8"));
  // slugs.json is rewritten from models.json by scripts/build-api.ts. A fetch
  // updates models before that rewrite, so the fetch check does not read it.
  return { models: read("models.json"), sources: read("sources.json"), publish: read("publish.json") };
}

function main() {
  const problems = snapshotProblems(readSnapshot());
  if (problems.length) {
    console.error(`Snapshot sanity failed (${problems.length}):`);
    for (const problem of problems.slice(0, 30)) console.error(`- ${problem}`);
    process.exit(1);
  }
  const doc = readSnapshot();
  const priced = doc.models.models.filter((m) => m.price).length;
  console.log(`snapshot sane: models=${doc.models.models.length} priced=${priced} sources=${doc.sources.sources.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
