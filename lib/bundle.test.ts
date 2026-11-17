import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".open-next") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

test("server code does not import the snapshot JSON or the OG renderer", () => {
  const data = readFileSync("lib/data.ts", "utf8");
  assert.doesNotMatch(data, /from ["']@\/data\//);
  assert.doesNotMatch(data, /import modelsJson/);
  const app = files("app").concat(files("components"));
  for (const path of app) {
    const text = readFileSync(path, "utf8");
    assert.doesNotMatch(text, /from ["']next\/og["']/, path);
    assert.doesNotMatch(text, /from ["']@\/data\/models\.json["']/, path);
  }
  assert.match(readFileSync("scripts/data-refresh.sh", "utf8"), /WORKER_GZIP_LIMIT_KIB=2867/);
});
