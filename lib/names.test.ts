import assert from "node:assert/strict";
import test from "node:test";
import { schemaName } from "./names";

test("a dataset name does not repeat the provider or keep a trailing period", () => {
  assert.equal(schemaName("Command Command R+."), "Command R+");
  assert.equal(schemaName("Command R+."), "Command R+");
  assert.equal(schemaName("Claude Claude Opus 5.5 (High)."), "Claude Opus 5.5 (High)");
  assert.equal(schemaName("Gemini 4 Carbon (High)"), "Gemini 4 Carbon (High)");
  assert.equal(schemaName("Cohere Cohere Command R+"), "Cohere Command R+");
});
