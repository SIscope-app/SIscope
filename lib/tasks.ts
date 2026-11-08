import type { IconName } from "@/components/Icons";
import { allModels, type Enriched } from "./data";

export const CHEAP_MAX = 1; // USD per 1M tokens, blended 3:1
/** "Best value" must also be genuinely good: a minimum SIscope score, not just cheap. */
export const VALUE_MIN_SI = 75;

export type Task = {
  slug: string;
  label: string;
  short: string;
  icon: IconName;
  question: string;
  metric: string;
  unit: string;
  scale: "pct" | "elo";
  sourceNote: string;
  intro: string;
  soon?: boolean;
  get: (m: Enriched) => number | null;
  filter?: (m: Enriched) => boolean;
};

export const TASKS: Task[] = [
  {
    slug: "coding",
    label: "Coding",
    short: "Coding",
    icon: "code",
    question: "What is the best AI for coding?",
    metric: "Coding score",
    unit: "coding score",
    scale: "pct",
    sourceNote: "WebDev arena and coding prompts from Arena human votes, plus Epoch AI's SWE-bench Verified runs.",
    intro: "Writing, fixing and explaining code, and building working web apps.",
    get: (m) => m.cats.coding ?? null,
  },
  {
    slug: "writing",
    label: "Writing",
    short: "Writing",
    icon: "pen",
    question: "What is the best AI for writing?",
    metric: "Creative writing score",
    unit: "human-vote score",
    scale: "elo",
    sourceNote: "Arena text arena, creative writing prompts. People compare two anonymous answers and pick the better one.",
    intro: "Stories, emails, posts and anything where style matters.",
    get: (m) => m.arena.text_categories?.cats.creative_writing?.rating ?? null,
  },
  {
    slug: "math",
    label: "Math",
    short: "Math",
    icon: "math",
    question: "What is the best AI for math?",
    metric: "Math score",
    unit: "math score",
    scale: "pct",
    sourceNote: "Epoch AI's runs of OTIS Mock AIME and FrontierMath, plus Arena math prompts.",
    intro: "Homework, competition problems and research-level maths.",
    get: (m) => m.cats.math ?? null,
  },
  {
    slug: "vision",
    label: "Images & vision",
    short: "Vision",
    icon: "eye",
    question: "What is the best AI for understanding images?",
    metric: "Vision score",
    unit: "human-vote score",
    scale: "elo",
    sourceNote: "Arena vision arena: people upload an image, ask a question and vote on the better answer.",
    intro: "Reading screenshots, charts, photos, documents and handwriting.",
    get: (m) => m.arena.vision?.rating ?? null,
  },
  {
    slug: "agents",
    label: "Agents & tools",
    short: "Agents",
    icon: "agent",
    question: "What is the best AI model for agents?",
    metric: "Agents score",
    unit: "agents score",
    scale: "pct",
    sourceNote: "Arena Agent Arena: real multi-step agent sessions, scored from user signals.",
    intro: "Multi-step tasks where the model uses tools, runs commands and works on its own.",
    get: (m) => m.cats.agents ?? null,
  },
  {
    slug: "open",
    label: "Open models",
    short: "Open",
    icon: "open",
    question: "What is the best open-weight AI model?",
    metric: "SIscope score",
    unit: "SIscope score",
    scale: "pct",
    sourceNote: "SIscope score (Arena + Epoch AI), limited to models whose weights you can download.",
    intro: "Models you can download and run on your own hardware or cloud.",
    get: (m) => m.si,
    filter: (m) => m.open,
  },
  {
    slug: "cheap",
    label: "Cheap & good",
    short: "Cheap",
    icon: "value",
    question: "What is the best cheap AI model?",
    metric: "SIscope score",
    unit: "SIscope score",
    scale: "pct",
    sourceNote: `SIscope score, limited to models with a public list price of $${CHEAP_MAX} or less per 1M tokens (3 input : 1 output) on OpenRouter.`,
    intro: "The smartest models that cost very little to run at scale.",
    get: (m) => m.si,
    filter: (m) => !!m.price && m.price.blended_per_m <= CHEAP_MAX,
  },
  {
    slug: "fast",
    label: "Fast replies",
    short: "Fast",
    icon: "fast",
    question: "What is the fastest AI model?",
    metric: "Speed",
    unit: "tokens per second",
    scale: "pct",
    sourceNote: "Our own hourly speed tests are being built. We do not borrow speed numbers from other sites.",
    intro: "Models that start answering quickly and stream text fast.",
    soon: true,
    get: () => null,
  },
];

export function taskBySlug(slug: string) {
  return TASKS.find((t) => t.slug === slug);
}

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
