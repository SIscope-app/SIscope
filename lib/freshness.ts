/** Chicago civil date for the public success time. Source as-of dates stay in UTC via fmtDate. */
export const FRESHNESS_TZ = "America/Chicago";
/** Extra days past a source's usual gap before the header calls it late. */
export const STALE_GRACE_DAYS = 7;
/** How often each source normally moves, in days. Unknown ids use 1. */
export const SOURCE_CADENCE_DAYS: Record<string, number> = {
  arena: 1,
  openrouter: 1,
  epoch: 7,
  exgentic: 7,
};

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

export function sourceAgeDays(asOf: string, now: Date): number | null {
  const d = new Date(asOf.length === 10 ? `${asOf}T12:00:00Z` : asOf);
  if (Number.isNaN(d.getTime())) return null;
  return (now.getTime() - d.getTime()) / 86400000;
}

/** A source is late only after its usual gap plus a week. */
export function staleSources(sources: { id: string; name?: string }[], asOf: (id: string) => string | undefined, now: Date): string[] {
  const late: string[] = [];
  for (const source of sources) {
    const stamp = asOf(source.id);
    if (!stamp) continue;
    const age = sourceAgeDays(stamp, now);
    const cadence = SOURCE_CADENCE_DAYS[source.id] ?? 1;
    if (age != null && age > cadence + STALE_GRACE_DAYS) late.push(source.name || source.id);
  }
  return late;
}

/**
 * Header label. A check newer than the last rank move says so, instead of looking like the ranks changed that day.
 * `lastRankChange` is a civil date (YYYY-MM-DD) of the newest rank item, or null.
 * Late sources are named on the same small line. Nothing else on the page changes.
 */
export function freshnessNote(checkedAt: string | null | undefined, lastRankChange: string | null, late: string[] = []): { short: string; detail: string } {
  const base = updatedLabel(checkedAt);
  let short = base.short;
  let detail = base.detail;
  if (checkedAt && lastRankChange) {
    const checkDay = chicagoDay(checkedAt);
    if (checkDay && checkDay > lastRankChange) {
      const since = chicagoShort(lastRankChange);
      const checked = chicagoShort(checkedAt);
      short = `No rank changes since ${since}; checked ${checked}`;
      detail = `${base.detail} Arena ranks last moved ${since}.`;
    }
  }
  if (late.length) {
    const names = late.join(", ");
    short = `${short} · ${names} late`;
    detail = `${detail} ${names} ${late.length === 1 ? "is" : "are"} more than a week past the usual update.`;
  }
  return { short, detail };
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
