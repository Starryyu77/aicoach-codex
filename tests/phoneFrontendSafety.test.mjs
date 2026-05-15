import assert from "node:assert/strict";
import test from "node:test";
import {
  canOpenCameraForTraining,
  normalizePhoneActions,
  phonePlanItemKey,
  phonePlanSectionKey,
  safeExternalHref
} from "../road-to-summer/frontend/src/lib/phoneSafety.ts";

test("phone action normalization drops objects without labels and never renders object text", () => {
  const actions = normalizePhoneActions([
    "太轻了",
    { label: "换动作" },
    { next_instruction: "继续当前动作" },
    {},
    null,
    "太轻了",
    123
  ]);
  assert.deepEqual(actions, ["太轻了", "换动作", "继续当前动作", "123"]);
  assert.ok(actions.every((action) => action !== "[object Object]"));
});

test("phone external source href only allows http and https", () => {
  assert.equal(safeExternalHref("https://www.nasm.org/certified-personal-trainer/the-opt-model"), "https://www.nasm.org/certified-personal-trainer/the-opt-model");
  assert.equal(safeExternalHref("http://example.com/source"), "http://example.com/source");
  assert.equal(safeExternalHref("javascript:alert(1)"), undefined);
  assert.equal(safeExternalHref("data:text/html,hello"), undefined);
  assert.equal(safeExternalHref("/relative/path"), undefined);
});

test("phone plan keys stay unique for duplicate ids and malformed repeated sections", () => {
  const section = { section_id: "main", name: "主训练", items: [] };
  assert.notEqual(
    phonePlanItemKey(section, { item_id: "dup", exercise: "哑铃卧推" }, 0),
    phonePlanItemKey(section, { item_id: "dup", exercise: "哑铃卧推" }, 1)
  );
  assert.notEqual(
    phonePlanSectionKey({ section_id: "main", name: "主训练" }, 0),
    phonePlanSectionKey({ section_id: "main", name: "主训练" }, 1)
  );
});

test("phone camera entry requires an active plan target", () => {
  assert.equal(canOpenCameraForTraining({ hasPlan: false, hasCurrentTarget: false, phase: "preworkout" }), false);
  assert.equal(canOpenCameraForTraining({ hasPlan: true, hasCurrentTarget: false, phase: "warmup" }), false);
  assert.equal(canOpenCameraForTraining({ hasPlan: true, hasCurrentTarget: true, phase: "ended" }), false);
  assert.equal(canOpenCameraForTraining({ hasPlan: true, hasCurrentTarget: true, phase: "warmup", isBusy: true }), false);
  assert.equal(canOpenCameraForTraining({ hasPlan: true, hasCurrentTarget: true, phase: "warmup" }), true);
});
