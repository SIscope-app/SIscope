import type { Enriched } from "./data";
import type { ArenaBlock, Price } from "./types";

/** A list price for tests. Every amount is positive. */
export function fixturePrice(blended: number, over: Partial<Price> = {}): Price {
  return {
    source: "openrouter",
    license: "terms",
    fetched_at: "2026-11-01T00:00:00Z",
    openrouter_id: "example/model",
    input_per_m: blended,
    output_per_m: blended,
    blended_per_m: blended,
    context_length: 128000,
    modalities_in: ["text"],
    as_of: "2026-11-01T00:00:00Z",
    ...over,
  };
}

/** One arena board row for tests. */
export function fixtureArena(rank: number, over: Partial<ArenaBlock> = {}): ArenaBlock {
  return {
    source: "arena",
    license: "CC-BY-4.0",
    fetched_at: "2026-11-09T22:18:05Z",
    rank,
    date: "2026-11-08",
    lo: rank,
    hi: rank + 1,
    pct: 50,
    board_size: 100,
    ...over,
  };
}

/** A model record for tests. It is not read from data/. */
export function fixtureModel(partial: Partial<Enriched> & Pick<Enriched, "slug" | "base">): Enriched {
  const variant = partial.variant ?? null;
  const name = partial.name ?? (variant ? `${partial.base} (${variant})` : partial.base);
  return {
    name,
    raw_name: partial.raw_name ?? partial.base,
    base: partial.base,
    variant,
    org: partial.org ?? "Example",
    model_license: partial.model_license ?? "Proprietary",
    open: partial.open ?? false,
    slug: partial.slug,
    arena: partial.arena ?? {},
    epoch: partial.epoch ?? [],
    price: partial.price === undefined ? null : partial.price,
    history: partial.history ?? {},
    comp: partial.comp ?? {},
    cats: partial.cats ?? {},
    si: partial.si === undefined ? 80 : partial.si,
    coverage: partial.coverage ?? 1,
    siRank: partial.siRank === undefined ? 1 : partial.siRank,
  };
}
