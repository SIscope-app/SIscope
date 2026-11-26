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
  if (kind === "score") return "Effectively tied: the displayed scores round to the same number.";
  if (kind === "arena") return "Effectively tied: Arena text ranges overlap and the scores are within a point.";
  return null;
}
