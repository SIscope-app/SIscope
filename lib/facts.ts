/**
 * One formatter for the five facts every page shows for a model.
 * The score is the percentile composite rounded to a whole number, not a percentage.
 */
import { fmtCtx, fmtDate, fmtInOut } from "./format";

export function formatScore(si: number | null | undefined): string {
  if (si == null || Number.isNaN(si)) return "No score yet";
  return si.toFixed(0);
}

export function formatRank(rank: number | null | undefined, total: number): string {
  if (rank == null) return "Unranked";
  return `#${rank} of ${total}`;
}

export function formatListPrice(price: { input_per_m: number; output_per_m: number } | null | undefined): string {
  if (!price) return "No list price";
  return fmtInOut(price.input_per_m, price.output_per_m);
}

export function formatContext(tokens: number | null | undefined): string {
  if (tokens == null) return "No context length";
  return fmtCtx(tokens);
}

export function formatAsOf(iso: string | null | undefined): string {
  if (!iso) return "No date";
  return fmtDate(iso);
}

export type FactInput = {
  si: number | null;
  siRank: number | null;
  price: { input_per_m: number; output_per_m: number; context_length?: number | null } | null;
  asOf: string | null;
};

export type ModelFacts = { score: string; rank: string; price: string; context: string; date: string };

export function modelFacts(m: FactInput, ranked: number): ModelFacts {
  return {
    score: formatScore(m.si),
    rank: formatRank(m.siRank, ranked),
    price: formatListPrice(m.price),
    context: formatContext(m.price?.context_length),
    date: formatAsOf(m.asOf),
  };
}
