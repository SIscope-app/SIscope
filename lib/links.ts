// Stable public URLs for the sources behind each number. Every pattern here was checked by hand
// (curl for Epoch AI and OpenRouter; Arena sits behind a bot check, so its pages were checked with a fetcher).
// Only add a URL here after checking it resolves.

export const ARENA_BOARD_URL = {
  text: "https://arena.ai/leaderboard/chat/text",
  vision: "https://arena.ai/leaderboard/chat/vision",
  webdev: "https://arena.ai/leaderboard/webdev",
  agent: "https://arena.ai/leaderboard/agent",
} as const;

export const ARENA_DATASET_URL = "https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset";

/** Epoch AI benchmark pages, keyed by our benchmark id. */
export const EPOCH_BENCH_URL: Record<string, string> = {
  gpqa_diamond: "https://epoch.ai/benchmarks/gpqa-diamond",
  simpleqa_verified: "https://epoch.ai/benchmarks/simple-qa-verified",
  otis_mock_aime: "https://epoch.ai/benchmarks/otis-mock-aime-2024-2025",
  swe_bench_verified: "https://epoch.ai/benchmarks/swe-bench-verified",
  // epoch.ai/benchmarks/frontiermath currently shows Tier 4; our number is Tiers 1-3, so link the hub instead.
  frontiermath: "https://epoch.ai/frontiermath",
};
export const EPOCH_HUB_URL = "https://epoch.ai/benchmarks";

export function epochBenchUrl(id: string): string {
  return EPOCH_BENCH_URL[id] ?? EPOCH_HUB_URL;
}

/** OpenRouter model page, e.g. https://openrouter.ai/openai/gpt-4o */
export function openrouterUrl(id: string): string {
  return `https://openrouter.ai/${id}`;
}
