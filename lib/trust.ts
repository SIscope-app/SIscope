/**
 * Labels around the existing score. The coverage gate, weights, and composite() stay as they are.
 * A provisional number uses the same floor formula and is never written back into the ranking.
 */
import { CATEGORIES, COVERAGE_GATE, composite, DEFAULT_WEIGHTS, MISSING_PERCENTILE, type CategoryId, type CategoryScores, type Components } from "./score";

export type Measured = {
  /** Same floor formula as the official score, including models under the coverage gate. */
  score: number | null;
  coverage: number;
  /** Missing categories the floor formula fills from the weakest measured category. */
  imputed: CategoryId[];
  /** Official score when coverage clears the gate. Otherwise null. */
  official: number | null;
};

export function measuredScore(cats: CategoryScores, weights: Record<CategoryId, number> = DEFAULT_WEIGHTS): Measured {
  const official = composite(cats, weights);
  let total = 0;
  let covered = 0;
  let sum = 0;
  const measured: number[] = [];
  const imputed: CategoryId[] = [];
  for (const c of CATEGORIES) {
    const w = Math.max(0, weights[c.id] ?? 0);
    if (!(w > 0)) continue;
    total += w;
    const s = cats[c.id];
    if (typeof s === "number") {
      covered += w;
      sum += w * s;
      measured.push(s);
    } else imputed.push(c.id);
  }
  const coverage = total > 0 ? covered / total : 0;
  if (!measured.length) return { score: null, coverage, imputed: [], official: official.score };
  const score = (sum + (total - covered) * MISSING_PERCENTILE) / total;
  return { score, coverage, imputed, official: official.score };
}

/** Shown only when the model is under the gate and still has a measured category. */
export function provisionalScore(cats: CategoryScores, weights?: Record<CategoryId, number>): number | null {
  const m = measuredScore(cats, weights);
  if (m.official != null || m.score == null) return null;
  if (m.coverage >= COVERAGE_GATE) return null;
  return m.score;
}

export function categorySources(comp: Components, id: CategoryId): { n: number; only: string | null } {
  const cat = CATEGORIES.find((c) => c.id === id);
  if (!cat) return { n: 0, only: null };
  const have = cat.components.filter((k) => typeof comp[k.id] === "number");
  return { n: have.length, only: have.length === 1 ? have[0].label : null };
}

export type TieKind = "score" | "arena" | null;

export type TieRow = { score: number; lo?: number | null; hi?: number | null };

/** A row is tied with the one above it. Arena ranges count only when the scores are already close. */
export function tieWithPrevious(rows: TieRow[]): TieKind[] {
  return rows.map((row, i) => {
    if (i === 0) return null;
    const prev = rows[i - 1];
    if (Math.round(row.score) === Math.round(prev.score)) return "score";
    const close = Math.abs(row.score - prev.score) < 1;
    const overlap =
      row.lo != null &&
      row.hi != null &&
      prev.lo != null &&
      prev.hi != null &&
      row.lo <= prev.hi &&
      prev.lo <= row.hi;
    return close && overlap ? "arena" : null;
  });
}

export function tieTitle(kind: TieKind): string | null {
  if (kind === "score") return "Tied: the displayed scores round to the same number.";
  if (kind === "arena") return "Tied within margin: Arena ranges overlap.";
  return null;
}

export type TextMargin = { from: number; to: number; tied: boolean };

/** Rank span of models whose Arena rating sits inside this model's interval, plus a near-tie when neighbors overlap. */
export function arenaTextMargins(rows: { slug: string; rank: number; rating: number; lo: number; hi: number }[]): Map<string, TextMargin> {
  const sorted = [...rows].sort((a, b) => a.rank - b.rank);
  const out = new Map<string, TextMargin>();
  const overlaps = (a: { lo: number; hi: number }, b: { lo: number; hi: number }) => a.lo <= b.hi && b.lo <= a.hi;
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    const inside = sorted.filter((o) => o.rating >= m.lo && o.rating <= m.hi);
    const ranks = [m.rank, ...inside.map((o) => o.rank)];
    const prev = sorted[i - 1];
    const next = sorted[i + 1];
    out.set(m.slug, {
      from: Math.min(...ranks),
      to: Math.max(...ranks),
      tied: (prev != null && overlaps(m, prev)) || (next != null && overlaps(m, next)),
    });
  }
  return out;
}

/** Oldest measured input date for each category. Empty when that category has no dated result. */
export function categoryInputDates(m: {
  comp: Components;
  arena: { text?: { date?: string }; webdev?: { date?: string }; agent?: { date?: string } };
  epoch: { benchmark: string; run_date: string | null }[];
}): Partial<Record<CategoryId, string>> {
  const out: Partial<Record<CategoryId, string>> = {};
  for (const c of CATEGORIES) {
    const dates: string[] = [];
    for (const k of c.components) {
      if (typeof m.comp[k.id] !== "number") continue;
      if (k.id === "arena.webdev" && m.arena.webdev?.date) dates.push(m.arena.webdev.date);
      else if (k.id === "arena.agent" && m.arena.agent?.date) dates.push(m.arena.agent.date);
      else if (k.id.startsWith("arena.text") && m.arena.text?.date) dates.push(m.arena.text.date);
      else if (k.id.startsWith("epoch.")) {
        const row = m.epoch.find((e) => `epoch.${e.benchmark}` === k.id);
        if (row?.run_date) dates.push(row.run_date);
      }
    }
    if (!dates.length) continue;
    dates.sort();
    out[c.id] = dates[0];
  }
  return out;
}
