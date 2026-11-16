/** Chicago civil date for the public success time. Source as-of dates stay in UTC via fmtDate. */
export const FRESHNESS_TZ = "America/Chicago";

/** YYYY-MM-DD in Chicago. Date-only strings are read at noon UTC so they do not slip a day. */
export function chicagoDay(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: FRESHNESS_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function chicagoShort(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: FRESHNESS_TZ }).format(d);
}

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

/**
 * Header label. A check newer than the last rank move says so, instead of looking like the ranks changed that day.
 * `lastRankChange` is a civil date (YYYY-MM-DD) of the newest rank item, or null.
 */
export function freshnessNote(checkedAt: string | null | undefined, lastRankChange: string | null): { short: string; detail: string } {
  const base = updatedLabel(checkedAt);
  if (!checkedAt || !lastRankChange) return base;
  const checkDay = chicagoDay(checkedAt);
  if (!checkDay || checkDay <= lastRankChange) return base;
  const since = chicagoShort(lastRankChange);
  const checked = chicagoShort(checkedAt);
  return {
    short: `No rank changes since ${since}; checked ${checked}`,
    detail: `${base.detail} Arena ranks last moved ${since}.`,
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
