/**
 * A static recommendation from the snapshot. It does not invent a score or a price.
 */
import type { Enriched } from "./data";
import { formatListPrice, formatScore } from "./facts";
import { settingLabel } from "./present";
import { CATEGORIES, headlineEligible, type CategoryId } from "./score";
import { LIVE_TASKS, type Task } from "./task-meta";

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
  const shown = task?.scale === "elo" && score != null ? String(Math.round(score)) : formatScore(score);
  const price = formatListPrice(m.price);
  const weights = m.open ? "open weights" : "closed weights";
  return `${why} ${metric} ${shown}, ${price}, ${weights}.`;
}

export function recommend(models: Enriched[], query: PickerQuery): PickerResult {
  const task = query.task === "overall" ? null : LIVE_TASKS.find((t) => t.slug === query.task) ?? null;
  if (query.task !== "overall" && !task) return { primary: null, alternatives: [], empty: "That job is not measured yet." };
  const rows = models
    .filter((m) => headlineEligible(m.comp) && (query.openOnly ? m.open : true) && priceOk(m, query.maxPrice))
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

export const USE_CASES = [
  { id: "coding", label: "Coding" },
  { id: "research", label: "Research" },
  { id: "writing", label: "Writing" },
  { id: "reasoning", label: "Reasoning" },
  { id: "math", label: "Math" },
  { id: "agents", label: "Agents" },
  { id: "general", label: "General" },
  { id: "lowest-cost", label: "Lowest cost" },
  { id: "best-performance", label: "Best performance" },
  { id: "best-value", label: "Best value" },
  { id: "open-weight", label: "Open-weight" },
] as const;

export type UseId = (typeof USE_CASES)[number]["id"];

export type AdviseRow = {
  slug: string;
  name: string;
  open: boolean;
  si: number | null;
  price: number | null;
  priceIn: number | null;
  priceOut: number | null;
  writing: number | null;
  cats: Partial<Record<CategoryId, number | null>>;
};

export type AdviseAlt = { kind: "cheaper" | "open-weight" | "runner-up"; slug: string; name: string; line: string };

export type AdviseResult = { primary: { slug: string; name: string; why: string } | null; alternatives: AdviseAlt[]; empty: string | null };

function useMetric(row: AdviseRow, use: UseId): number | null {
  if (use === "coding") return row.cats.coding ?? null;
  if (use === "math") return row.cats.math ?? null;
  if (use === "agents") return row.cats.agents ?? null;
  if (use === "reasoning") return row.cats.reasoning ?? null;
  if (use === "writing") return row.writing;
  if (use === "research") {
    const parts = [row.cats.reasoning, row.cats.math].filter((v): v is number => typeof v === "number");
    return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null;
  }
  if (use === "open-weight") return row.open ? row.si : null;
  if (use === "lowest-cost") return row.price != null && row.price > 0 && row.si != null ? row.price : null;
  if (use === "best-value") return row.si != null && row.price != null && row.price > 0 ? row.si / row.price : null;
  return row.si;
}

function whyLine(row: AdviseRow, use: UseId, metric: number): string {
  const measured = CATEGORIES.flatMap((c) => (typeof row.cats[c.id] === "number" ? [{ label: c.short, score: Math.round(row.cats[c.id] as number) }] : [])).sort((a, b) => b.score - a.score);
  const top = measured[0];
  const bottom = measured.length > 1 ? measured[measured.length - 1] : null;
  const price = formatListPrice(row.priceIn != null && row.priceOut != null ? { input_per_m: row.priceIn, output_per_m: row.priceOut } : null);
  const job = USE_CASES.find((u) => u.id === use)?.label ?? "General";
  const lead = use === "lowest-cost" ? `${price} is the lowest list price in this list` : `${job} picks ${row.name} at ${formatScore(metric)}`;
  const strong = top ? ` Strongest measured category: ${top.label} ${top.score}.` : "";
  const weak = bottom ? ` Weakest measured category: ${bottom.label} ${bottom.score}.` : "";
  return `${lead}.${strong}${weak} ${price}.`;
}

export function advise(rows: AdviseRow[], query: { use: UseId; quality: number }): AdviseResult {
  const use = USE_CASES.some((u) => u.id === query.use) ? query.use : "general";
  const quality = Math.min(100, Math.max(0, query.quality));
  const ranked = rows.flatMap((row) => {
    const metric = useMetric(row, use);
    if (metric == null) return [];
    const cost = row.price == null || row.price <= 0 ? 80 : Math.min(100, Math.max(0, Math.log10(row.price) * 20 + 40));
    const key = use === "lowest-cost" ? metric : (quality / 100) * metric - (1 - quality / 100) * cost;
    return [{ row, metric, key }];
  });
  ranked.sort((a, b) => (use === "lowest-cost" ? a.key - b.key : b.key - a.key));
  const first = ranked[0];
  if (!first) return { primary: null, alternatives: [], empty: "No model in this snapshot matches that use." };
  const alternatives: AdviseAlt[] = [];
  const runner = ranked.find((r) => r.row.slug !== first.row.slug);
  if (runner) alternatives.push({ kind: "runner-up", slug: runner.row.slug, name: runner.row.name, line: `Next on this list. ${formatScore(runner.row.si)} on the SIscope Score.` });
  const cheaper = [...ranked].filter((r) => r.row.slug !== first.row.slug && r.row.price != null && (first.row.price == null || r.row.price < first.row.price)).sort((a, b) => a.row.price! - b.row.price!)[0];
  if (cheaper) alternatives.push({ kind: "cheaper", slug: cheaper.row.slug, name: cheaper.row.name, line: `Lower list price. ${formatListPrice({ input_per_m: cheaper.row.priceIn ?? cheaper.row.price!, output_per_m: cheaper.row.priceOut ?? cheaper.row.price! })}.` });
  const open = ranked.find((r) => r.row.open && r.row.slug !== first.row.slug && r.row.slug !== cheaper?.row.slug);
  if (open) alternatives.push({ kind: "open-weight", slug: open.row.slug, name: open.row.name, line: `Open weights. SIscope Score ${formatScore(open.row.si)}.` });
  return { primary: { slug: first.row.slug, name: first.row.name, why: whyLine(first.row, use, first.metric) }, alternatives: alternatives.slice(0, 3), empty: null };
}
