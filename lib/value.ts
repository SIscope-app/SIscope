/** Pareto frontier of score against blended list price, and the best score inside a price band. */

export const PRICE_BANDS = [0.5, 2, 10] as const;

export type PricedScore = { slug: string; name: string; si: number; price: number };

export function paretoFrontier<T extends { si: number; price: number }>(rows: T[]): T[] {
  const sorted = [...rows].sort((a, b) => a.price - b.price || b.si - a.si);
  const out: T[] = [];
  let best = -Infinity;
  for (const row of sorted) {
    if (row.si > best) {
      out.push(row);
      best = row.si;
    }
  }
  return out;
}

export function bandLeaders<T extends { si: number; price: number }>(rows: T[], bands: readonly number[] = PRICE_BANDS): { cap: number; model: T }[] {
  const out: { cap: number; model: T }[] = [];
  for (const cap of bands) {
    const pool = rows.filter((r) => r.price <= cap && r.price > 0);
    if (!pool.length) continue;
    const model = pool.reduce((a, b) => (b.si > a.si ? b : a));
    out.push({ cap, model });
  }
  return out;
}
