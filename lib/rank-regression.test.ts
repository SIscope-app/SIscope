import assert from "node:assert/strict";
import test from "node:test";
import { modelBySlug } from "./data";
import { rawComponents } from "./data";

function beatsOnShared(better: string, other: string) {
  const a = modelBySlug(better);
  const b = modelBySlug(other);
  assert.ok(a && b, `${better} and ${other}`);
  const ra = rawComponents(a!);
  const rb = rawComponents(b!);
  for (const key of Object.keys(ra)) {
    if (rb[key] == null) continue;
    assert.ok(ra[key] >= rb[key], `${better} ${key} ${ra[key]} vs ${other} ${rb[key]}`);
  }
  assert.ok(a!.si != null && b!.si != null);
  assert.ok(a!.siRank! < b!.siRank!, `${a!.name} #${a!.siRank} should rank above ${b!.name} #${b!.siRank}`);
}

test("Qwen3.8-Max beats Qwen3.5 Max Preview on every shared board and ranks higher", () => {
  beatsOnShared("qwen3-8-max", "qwen3-5-max-preview");
});

test("Grok 4.7 xHigh ranks above Grok 4.5", () => {
  const newer = modelBySlug("grok-4-7-xhigh");
  const older = modelBySlug("grok-4-5");
  assert.ok(newer && older);
  assert.equal(newer!.si != null, true);
  assert.ok(newer!.siRank! < older!.siRank!, `${newer!.name} #${newer!.siRank} should rank above ${older!.name} #${older!.siRank}`);
});
