import assert from "node:assert/strict";
import test from "node:test";
import { commercialUse } from "./license";

test("commercial use is set only for licence names that say so", () => {
  assert.equal(commercialUse("Apache 2.0"), true);
  assert.equal(commercialUse("Apache-2.0"), true);
  assert.equal(commercialUse("MIT"), true);
  assert.equal(commercialUse("Proprietary"), false);
  assert.equal(commercialUse("CC-BY-NC-4.0"), false);
  assert.equal(commercialUse("Non-commercial"), false);
  assert.equal(commercialUse("Llama 3.1 Community"), null);
  assert.equal(commercialUse("Gemma license"), null);
  assert.equal(commercialUse(""), null);
});
