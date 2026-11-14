export type Provenance = { source: string; license: string; fetched_at: string };

export type ArenaBlock = Provenance & {
  rank: number;
  date: string;
  rating?: number;
  score?: number;
  lo: number;
  hi: number;
  votes?: number | null;
  sessions?: number | null;
  cost_per_task_p50?: number | null;
  pct: number | null;
  board_size: number;
};

export type CatEntry = { rating: number; rank: number; pct: number | null; board_size: number };

export type EpochResult = Provenance & {
  benchmark: string;
  score: number;
  stderr: number | null;
  tested_as: string;
  approx: boolean;
  run_date: string | null;
  log_url: string | null;
  pct?: number;
  tested_models?: number;
};

export type Price = Provenance & {
  openrouter_id: string;
  input_per_m: number;
  output_per_m: number;
  /** OpenRouter cache-read price per 1M tokens, when the listing publishes one. */
  cache_read_per_m?: number | null;
  blended_per_m: number;
  context_length: number | null;
  modalities_in: string[] | null;
  as_of: string;
};

export type HistPoint = [string, number, number]; // date, rating, rank

export type Model = {
  name: string;
  base: string;
  variant: string | null;
  org: string;
  model_license: string;
  open: boolean;
  slug: string;
  arena: {
    text?: ArenaBlock;
    webdev?: ArenaBlock;
    vision?: ArenaBlock;
    agent?: ArenaBlock;
    text_categories?: Provenance & { cats: Record<string, CatEntry> };
  };
  epoch: EpochResult[];
  price: Price | null;
  history: { text?: HistPoint[]; webdev?: HistPoint[] };
};

export type EpochBenchmark = { label: string; category: string; description: string; random_baseline: number; url: string; n: number };
