import { pathToFileURL } from "node:url";

/**
 * Once-daily 6 AM America/Chicago slot.
 * GitHub cron is UTC: 11:00 UTC is 6:00 AM CDT, 12:00 UTC is 6:00 AM CST.
 * Hour 07 is accepted only for that same seasonal cron, so a late runner
 * still refreshes once and the other UTC cron does not.
 */
export function shouldRunScheduled({ chicagoHour, utcOffset, schedule }) {
  const slot = utcOffset === "-0500" ? "0 11 * * *" : utcOffset === "-0600" ? "0 12 * * *" : null;
  if (!slot || schedule !== slot) return false;
  return chicagoHour === "06" || chicagoHour === "07";
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
  const ok = shouldRunScheduled({
    chicagoHour: process.env.CHICAGO_HOUR || "",
    utcOffset,
    schedule: process.env.GITHUB_EVENT_SCHEDULE || "",
  });
  if (!ok) {
    console.log("Not the 6 AM America/Chicago slot. Skipping.");
    process.exit(10);
  }
  console.log("6 AM America/Chicago slot. Running.");
}
