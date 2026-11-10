/**
 * Decision helpers built only from scores and list prices already on each model.
 * They do not invent speed, and they do not change how a score is calculated.
 */
import type { Enriched } from "./data";
import { fmtPrice } from "./format";
import { settingLabel } from "./present";
import { VALUE_MIN_SI } from "./tasks";

export const BUDGET_CAPS = [0.5, 1, 3, 10] as const;

export type BudgetPick = {
  cap: number;
  slug: string;
  name: string;
  score: string;
  price: string;
  /** Matches the leaderboard price filter, which keeps models under this cap. */
  href: string;
};

/** Highest SIscope score under each cap. A cap is skipped when it names the same model as a tighter cap. */
export function budgetPicks(ranked: Enriched[]): BudgetPick[] {
  const out: BudgetPick[] = [];
  let previous = "";
  for (const cap of BUDGET_CAPS) {
    const m = ranked.find((x) => x.si != null && x.si >= VALUE_MIN_SI && x.price != null && x.price.blended_per_m < cap);
    if (!m?.price || m.slug === previous) continue;
    previous = m.slug;
    out.push({
      cap,
      slug: m.slug,
      name: settingLabel(m.base, m.variant),
      score: m.si!.toFixed(0),
      price: fmtPrice(m.price.blended_per_m),
      href: `/leaderboard?price=${cap}`,
    });
  }
  return out;
}

export type Suggestion = { slug: string; name: string; line: string };

/**
 * Up to three neighbouring models: a cheaper setting of the same model,
 * another model with a close score and a lower list price, and the next higher score.
 * Open-weight is added when the current model is closed and that pick is not already listed.
 */
export function suggestions(m: Enriched, all: Enriched[]): Suggestion[] {
  const out: Suggestion[] = [];
  const seen = new Set<string>([m.slug]);
  const push = (x: Enriched, line: string) => {
    if (seen.has(x.slug)) return;
    seen.add(x.slug);
    out.push({ slug: x.slug, name: settingLabel(x.base, x.variant), line });
  };
  const priceOf = (x: Enriched) => x.price?.blended_per_m;

  if (m.price) {
    const sibling = all
      .filter((x) => x.base === m.base && x.slug !== m.slug && priceOf(x) != null && priceOf(x)! < m.price!.blended_per_m)
      .sort((a, b) => (b.si ?? -1) - (a.si ?? -1) || priceOf(a)! - priceOf(b)!)[0];
    if (sibling?.price) {
      const score = sibling.si != null ? `score ${sibling.si.toFixed(0)}` : "no overall score";
      push(sibling, `Same model, ${fmtPrice(sibling.price.blended_per_m)} per 1M, ${score}`);
    }
  }

  if (m.price && m.si != null) {
    const near = all
      .filter((x) => x.base !== m.base && x.si != null && priceOf(x) != null && x.si >= m.si! - 5 && priceOf(x)! < m.price!.blended_per_m)
      .sort((a, b) => priceOf(a)! - priceOf(b)! || b.si! - a.si!)[0];
    if (near?.price && near.si != null) {
      push(near, `Score ${near.si.toFixed(0)}, list price ${fmtPrice(near.price.blended_per_m)} per 1M`);
    }
  }

  if (m.si != null) {
    const up = all.filter((x) => x.si != null && x.si > m.si!).sort((a, b) => a.si! - b.si!)[0];
    if (up?.si != null) {
      const price = up.price ? fmtPrice(up.price.blended_per_m) : "no list price";
      push(up, `Next higher score, ${up.si.toFixed(0)}, ${price} per 1M`);
    }
  }

  if (!m.open) {
    const open = all.filter((x) => x.open && x.si != null).sort((a, b) => b.si! - a.si!)[0];
    if (open?.si != null) {
      const price = open.price ? fmtPrice(open.price.blended_per_m) : "no list price";
      push(open, `Highest open-weight score, ${open.si.toFixed(0)}, ${price} per 1M`);
    }
  }

  return out.slice(0, 3);
}
