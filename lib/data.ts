import modelsJson from "@/data/models.json";
import changesJson from "@/data/changes.json";
import sourcesJson from "@/data/sources.json";
import publishJson from "@/data/publish.json";
import agentsJson from "@/data/agents.json";
import type { EpochBenchmark, Model } from "./types";
import { prettyName, prettyParts } from "./names";
import { categoryScores, composite, type CategoryScores, type Components } from "./score";

const rawJson = modelsJson as unknown as { built_at: string; models: Model[]; epoch_benchmarks: Record<string, EpochBenchmark> };
/** Models with cleaned display names (slugs unchanged). `raw_name` keeps the source spelling. */
const raw = {
  ...rawJson,
  models: rawJson.models.map((m) => {
    const p = prettyParts(m.base, m.variant);
    return { ...m, raw_name: m.name, base: p.base, variant: p.variant, name: p.variant ? `${p.base} (${p.variant})` : p.base };
  }),
};
const NAME_BY_KEY = new Map<string, string>();
for (const m of raw.models) {
  NAME_BY_KEY.set(m.slug, m.name);
  NAME_BY_KEY.set(m.raw_name, m.name);
}
/** Display name for any model reference in the data: a slug, a raw source name, or a display name. */
export function displayName(ref: string): string {
  return NAME_BY_KEY.get(ref) ?? prettyName(ref);
}

export const BUILT_AT = raw.built_at;
/** Last refresh that was deployed and checked. Not a source dataset's as-of date. */
export const PUBLISH = publishJson as { last_success_at: string };
export const EPOCH_BENCHMARKS = raw.epoch_benchmarks;
export const SOURCES = sourcesJson as unknown as {
  built_at: string;
  sources: { id: string; name: string; url: string; home: string; license: string; license_url: string; attribution: string; fetched_at: string; as_of: string; used_for: string }[];
  blocked: { name: string; reason: string }[];
};
const changesRaw = changesJson as unknown as {
  week_to: string;
  prev: string;
  changes: { kind: string; board: string; model?: string; slug?: string; org?: string; text: string; sub: string; date: string; source: string }[];
  gap: { d: string; closed: number; open: number; closed_name: string; open_name: string }[];
};
export const CHANGES = {
  ...changesRaw,
  changes: changesRaw.changes.map((c) => (c.model ? { ...c, model: displayName(c.model) } : c)),
  gap: changesRaw.gap.map((g) => ({ ...g, closed_name: displayName(g.closed_name), open_name: displayName(g.open_name) })),
};
export type AgentsData = {
  arena_agent: { publish_date: string; rows: { name: string; org: string; model_license: string; rank: number; score: number; lo: number; hi: number; sessions: number | null; cost_per_task_p50: number | null }[]; fetched_at: string };
  exgentic: { fetched_at: string; dataset_last_modified: string; rows: { agent: string; agent_name: string; model: string; benchmark: string; benchmark_name: string; subset: string | null; success: number | null; score: number | null; avg_cost: number | null; sessions: number }[] };
};
const agentsRaw = agentsJson as unknown as AgentsData;
export const AGENTS: AgentsData = {
  ...agentsRaw,
  arena_agent: { ...agentsRaw.arena_agent, rows: agentsRaw.arena_agent.rows.map((r) => ({ ...r, name: displayName(r.name) })) },
};

export function sourceById(id: string) {
  return SOURCES.sources.find((s) => s.id === id)!;
}

export function components(m: Model): Components {
  const c: Components = {};
  const a = m.arena;
  if (a.text?.pct != null) c["arena.text"] = a.text.pct;
  if (a.webdev?.pct != null) c["arena.webdev"] = a.webdev.pct;
  if (a.agent?.pct != null) c["arena.agent"] = a.agent.pct;
  if (a.vision?.pct != null) c["arena.vision"] = a.vision.pct;
  for (const [k, v] of Object.entries(a.text_categories?.cats ?? {})) if (v.pct != null) c[`arena.text.${k}`] = v.pct;
  for (const e of m.epoch) if (e.pct != null) c[`epoch.${e.benchmark}`] = e.pct;
  return c;
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
export function allModels(): Enriched[] {
  if (_cache) return _cache;
  const list = raw.models.map((m) => {
    const comp = components(m);
    const cats = categoryScores(comp);
    const c = composite(cats);
    return { ...m, comp, cats, si: c.score, coverage: c.coverage, siRank: null as number | null };
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
  coverage: number;
  cats: CategoryScores;
  text: number | null;
  textRank: number | null;
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
};

export function slim(m: Enriched): Slim {
  return {
    slug: m.slug,
    name: m.name,
    base: m.base,
    variant: m.variant,
    org: m.org,
    open: m.open,
    si: m.si == null ? null : Math.round(m.si * 10) / 10,
    coverage: Math.round(m.coverage * 100) / 100,
    cats: Object.fromEntries(Object.entries(m.cats).map(([k, v]) => [k, Math.round((v as number) * 10) / 10])),
    text: m.arena.text?.rating ?? null,
    textRank: m.arena.text?.rank ?? null,
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
  };
}
