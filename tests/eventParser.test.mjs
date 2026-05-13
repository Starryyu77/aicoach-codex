import assert from "node:assert/strict";
import test from "node:test";
import { cleanTranscript } from "../src/input/cleanTranscript.mjs";
import { parseTrainingEvent } from "../src/input/parseTrainingEvent.mjs";

test("cleans transcript and normalizes fitness terminology", () => {
  assert.equal(cleanTranscript("嗯那个下拉机坏了，今天不能用。"), "高位下拉坏了，今天不能用");
  assert.equal(cleanTranscript("晚上七点健身房人很多。"), "晚上7点健身房人很多");
});

test("classifies training request", () => {
  const event = parseTrainingEvent("今天该练什么？");
  assert.equal(event.event_type, "training_request");
  assert.equal(event.next_action, "generate_plan");
});

test("classifies equipment occupied event", () => {
  const event = parseTrainingEvent("高位下拉和绳索划船有人了。");
  assert.equal(event.event_type, "equipment_occupied");
  assert.equal(event.entities.status, "occupied");
  assert.ok(event.entities.equipment.includes("高位下拉"));
  assert.ok(event.entities.equipment.includes("绳索划船"));
});

test("classifies equipment unavailable and repaired status", () => {
  const unavailable = parseTrainingEvent("高位下拉坏了，今天不能用。");
  assert.equal(unavailable.event_type, "equipment_status");
  assert.equal(unavailable.entities.status, "unavailable");
  assert.equal(unavailable.should_update_memory, true);

  const available = parseTrainingEvent("高位下拉修好了。");
  assert.equal(available.event_type, "equipment_status");
  assert.equal(available.entities.status, "available");
});

test("classifies fatigue, exercise feedback, crowd observation, and completion", () => {
  assert.equal(parseTrainingEvent("我有点累了，还要不要继续？").event_type, "fatigue_feedback");
  assert.equal(parseTrainingEvent("我感觉不到背阔肌发力。").event_type, "exercise_feedback");
  assert.equal(parseTrainingEvent("晚上7点健身房人很多，经常排队。").event_type, "crowd_observation");
  assert.equal(parseTrainingEvent("今天练完了，帮我总结一下。").event_type, "training_completion");
});

test("classifies preference and location memory updates", () => {
  const preference = parseTrainingEvent("我不太喜欢波比跳和高强度 HIIT，但是如果确实有用可以先解释。");
  assert.equal(preference.event_type, "preference_update");
  assert.deepEqual(preference.entities.disliked_items, ["波比跳", "高强度 HIIT"]);

  const location = parseTrainingEvent("记住，公寓健身房比较小，不适合做农夫走路。");
  assert.equal(location.event_type, "location_memory_update");
  assert.equal(location.entities.location, "公寓健身房");
});

