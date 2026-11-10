/** Chicago civil date for the public success time. Source as-of dates stay in UTC via fmtDate. */
export const FRESHNESS_TZ = "America/Chicago";

export function updatedLabel(iso: string | null | undefined): { short: string; detail: string } {
  if (!iso) return { short: "Updated", detail: "Last successful update time is unavailable." };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { short: "Updated", detail: "Last successful update time is unavailable." };
  const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: FRESHNESS_TZ }).format(d);
  const full = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: FRESHNESS_TZ,
    timeZoneName: "short",
  }).format(d);
  return {
    short: `Updated ${day}`,
    detail: `Last successful update ${full}. It moves only after a deploy whose live checks pass. Source dates can be older.`,
  };
}

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
