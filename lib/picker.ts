/**
 * A static recommendation from the snapshot. It does not invent a score or a price.
 */
import type { Enriched } from "./data";
import { fmtPrice } from "./format";
import { settingLabel } from "./present";
import { LIVE_TASKS, type Task } from "./tasks";

export type PickerQuery = {
  /** "overall" or a measured task slug. */
  task: string;
  /** Blended dollars per 1M. Null means no cap. */
  maxPrice: number | null;
  openOnly: boolean;
};

export type PickerChoice = { slug: string; name: string; reason: string };

export type PickerResult = { primary: PickerChoice | null; alternatives: PickerChoice[]; empty: string | null };

function priceOk(m: Enriched, maxPrice: number | null): boolean {
  if (maxPrice == null) return true;
  return !!m.price && m.price.blended_per_m <= maxPrice;
}

function valueOf(m: Enriched, task: Task | null): number | null {
  if (!task) return m.si;
  return task.get(m);
}

function reason(m: Enriched, task: Task | null, why: string): string {
  const score = valueOf(m, task);
  const metric = task ? task.metric : "SIscope score";
  const shown = score == null ? "no score" : task?.scale === "elo" ? String(Math.round(score)) : score.toFixed(0);
  const price = m.price ? `${fmtPrice(m.price.blended_per_m)} per 1M` : "no list price";
  const weights = m.open ? "open weights" : "closed weights";
  return `${why} ${metric} ${shown}, ${price}, ${weights}.`;
}

export function recommend(models: Enriched[], query: PickerQuery): PickerResult {
  const task = query.task === "overall" ? null : LIVE_TASKS.find((t) => t.slug === query.task) ?? null;
  if (query.task !== "overall" && !task) return { primary: null, alternatives: [], empty: "That job is not measured yet." };
  const rows = models
    .filter((m) => (query.openOnly ? m.open : true) && priceOk(m, query.maxPrice))
    .map((m) => ({ m, v: valueOf(m, task) }))
    .filter((x): x is { m: Enriched; v: number } => x.v != null)
    .sort((a, b) => b.v - a.v || (b.m.si ?? 0) - (a.m.si ?? 0));
  if (!rows.length) {
    return { primary: null, alternatives: [], empty: "No model in this snapshot matches that job, budget, and weight rule." };
  }
  const [first, ...rest] = rows;
  const primary = { slug: first.m.slug, name: settingLabel(first.m.base, first.m.variant), reason: reason(first.m, task, "Highest measured result inside the filters.") };
  const alternatives = rest.slice(0, 2).map((row, i) => ({
    slug: row.m.slug,
    name: settingLabel(row.m.base, row.m.variant),
    reason: reason(row.m, task, i === 0 ? "Next measured result inside the same filters." : "Third measured result inside the same filters."),
  }));
  return { primary, alternatives, empty: null };
}
