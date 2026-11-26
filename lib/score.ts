/**
 * SIscope score v0.3.1, pure functions shared by server and browser.
 *
 * Every component is a percentile against one reference cohort (models with an
 * Arena agent result), not against each board's own population. A category
 * score fills any missing test in that category at the reference 25th
 * percentile before averaging, so fewer sources cannot raise it. The overall
 * score does the same for a missing category. That fill is provisional: it
 * keeps a gap from helping the model, and it is labelled as such.
 */

export const SCORE_VERSION = "0.3.1";
export const SCORE_DATE = "2026-11-26";
export const COVERAGE_GATE = 0.7;
/** Reference-cohort percentile used wherever a measured result is missing. */
export const MISSING_PERCENTILE = 25;
/** A scored source older than this, measured from the snapshot time, is stale. */
export const STALE_AFTER_DAYS = 90;
/**
 * A stale measurement is blended this far toward MISSING_PERCENTILE.
 * The rest of the blend is the measured percentile. A missing test stays at
 * MISSING_PERCENTILE and is never treated as zero. Category weights do not change.
 */
export const STALE_BLEND = 0.5;

export type CategoryId = "coding" | "agents" | "reasoning" | "math" | "chat" | "instructions";

export type Component = { id: string; label: string; source: "arena" | "epoch" };

export const CATEGORIES: {
  id: CategoryId;
  label: string;
  short: string;
  weight: number;
  blurb: string;
  components: Component[];
}[] = [
  {
    id: "coding",
    label: "Coding",
    short: "Coding",
    weight: 25,
    blurb: "Writing and fixing code, building web apps.",
    components: [
      { id: "arena.webdev", label: "WebDev arena (human votes on built web apps)", source: "arena" },
      { id: "arena.text.coding", label: "Text arena, coding prompts (human votes)", source: "arena" },
      { id: "epoch.swe_bench_verified", label: "SWE-bench Verified (Epoch AI run)", source: "epoch" },
    ],
  },
  {
    id: "agents",
    label: "Agents & tools",
    short: "Agents",
    weight: 25,
    blurb: "Doing multi-step tasks on its own with tools.",
    components: [{ id: "arena.agent", label: "Agent arena (real agent sessions)", source: "arena" }],
  },
  {
    id: "reasoning",
    label: "Reasoning & knowledge",
    short: "Reasoning",
    weight: 20,
    blurb: "Hard questions, science, getting facts right.",
    components: [
      { id: "epoch.gpqa_diamond", label: "GPQA Diamond (Epoch AI run)", source: "epoch" },
      { id: "epoch.simpleqa_verified", label: "SimpleQA Verified (Epoch AI run)", source: "epoch" },
      { id: "arena.text.hard_prompts", label: "Text arena, hard prompts (human votes)", source: "arena" },
    ],
  },
  {
    id: "math",
    label: "Math",
    short: "Math",
    weight: 15,
    blurb: "Competition and research-level maths.",
    components: [
      { id: "epoch.otis_mock_aime", label: "OTIS Mock AIME (Epoch AI run)", source: "epoch" },
      { id: "epoch.frontiermath", label: "FrontierMath Tiers 1-3 (Epoch AI run)", source: "epoch" },
      { id: "arena.text.math", label: "Text arena, math prompts (human votes)", source: "arena" },
    ],
  },
  {
    id: "chat",
    label: "Chat quality",
    short: "Chat",
    weight: 10,
    blurb: "Which answers people prefer in blind tests.",
    components: [{ id: "arena.text", label: "Text arena overall (human votes)", source: "arena" }],
  },
  {
    id: "instructions",
    label: "Following instructions",
    short: "Instructions",
    weight: 5,
    blurb: "Doing exactly what was asked.",
    components: [{ id: "arena.text.instruction_following", label: "Text arena, instruction following (human votes)", source: "arena" }],
  },
];

export const DEFAULT_WEIGHTS: Record<CategoryId, number> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.weight]),
) as Record<CategoryId, number>;

export type Components = Record<string, number>; // component id -> percentile 0-100
export type CategoryScores = Partial<Record<CategoryId, number>>;

/** Share of `reference` values strictly below `value`, on a 0–100 scale. */
export function percentileAgainst(value: number, reference: number[]): number | null {
  const vals = reference.filter((v) => Number.isFinite(v));
  if (vals.length < 2 || !Number.isFinite(value)) return null;
  const below = vals.reduce((n, v) => n + (v < value ? 1 : 0), 0);
  return Math.min(100, Math.round((1000 * below) / (vals.length - 1)) / 10);
}

/**
 * Percentiles for every model. `cohort[i]` is true when that model is in the
 * reference cohort. A field uses the cohort's values when at least two cohort
 * models have it, and every model with the field otherwise.
 */
export function referencePercentiles(raws: Components[], cohort: boolean[]): { comps: Components[]; basis: Record<string, number> } {
  const ref: Record<string, number[]> = {};
  const all: Record<string, number[]> = {};
  raws.forEach((raw, i) => {
    for (const [key, value] of Object.entries(raw)) {
      if (!Number.isFinite(value)) continue;
      (all[key] ??= []).push(value);
      if (cohort[i]) (ref[key] ??= []).push(value);
    }
  });
  const basis: Record<string, number> = {};
  const pool: Record<string, number[]> = {};
  for (const key of Object.keys(all)) {
    const use = (ref[key]?.length ?? 0) >= 2 ? ref[key] : all[key];
    pool[key] = use;
    basis[key] = use.length;
  }
  const comps = raws.map((raw) => {
    const out: Components = {};
    for (const [key, value] of Object.entries(raw)) {
      const pct = percentileAgainst(value, pool[key] ?? []);
      if (pct != null) out[key] = pct;
    }
    return out;
  });
  return { comps, basis };
}

export function categoryScores(comp: Components, stale: ReadonlySet<string> = new Set()): CategoryScores {
  const out: CategoryScores = {};
  for (const c of CATEGORIES) {
    const vals = c.components.map((k) => {
      const v = comp[k.id];
      if (typeof v !== "number") return null;
      return stale.has(k.source) ? STALE_BLEND * v + (1 - STALE_BLEND) * MISSING_PERCENTILE : v;
    });
    const present = vals.filter((v): v is number => v != null);
    if (!present.length) continue;
    const missing = c.components.length - present.length;
    const sum = present.reduce((a, b) => a + b, 0) + missing * MISSING_PERCENTILE;
    out[c.id] = sum / c.components.length;
  }
  return out;
}

/** Designed share of the overall score when every component in a category is present. */
export function effectiveSourceShares(): { source: "arena" | "epoch"; percent: number }[] {
  const totals = { arena: 0, epoch: 0 };
  for (const c of CATEGORIES) {
    const n = c.components.length;
    for (const k of c.components) totals[k.source] += c.weight / n;
  }
  const sum = totals.arena + totals.epoch;
  return [
    { source: "arena", percent: (totals.arena / sum) * 100 },
    { source: "epoch", percent: (totals.epoch / sum) * 100 },
  ];
}

/** Arena and Epoch only. Other files, including the Open Agent Leaderboard, are not score inputs. */
export function staleSourceIds(sources: { id: string; as_of: string }[], nowIso: string, days = STALE_AFTER_DAYS): Set<"arena" | "epoch"> {
  const now = Date.parse(nowIso);
  const stale = new Set<"arena" | "epoch">();
  if (!Number.isFinite(now)) return stale;
  for (const s of sources) {
    if (s.id !== "arena" && s.id !== "epoch") continue;
    const raw = s.as_of.length <= 10 ? `${s.as_of}T00:00:00Z` : s.as_of;
    const t = Date.parse(raw);
    if (Number.isFinite(t) && now - t > days * 86400000) stale.add(s.id);
  }
  return stale;
}

/** A headline pick needs every category measured, or two independent sources. */
export function headlineEligible(comp: Components): boolean {
  const full = CATEGORIES.every((c) => c.components.some((k) => typeof comp[k.id] === "number"));
  if (full) return true;
  let sources = 0;
  if (comp["arena.text"] != null || Object.keys(comp).some((k) => k.startsWith("arena.text."))) sources += 1;
  if (comp["arena.webdev"] != null) sources += 1;
  if (comp["arena.vision"] != null) sources += 1;
  if (comp["arena.agent"] != null) sources += 1;
  const epochInScore = new Set(CATEGORIES.flatMap((c) => c.components.map((k) => k.id)).filter((id) => id.startsWith("epoch.")));
  if (Object.keys(comp).some((k) => epochInScore.has(k))) sources += 1;
  return sources >= 2;
}

export type Composite = { score: number | null; coverage: number; categories: CategoryScores; provisional: boolean };

export function composite(cats: CategoryScores, weights: Record<CategoryId, number> = DEFAULT_WEIGHTS): Composite {
  let total = 0,
    covered = 0,
    sum = 0;
  for (const c of CATEGORIES) {
    const w = Math.max(0, weights[c.id] ?? 0);
    total += w;
    const s = cats[c.id];
    if (typeof s === "number") {
      covered += w;
      sum += w * s;
    }
  }
  const coverage = total > 0 ? covered / total : 0;
  const provisional = covered < total;
  if (!(coverage >= COVERAGE_GATE && covered > 0)) return { score: null, coverage, categories: cats, provisional };
  // A missing category counts at the reference 25th percentile, never at the model's own score.
  return { score: (sum + (total - covered) * MISSING_PERCENTILE) / total, coverage, categories: cats, provisional };
}

export function weightsToQuery(w: Record<CategoryId, number>): string {
  return CATEGORIES.map((c) => `${c.id}:${w[c.id]}`).join(",");
}

export function weightsFromQuery(q: string | null | undefined): Record<CategoryId, number> | null {
  if (!q) return null;
  const out = { ...DEFAULT_WEIGHTS };
  let ok = false;
  for (const part of q.split(",")) {
    const [k, v] = part.split(":");
    if (k in out && !Number.isNaN(Number(v))) {
      out[k as CategoryId] = Math.min(100, Math.max(0, Number(v)));
      ok = true;
    }
  }
  return ok ? out : null;
}
