import assert from "node:assert/strict";
import test from "node:test";
import { buildContext } from "../src/agent/contextBuilder.mjs";
import { createResponse } from "../src/agent/respond.mjs";
import { renderResponseMarkdown } from "../src/agent/renderResponse.mjs";
import { parseTrainingEvent } from "../src/input/parseTrainingEvent.mjs";

const context = await buildContext(process.cwd());

test("scenario 1: training request returns structured plan", () => {
  const response = createResponse(parseTrainingEvent("今天该练什么？"), context);
  assert.equal(response.kind, "training_plan");
  assert.ok(response.plan.warm_up.length > 0);
  assert.ok(response.plan.main_training.length > 0);
  assert.match(renderResponseMarkdown(response), /今日训练计划/);
  assert.match(renderResponseMarkdown(response), /为什么这样安排/);
});

test("scenario 2: occupied lat pulldown and cable row keeps back goal with dumbbell replacements", () => {
  const response = createResponse(parseTrainingEvent("高位下拉和绳索划船有人了。"), context);
  assert.equal(response.training_goal_unchanged, true);
  const text = JSON.stringify(response);
  assert.match(text, /胸托哑铃划船/);
  assert.match(text, /单臂哑铃划船/);
});

test("scenario 3: broken and repaired equipment produce equipment memory updates", () => {
  const broken = createResponse(parseTrainingEvent("高位下拉坏了，今天不能用。"), context);
  assert.equal(broken.memory_updates[0].target_file, "equipment_memory.md");
  assert.match(renderResponseMarkdown(broken), /替代动作/);

  const repaired = createResponse(parseTrainingEvent("高位下拉修好了。"), context);
  assert.equal(repaired.memory_updates[0].target_file, "equipment_memory.md");
  assert.match(renderResponseMarkdown(repaired), /available/);
});

test("scenario 4: fatigue response is not over-conservative", () => {
  const response = createResponse(parseTrainingEvent("我有点累了，还要不要继续？"), context);
  const text = renderResponseMarkdown(response);
  assert.match(text, /不直接让你结束/);
  assert.match(text, /延长到 90-120 秒/);
  assert.match(text, /降重 10%-15%/);
});

test("scenario 5: lat cue uses plain language and next set adjustment", () => {
  const response = createResponse(parseTrainingEvent("我感觉不到背阔肌发力。"), context);
  const text = renderResponseMarkdown(response);
  assert.match(text, /裤兜方向拉/);
  assert.match(text, /手只是挂钩/);
  assert.match(text, /降重 10%-15%/);
});

test("scenario 6: crowd observation remains observation only", () => {
  const response = createResponse(parseTrainingEvent("晚上7点健身房人很多，经常排队。"), context);
  assert.equal(response.memory_updates[0].target_file, "observation_memory.md");
  assert.match(renderResponseMarkdown(response), /不把它直接变成绝对规则/);
});

test("scenario 7: session completion returns training log card", () => {
  const response = createResponse(parseTrainingEvent("今天练完了，帮我总结一下。"), context);
  assert.equal(response.kind, "training_log_card");
  assert.ok(Array.isArray(response.card.actual_completed));
  assert.equal(response.memory_updates[0].target_file, "training_logs.md");
});

