import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { EpochBenchmark, Model } from "./types";
import { prettyName, prettyParts } from "./names";
import { categoryScores, composite, referencePercentiles, staleSourceIds, type CategoryScores, type Components } from "./score";
import { arenaTextMargins, provisionalScore, type TextMargin } from "./trust";

/**
 * Read a snapshot file from disk. The JSON is not imported, so the Cloudflare
 * worker script does not contain it. Prerender runs in Node, where the files exist.
 * A request that still renders reads the copy published under /data/.
 */
function readData<T>(name: string): T {
  const candidates = [join(process.cwd(), "data", name), join(process.cwd(), "public", "data", name)];
  const path = candidates.find((p) => existsSync(p));
  if (!path) throw new Error(`Missing data file ${name}`);
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

type ModelsFile = { built_at: string; models: Model[]; epoch_benchmarks: Record<string, EpochBenchmark> };
type PublishFile = { last_success_at: string };
type SourcesFile = {
  built_at: string;
  sources: { id: string; name: string; url: string; home: string; license: string; license_url: string; attribution: string; fetched_at: string; as_of: string; used_for: string }[];
  blocked: { name: string; reason: string }[];
};
type ChangesFile = {
  week_to: string;
  prev: string;
  changes: { kind: string; board: string; model?: string; slug?: string; org?: string; text: string; sub: string; date: string; source: string }[];
  gap: { d: string; closed: number; open: number; closed_name: string; open_name: string }[];
};

export type AgentsData = {
  arena_agent: { publish_date: string; rows: { name: string; org: string; model_license: string; rank: number; score: number; lo: number; hi: number; sessions: number | null; cost_per_task_p50: number | null }[]; fetched_at: string };
  exgentic: { fetched_at: string; dataset_last_modified: string; rows: { agent: string; agent_name: string; model: string; benchmark: string; benchmark_name: string; subset: string | null; success: number | null; score: number | null; avg_cost: number | null; sessions: number }[] };
};

type NamedModel = Model & { raw_name: string };

type Store = {
  raw: { built_at: string; models: NamedModel[]; epoch_benchmarks: Record<string, EpochBenchmark> };
  names: Map<string, string>;
  publish: PublishFile;
  sources: SourcesFile;
  changes: ChangesFile;
  agents: AgentsData;
};

let store: Store | null = null;

function assemble(files: { models: ModelsFile; publish: PublishFile; sources: SourcesFile; changes: ChangesFile; agents: AgentsData }): Store {
  const models = files.models.models.map((m) => {
    const p = prettyParts(m.base, m.variant);
    return { ...m, raw_name: m.name, base: p.base, variant: p.variant, name: p.variant ? `${p.base} (${p.variant})` : p.base };
  });
  const names = new Map<string, string>();
  for (const m of models) {
    names.set(m.slug, m.name);
    names.set(m.raw_name, m.name);
  }
  const label = (ref: string) => names.get(ref) ?? prettyName(ref);
  const changes = files.changes;
  const agents = files.agents;
  return {
    raw: { ...files.models, models },
    names,
    publish: files.publish,
    sources: files.sources,
    changes: {
      ...changes,
      changes: changes.changes.map((c) => (c.model ? { ...c, model: label(c.model) } : c)),
      gap: changes.gap.map((g) => ({ ...g, closed_name: label(g.closed_name), open_name: label(g.open_name) })),
    },
    agents: {
      ...agents,
      arena_agent: { ...agents.arena_agent, rows: agents.arena_agent.rows.map((r) => ({ ...r, name: label(r.name) })) },
    },
  };
}

function diskAllowed(): boolean {
  // The worker must not touch node:fs. Its shim can hang on a missing file.
  return process.env.SISCOPE_DISK === "1" || process.env.NEXT_PHASE === "phase-production-build";
}

function fromDisk(): Store {
  return assemble({
    models: readData<ModelsFile>("models.json"),
    publish: readData<PublishFile>("publish.json"),
    sources: readData<SourcesFile>("sources.json"),
    changes: readData<ChangesFile>("changes.json"),
    agents: readData<AgentsData>("agents.json"),
  });
}

let loading: Promise<void> | null = null;

/** Fill the snapshot. Disk during prerender; the static asset copy if a request still renders. */
export function ensureData(): Promise<void> {
  if (store) return Promise.resolve();
  if (!loading) {
    loading = (async () => {
      if (diskAllowed()) {
        store = fromDisk();
        return;
      }
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const assets = getCloudflareContext().env.ASSETS as { fetch: (input: Request) => Promise<Response> };
      async function pull<T>(name: string): Promise<T> {
        const res = await assets.fetch(new Request(`https://siscope.app/data/${name}`));
        if (!res.ok) throw new Error(`Missing /data/${name}`);
        return (await res.json()) as T;
      }
      store = assemble({
        models: await pull("models.json"),
        publish: await pull("publish.json"),
        sources: await pull("sources.json"),
        changes: await pull("changes.json"),
        agents: await pull("agents.json"),
      });
    })();
  }
  return loading;
}

function snapshot(): Store {
  if (!store) {
    if (!diskAllowed()) throw new Error("Snapshot was not loaded.");
    store = fromDisk();
  }
  return store;
}

/** Display name for any model reference in the data: a slug, a raw source name, or a display name. */
export function displayName(ref: string): string {
  return snapshot().names.get(ref) ?? prettyName(ref);
}

export function builtAt(): string {
  return snapshot().raw.built_at;
}

function live<T extends object>(read: () => T): T {
  return new Proxy({} as T, {
    get(_t, key) {
      const value = Reflect.get(read(), key);
      return typeof value === "function" ? value.bind(read()) : value;
    },
    ownKeys() {
      return Reflect.ownKeys(read());
    },
    getOwnPropertyDescriptor(_t, key) {
      const desc = Reflect.getOwnPropertyDescriptor(read(), key);
      if (desc) desc.enumerable = true;
      return desc;
    },
    has(_t, key) {
      return Reflect.has(read(), key);
    },
  });
}

/** Last refresh that was deployed and checked. Not a source dataset's as-of date. */
export const PUBLISH = live(() => snapshot().publish);
export const EPOCH_BENCHMARKS = live(() => snapshot().raw.epoch_benchmarks);
export const SOURCES = live(() => snapshot().sources);
export const CHANGES = live(() => snapshot().changes);
export const AGENTS = live(() => snapshot().agents);

export function sourceById(id: string) {
  return SOURCES.sources.find((s) => s.id === id)!;
}

/** Raw board values. Percentiles are applied later against the reference cohort. */
export function rawComponents(m: Model): Components {
  const c: Components = {};
  const a = m.arena;
  if (a.text?.rating != null) c["arena.text"] = a.text.rating;
  if (a.webdev?.rating != null) c["arena.webdev"] = a.webdev.rating;
  if (a.vision?.rating != null) c["arena.vision"] = a.vision.rating;
  if (a.agent?.score != null) c["arena.agent"] = a.agent.score;
  for (const [k, v] of Object.entries(a.text_categories?.cats ?? {})) if (v.rating != null) c[`arena.text.${k}`] = v.rating;
  for (const e of m.epoch) if (e.score != null) c[`epoch.${e.benchmark}`] = e.score;
  return c;
}

function stampPercentiles(m: NamedModel, comp: Components, basis: Record<string, number>): NamedModel {
  const arena = { ...m.arena };
  const block = <T extends { pct: number | null }>(value: T | undefined, key: string): T | undefined =>
    value && comp[key] != null ? { ...value, pct: comp[key] } : value;
  arena.text = block(arena.text, "arena.text");
  arena.webdev = block(arena.webdev, "arena.webdev");
  arena.vision = block(arena.vision, "arena.vision");
  arena.agent = block(arena.agent, "arena.agent");
  if (arena.text_categories) {
    const cats: NonNullable<Model["arena"]["text_categories"]>["cats"] = {};
    for (const [key, value] of Object.entries(arena.text_categories.cats)) {
      const pct = comp[`arena.text.${key}`];
      cats[key] = pct == null ? value : { ...value, pct };
    }
    arena.text_categories = { ...arena.text_categories, cats };
  }
  const epoch = m.epoch.map((row) => {
    const key = `epoch.${row.benchmark}`;
    return comp[key] == null ? row : { ...row, pct: comp[key], tested_models: basis[key] ?? row.tested_models };
  });
  return { ...m, arena, epoch };
}

export type Enriched = Model & {
  raw_name: string;
  comp: Components;
  cats: CategoryScores;
  si: number | null;
  coverage: number;
  siRank: number | null;
};

let _cache: Enriched[] | null = null;
let _margins: Map<string, TextMargin> | null = null;

/** Arena and Epoch sources older than 90 days before this snapshot. Exgentic is not a score input. */
export function currentStaleSources(): Set<"arena" | "epoch"> {
  const snap = snapshot();
  return staleSourceIds(snap.sources.sources, snap.raw.built_at);
}

export function textMargins(): Map<string, TextMargin> {
  if (_margins) return _margins;
  const rows = allModels().flatMap((m) => {
    const t = m.arena.text;
    if (t?.rating == null || t.lo == null || t.hi == null) return [];
    return [{ slug: m.slug, rank: t.rank, rating: t.rating, lo: t.lo, hi: t.hi }];
  });
  _margins = arenaTextMargins(rows);
  return _margins;
}

export function allModels(): Enriched[] {
  if (_cache) return _cache;
  const models = snapshot().raw.models;
  const stale = currentStaleSources();
  const raws = models.map(rawComponents);
  const { comps, basis } = referencePercentiles(raws, raws.map((raw) => typeof raw["arena.agent"] === "number"));
  const list = models.map((m, i) => {
    const comp = comps[i];
    const cats = categoryScores(comp, stale);
    const c = composite(cats);
    return { ...stampPercentiles(m, comp, basis), comp, cats, si: c.score, coverage: c.coverage, siRank: null as number | null };
  });
  const ranked = list.filter((m) => m.si != null).sort((a, b) => b.si! - a.si!);
  ranked.forEach((m, i) => (m.siRank = i + 1));
  _cache = list;
  return list;
}

export function modelBySlug(slug: string): Enriched | undefined {
  return allModels().find((m) => m.slug === slug);
}

export function textRanked(): Enriched[] {
  return allModels()
    .filter((m) => m.arena.text)
    .sort((a, b) => a.arena.text!.rank - b.arena.text!.rank || b.arena.text!.rating! - a.arena.text!.rating!);
}

export function siRanked(): Enriched[] {
  return allModels()
    .filter((m) => m.si != null)
    .sort((a, b) => b.si! - a.si!);
}

export function boardRanked(board: "webdev" | "vision" | "agent"): Enriched[] {
  return allModels()
    .filter((m) => m.arena[board])
    .sort((a, b) => a.arena[board]!.rank - b.arena[board]!.rank);
}

export function catRanked(cat: string): Enriched[] {
  return allModels()
    .filter((m) => m.arena.text_categories?.cats[cat])
    .sort((a, b) => a.arena.text_categories!.cats[cat].rank - b.arena.text_categories!.cats[cat].rank);
}

/** Smartest model per dollar: best text-arena score among models with a blended list price at or under `maxPrice`. */
export function bestUnder(maxPrice: number, list = textRanked()): Enriched | undefined {
  return list.find((m) => m.price && m.price.blended_per_m <= maxPrice);
}

export function textPublishDate(): string {
  return textRanked()[0]?.arena.text?.date ?? "";
}

/** Slim shape passed to client components. */
export type Slim = {
  slug: string;
  name: string;
  base: string;
  variant: string | null;
  org: string;
  open: boolean;
  si: number | null;
  /** Floor-formula score under the coverage gate. Null when an official score exists. */
  provisional: number | null;
  coverage: number;
  cats: CategoryScores;
  text: number | null;
  textRank: number | null;
  /** Compact Arena text rank span, such as "17–22", when the interval covers more than one rank. */
  textSpan?: string;
  textTied?: boolean;
  webdev: number | null;
  vision: number | null;
  agent: number | null;
  price: number | null;
  priceIn: number | null;
  priceOut: number | null;
  ctx: number | null;
  votes: number | null;
  webdevRank: number | null;
  visionRank: number | null;
  /** Epoch AI scores (0-1), by benchmark id; exact-setting matches only. */
  epoch: Record<string, number>;
  /** OpenRouter model id, for linking to its page. */
  orId: string | null;
  /** Input types OpenRouter lists for this model (text, image, audio, video, file). */
  mods: string[] | null;
  tools: boolean | null;
  structured: boolean | null;
  reasoning: boolean | null;
};

export function slim(m: Enriched): Slim {
  const margin = textMargins().get(m.slug);
  return {
    slug: m.slug,
    name: m.name,
    base: m.base,
    variant: m.variant,
    org: m.org,
    open: m.open,
    si: m.si == null ? null : Math.round(m.si * 10) / 10,
    provisional: (() => {
      const p = provisionalScore(m.cats);
      return p == null ? null : Math.round(p * 10) / 10;
    })(),
    coverage: Math.round(m.coverage * 100) / 100,
    cats: Object.fromEntries(Object.entries(m.cats).map(([k, v]) => [k, Math.round((v as number) * 10) / 10])),
    text: m.arena.text?.rating ?? null,
    textRank: m.arena.text?.rank ?? null,
    ...(margin && margin.to > margin.from ? { textSpan: `${margin.from}–${margin.to}` } : {}),
    ...(margin?.tied ? { textTied: true } : {}),
    webdev: m.arena.webdev?.rating ?? null,
    vision: m.arena.vision?.rating ?? null,
    agent: m.arena.agent?.score ?? null,
    price: m.price?.blended_per_m ?? null,
    priceIn: m.price?.input_per_m ?? null,
    priceOut: m.price?.output_per_m ?? null,
    ctx: m.price?.context_length ?? null,
    votes: m.arena.text?.votes ?? null,
    webdevRank: m.arena.webdev?.rank ?? null,
    visionRank: m.arena.vision?.rank ?? null,
    epoch: Object.fromEntries(m.epoch.map((e) => [e.benchmark, Math.round(e.score * 1000) / 1000])),
    orId: m.price?.openrouter_id ?? null,
    mods: m.price?.modalities_in ?? null,
    tools: m.price?.tools ?? null,
    structured: m.price?.structured ?? null,
    reasoning: m.price?.reasoning ?? null,
  };
}
