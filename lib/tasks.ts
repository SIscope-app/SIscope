import { allModels, type Enriched } from "./data";
import { CHEAP_MAX, VALUE_MIN_SI, type Task } from "./task-meta";

export { CHEAP_MAX, LIVE_TASKS, TASKS, VALUE_MIN_SI, taskBySlug, type Task, type TaskModel } from "./task-meta";

export function taskRanking(t: Task): { m: Enriched; v: number }[] {
  if (t.soon) return [];
  return allModels()
    .filter((m) => (t.filter ? t.filter(m) : true))
    .map((m) => ({ m, v: t.get(m) }))
    .filter((x): x is { m: Enriched; v: number } => x.v != null)
    .sort((a, b) => b.v - a.v || (b.m.si ?? 0) - (a.m.si ?? 0));
}

/** Best value: highest SIscope score among models with a snapshot-matched list price at or under CHEAP_MAX
 * and a SIscope score of at least VALUE_MIN_SI. `ranked` must be sorted by SIscope score. */
export function bestValue(ranked: Enriched[], exclude: string[] = []): Enriched | undefined {
  return ranked.find((m) => m.price && m.price.blended_per_m <= CHEAP_MAX && (m.si ?? 0) >= VALUE_MIN_SI && !exclude.includes(m.base));
}
