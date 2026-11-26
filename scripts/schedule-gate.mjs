import { pathToFileURL } from "node:url";

/**
 * Morning refresh around 6 AM America/Chicago, plus one afternoon fallback.
 * 11:00 UTC is 6:00 AM CDT. 12:00 UTC is 6:00 AM CST. Hours 06 through 08
 * still count, so a late runner is not skipped. The other seasonal cron does not run.
 * 18:00 UTC runs only when today's refresh has not succeeded yet.
 */
export const FALLBACK_SCHEDULE = "0 18 * * *";

export function shouldRunScheduled({ chicagoHour, utcOffset, schedule, refreshedToday = false }) {
  const morning = utcOffset === "-0500" ? "0 11 * * *" : utcOffset === "-0600" ? "0 12 * * *" : null;
  if (morning && schedule === morning && (chicagoHour === "06" || chicagoHour === "07" || chicagoHour === "08")) return true;
  if (schedule === FALLBACK_SCHEDULE) return !refreshedToday;
  return false;
}

export function chicagoDay(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function isDirectRun() {
  const arg = process.argv[1];
  if (!arg) return false;
  return import.meta.url === pathToFileURL(arg).href;
}

if (isDirectRun()) {
  const event = process.env.GITHUB_EVENT_NAME || "";
  if (event !== "schedule") process.exit(0);
  const utcOffset = process.env.CHICAGO_OFFSET || "";
  if (utcOffset !== "-0500" && utcOffset !== "-0600") {
    console.error(`Refusing to guess America/Chicago offset (${utcOffset || "missing"}).`);
    process.exit(1);
  }
  const schedule = process.env.GITHUB_EVENT_SCHEDULE || "";
  let refreshedToday = false;
  if (schedule === FALLBACK_SCHEDULE) {
    try {
      const { readFileSync } = await import("node:fs");
      const pub = JSON.parse(readFileSync("data/publish.json", "utf8"));
      const today = process.env.CHICAGO_DATE || chicagoDay(new Date().toISOString());
      refreshedToday = chicagoDay(pub.last_success_at) === today;
    } catch {
      refreshedToday = false;
    }
  }
  const ok = shouldRunScheduled({
    chicagoHour: process.env.CHICAGO_HOUR || "",
    utcOffset,
    schedule,
    refreshedToday,
  });
  if (!ok) {
    console.log(schedule === FALLBACK_SCHEDULE ? "Today's refresh already succeeded. Skipping the fallback." : "Not the 6 AM America/Chicago slot. Skipping.");
    process.exit(10);
  }
  console.log(schedule === FALLBACK_SCHEDULE ? "Morning refresh did not succeed. Running the fallback." : "6 AM America/Chicago slot. Running.");
}
