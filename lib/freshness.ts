/** Short labels for the sources already in data/sources.json. Unknown ids keep their full name. */
const SHORT: Record<string, string> = {
  arena: "Arena",
  epoch: "Epoch AI",
  openrouter: "OpenRouter prices",
  exgentic: "Open Agent Leaderboard",
};

export function sourceShortLabel(id: string, name: string): string {
  return SHORT[id] ?? name;
}

/** A refresh may publish a new success time only after fetch, build, deploy, and live checks all pass. */
export function mayAdvanceSuccess(state: { fetchOk: boolean; buildOk: boolean; deployOk: boolean; verifyOk: boolean }): boolean {
  return state.fetchOk && state.buildOk && state.deployOk && state.verifyOk;
}
