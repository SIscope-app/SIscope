import { CATEGORIES, type CategoryId, type CategoryScores, type Components } from "./score";

const USE: Record<CategoryId, string> = {
  coding: "coding and fixing software",
  agents: "multi-step tool use",
  reasoning: "research and hard questions",
  math: "math problems",
  chat: "general chat",
  instructions: "following precise instructions",
};

export type Profile = {
  strengths: { label: string; score: number }[];
  weaknesses: { label: string; score: number }[];
  bestUses: string[];
  poorerUses: string[];
  sources: number;
  benchmarks: number;
};

/** Strengths and weaker uses come only from measured category percentiles. */
export function modelProfile(cats: CategoryScores, comp: Components): Profile {
  const measured = CATEGORIES.flatMap((c) => {
    const v = cats[c.id];
    return typeof v === "number" ? [{ id: c.id, label: c.label, score: Math.round(v) }] : [];
  }).sort((a, b) => b.score - a.score);
  const strengths = measured.slice(0, 2);
  const weaknesses = measured.length > 2 ? measured.slice(-2).reverse() : [];
  const sources = new Set(CATEGORIES.flatMap((c) => c.components.filter((k) => typeof comp[k.id] === "number").map((k) => k.source))).size;
  const benchmarks = Object.values(comp).filter((v) => typeof v === "number").length;
  return {
    strengths,
    weaknesses,
    bestUses: strengths.map((s) => USE[s.id]),
    poorerUses: weaknesses.map((s) => USE[s.id]),
    sources,
    benchmarks,
  };
}
