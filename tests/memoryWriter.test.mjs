import assert from "node:assert/strict";
import test from "node:test";
import { memoryCandidateFromEvent } from "../src/memory/memoryWriter.mjs";
import { parseTrainingEvent } from "../src/input/parseTrainingEvent.mjs";

test("equipment status targets equipment memory", () => {
  const candidate = memoryCandidateFromEvent(parseTrainingEvent("高位下拉坏了，今天不能用。"));
  assert.equal(candidate.target_file, "equipment_memory.md");
  assert.match(candidate.content, /高位下拉/);
  assert.equal(candidate.requires_confirmation, true);
});

test("crowd observation targets observation memory rather than location rules", () => {
  const candidate = memoryCandidateFromEvent(parseTrainingEvent("晚上7点健身房人很多，经常排队。"));
  assert.equal(candidate.target_file, "observation_memory.md");
  assert.match(candidate.content, /observation_only/);
});

test("preference update targets preference memory", () => {
  const candidate = memoryCandidateFromEvent(parseTrainingEvent("我不太喜欢波比跳和高强度 HIIT，但是如果确实有用可以先解释。"));
  assert.equal(candidate.target_file, "preference_memory.md");
  assert.match(candidate.content, /波比跳/);
});

test("pain feedback targets risk memory", () => {
  const candidate = memoryCandidateFromEvent(parseTrainingEvent("肩膀前侧有点紧。"));
  assert.equal(candidate.target_file, "risk_memory.md");
});

