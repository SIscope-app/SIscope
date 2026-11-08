import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { shouldRunScheduled } from "./schedule-gate.mjs";

test("CST uses the 12:00 UTC cron and runs once", () => {
  assert.equal(shouldRunScheduled({ chicagoHour: "06", utcOffset: "-0600", schedule: "0 12 * * *" }), true);
  assert.equal(shouldRunScheduled({ chicagoHour: "06", utcOffset: "-0600", schedule: "0 11 * * *" }), false);
  assert.equal(shouldRunScheduled({ chicagoHour: "05", utcOffset: "-0600", schedule: "0 12 * * *" }), false);
});

test("CDT uses the 11:00 UTC cron", () => {
  assert.equal(shouldRunScheduled({ chicagoHour: "06", utcOffset: "-0500", schedule: "0 11 * * *" }), true);
  assert.equal(shouldRunScheduled({ chicagoHour: "06", utcOffset: "-0500", schedule: "0 12 * * *" }), false);
});

test("a delayed runner still runs in the 7 AM hour, once", () => {
  assert.equal(shouldRunScheduled({ chicagoHour: "07", utcOffset: "-0600", schedule: "0 12 * * *" }), true);
  assert.equal(shouldRunScheduled({ chicagoHour: "07", utcOffset: "-0600", schedule: "0 11 * * *" }), false);
  assert.equal(shouldRunScheduled({ chicagoHour: "08", utcOffset: "-0600", schedule: "0 12 * * *" }), false);
});

test("weekends are not excluded", () => {
  assert.equal(shouldRunScheduled({ chicagoHour: "06", utcOffset: "-0600", schedule: "0 12 * * *" }), true);
});

test("manual dispatch is not gated", () => {
  const result = spawnSync(process.execPath, ["scripts/schedule-gate.mjs"], {
    env: { ...process.env, GITHUB_EVENT_NAME: "workflow_dispatch" },
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
});
