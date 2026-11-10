import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import publish from "../data/publish.json";
import sources from "../data/sources.json";
import { fmtDate, fmtDateTime } from "./format";
import { mayAdvanceSuccess, sourceShortLabel, updatedLabel } from "./freshness";
import models from "../data/models.json";
import slugs from "../data/slugs.json";

test("the public success time is a UTC stamp, separate from source as-of dates", () => {
  assert.match(publish.last_success_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  const shown = fmtDateTime(publish.last_success_at);
  assert.match(shown, /UTC$/);
  assert.match(shown, /2026/);
  assert.ok(sources.sources.length >= 4);
  for (const s of sources.sources) {
    assert.ok(s.as_of);
    assert.notEqual(s.as_of, publish.last_success_at);
    assert.notEqual(fmtDate(s.as_of), "n/a");
    assert.equal(fmtDate(s.as_of).includes("UTC"), false);
  }
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

test("Artificial Analysis stays blocked and is not a source", () => {
  assert.ok(sources.blocked.some((b) => b.name === "Artificial Analysis"));
  assert.equal(sources.sources.some((s) => /artificial analysis/i.test(s.name)), false);
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
  assert.match(layout, /updatedLabel\(PUBLISH\.last_success_at\)/);
  assert.doesNotMatch(layout, /<Freshness/);
  assert.match(footer, /id="sources"/);
  assert.match(footer, /data as of/);
  assert.match(footer, /license/);
  assert.match(home, /Arena history through/);
  assert.match(proxy, /status: 404/);
  assert.match(refresh, /HTTP 200 on the public pages/);
  const fromModels = (models as { models: { slug: string }[] }).models.map((m) => m.slug).sort();
  assert.deepEqual([...slugs].sort(), fromModels);
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
  assert.match(refresh, /WORKER_GZIP_LIMIT_KIB=3072/);
  assert.match(refresh, /wrangler deploy --dry-run/);
});
