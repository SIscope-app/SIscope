import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fmtDate, fmtDateTime } from "./format";
import { freshnessNote, mayAdvanceSuccess, sourceShortLabel, updatedLabel } from "./freshness";

test("a success stamp formats as UTC and stays distinct from a source as-of date", () => {
  const stamp = "2026-11-17T01:00:00Z";
  assert.equal(fmtDateTime(stamp), "Nov 16, 7:00 PM CT");
  const shown = fmtDateTime("2026-11-10T03:47:54Z");
  assert.equal(shown, "Nov 9, 9:47 PM CT");
  assert.doesNotMatch(shown, /UTC/);
  const asOf = fmtDate("2026-11-09");
  assert.equal(asOf, "Nov 9, 2026");
  assert.equal(asOf.includes("UTC"), false);
  assert.notEqual(asOf, shown);
});

test("a failed fetch, build, deploy, or live check does not advance the success time", () => {
  const ok = { fetchOk: true, buildOk: true, deployOk: true, verifyOk: true };
  assert.equal(mayAdvanceSuccess(ok), true);
  assert.equal(mayAdvanceSuccess({ ...ok, fetchOk: false }), false);
  assert.equal(mayAdvanceSuccess({ ...ok, buildOk: false }), false);
  assert.equal(mayAdvanceSuccess({ ...ok, deployOk: false }), false);
  assert.equal(mayAdvanceSuccess({ ...ok, verifyOk: false }), false);
});

test("source labels stay on the ids already in the snapshot", () => {
  assert.equal(sourceShortLabel("arena", "Arena (formerly LMArena) leaderboard dataset"), "Arena");
  assert.equal(sourceShortLabel("epoch", "Epoch AI Benchmarking Hub"), "Epoch AI");
  assert.equal(sourceShortLabel("openrouter", "OpenRouter models API"), "OpenRouter prices");
  assert.equal(sourceShortLabel("exgentic", "Open Agent Leaderboard results (Exgentic)"), "Open Agent Leaderboard");
  assert.equal(sourceShortLabel("other", "Full name"), "Full name");
});

test("the header date is the Chicago success day, and sources stay attributed", () => {
  const stamp = updatedLabel("2026-11-10T03:47:54Z");
  assert.equal(stamp.short, "Updated Nov 9");
  assert.match(stamp.detail, /Last successful update/);
  assert.match(stamp.detail, /live checks pass/);
  const header = readFileSync("components/Header.tsx", "utf8");
  const footer = readFileSync("components/Footer.tsx", "utf8");
  const layout = readFileSync("app/layout.tsx", "utf8");
  const home = readFileSync("app/page.tsx", "utf8");
  const workflow = readFileSync(".github/workflows/data-refresh.yml", "utf8");
  const refresh = readFileSync("scripts/data-refresh.sh", "utf8");
  const proxy = readFileSync("proxy.ts", "utf8");
  assert.match(header, /href="#sources"/);
  assert.match(header, /dateTime=\{updatedAt\}/);
  assert.match(layout, /freshnessNote\(PUBLISH\.last_success_at/);
  const quiet = freshnessNote("2026-11-15T12:38:47Z", "2026-11-11");
  assert.equal(quiet.short, "No rank changes since Nov 11; checked Nov 15");
  assert.equal(freshnessNote("2026-11-11T18:00:00Z", "2026-11-11").short, "Updated Nov 11");
  assert.doesNotMatch(layout, /<Freshness/);
  assert.match(footer, /id="sources"/);
  assert.match(footer, /data as of/);
  assert.match(footer, /license/);
  assert.match(home, /Arena history through/);
  assert.match(proxy, /status: 404/);
  assert.match(refresh, /HTTP 200 on the public pages/);
  assert.match(refresh, /check-snapshot\.mjs/);
  assert.doesNotMatch(home, /Data as of \$\{fmtDate\(lastDate\)\}/);
  assert.match(workflow, /cron: "0 11 \* \* \*"/);
  assert.match(workflow, /cron: "0 12 \* \* \*"/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /timeout-minutes: 45/);
  assert.match(workflow, /contents: write/);
  assert.match(workflow, /refs\/heads\/main/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID/);
  assert.doesNotMatch(workflow, /\n\s+push:/);
  assert.doesNotMatch(workflow, /grok|openai|anthropic|cursor\.com\/agents/i);
  const main = refresh.slice(refresh.indexOf("main() {"));
  const buildAt = main.indexOf("opennextjs-cloudflare build");
  const deployAt = main.indexOf("deploy_worker");
  assert.match(refresh, /opennextjs-cloudflare deploy/);
  assert.ok(buildAt > -1 && deployAt > buildAt);
  assert.match(refresh, /wrangler rollback/);
  assert.match(refresh, /\[skip ci\]/);
  assert.match(refresh, /WORKER_GZIP_LIMIT_KIB=2867/);
  assert.match(refresh, /wrangler deploy --dry-run/);
});
