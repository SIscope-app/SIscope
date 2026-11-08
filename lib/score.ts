/**
 * SIscope score v0.2.0, pure functions shared by server and browser.
 *
 * Every component is a percentile: "better than X% of the models that took
 * this test". A category score is the mean of its available components.
 * The overall score is the weighted mean of available categories, shown only
 * when the categories with data carry at least COVERAGE_GATE of the weight.
 * A missing category is counted at the model's own lowest measured category
 * (a conservative floor, never an outside number), so gaps can't raise a score.
 */

export const SCORE_VERSION = "0.2.0";
export const SCORE_DATE = "2026-11-03";
export const COVERAGE_GATE = 0.7;

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

export function categoryScores(comp: Components): CategoryScores {
  const out: CategoryScores = {};
  for (const c of CATEGORIES) {
    const vals = c.components.map((k) => comp[k.id]).filter((v): v is number => typeof v === "number");
    if (vals.length) out[c.id] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return out;
}

export type Composite = { score: number | null; coverage: number; categories: CategoryScores };

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
  if (!(coverage >= COVERAGE_GATE && covered > 0)) return { score: null, coverage, categories: cats };
  // A missing category counts at the model's own weakest measured category (among weighted ones),
  // so a gap in the data can never lift a model above what its measured results support.
  const measured = CATEGORIES.filter((c) => (weights[c.id] ?? 0) > 0 && typeof cats[c.id] === "number").map((c) => cats[c.id]!);
  const floor = Math.min(...measured);
  return { score: (sum + (total - covered) * floor) / total, coverage, categories: cats };
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
