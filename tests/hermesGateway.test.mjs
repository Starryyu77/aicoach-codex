import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { MockHermesClient } from "../road-to-summer/gateway/src/hermes/HermesClient.ts";
import { handleChat } from "../road-to-summer/gateway/src/routes/chat.ts";
import { handleHistoryList } from "../road-to-summer/gateway/src/routes/history.ts";
import { handleMemoryConfirm, handleMemoryGet } from "../road-to-summer/gateway/src/routes/memory.ts";
import { handleStartSession } from "../road-to-summer/gateway/src/routes/session.ts";
import { handleVisionAssess } from "../road-to-summer/gateway/src/routes/vision.ts";
import { handleVoiceTranscribe } from "../road-to-summer/gateway/src/routes/voice.ts";

async function context() {
  return {
    hermesClient: new MockHermesClient(),
    stateRoot: await mkdtemp(path.join(tmpdir(), "rts-gateway-"))
  };
}

test("scenario 1: preworkout plan returns training_plan and quick actions", async () => {
  const ctx = await context();
  await handleStartSession(ctx, { location: "公寓健身房" });
  const result = await handleChat(ctx, { text: "今天该练什么？" });
  assert.equal(result.hermes_output.type, "training_plan");
  assert.ok(result.hermes_output.plan_card.sections.some((section) => section.name === "热身"));
  assert.ok(result.hermes_output.plan_card.sections.some((section) => section.name === "主训练"));
  assert.ok(result.hermes_output.quick_actions.includes("结束训练"));
  assert.equal(result.ui.current_session.theme, result.hermes_output.plan_card.title);
});

test("scenario 2: equipment occupied returns replace_exercise patch", async () => {
  const ctx = await context();
  const result = await handleChat(ctx, { text: "高位下拉和绳索划船有人了。" });
  assert.equal(result.hermes_output.type, "plan_patch");
  assert.equal(result.hermes_output.patch.operation, "replace_exercise");
  assert.match(result.hermes_output.patch.reason, /背部拉力/);
  assert.match(result.hermes_output.patch.to, /胸托哑铃划船/);
});

test("scenario 3: broken equipment suggests memory update", async () => {
  const ctx = await context();
  const result = await handleChat(ctx, { text: "高位下拉坏了，今天不能用。" });
  assert.equal(result.hermes_output.type, "plan_patch");
  assert.equal(result.hermes_output.patch.operation, "replace_exercise");
  assert.equal(result.hermes_output.memory_updates[0].requires_confirmation, true);
  const memory = await handleMemoryGet(ctx);
  assert.equal(memory.pending_updates.length, 1);
});

test("scenario 4: repaired equipment suggests memory update and can be confirmed", async () => {
  const ctx = await context();
  await handleChat(ctx, { text: "高位下拉修好了。" });
  const memory = await handleMemoryGet(ctx);
  assert.equal(memory.pending_updates.length, 1);
  assert.match(memory.pending_updates[0].content, /available/);
  const updated = await handleMemoryConfirm(ctx, { id: memory.pending_updates[0].id });
  assert.equal(updated.pending_updates.length, 0);
  assert.equal(updated.confirmed_updates.length, 1);
});

test("scenario 5: fatigue does not end immediately", async () => {
  const ctx = await context();
  const result = await handleChat(ctx, { text: "我有点累了，还要不要继续？" });
  assert.equal(result.hermes_output.type, "plan_patch");
  assert.equal(result.hermes_output.patch.operation, "extend_rest");
  assert.match(result.hermes_output.chat_message, /不直接让你结束/);
  assert.match(result.hermes_output.chat_message, /降重 10%-15%/);
});

test("scenario 6: target-muscle cue returns update_cue patch", async () => {
  const ctx = await context();
  const result = await handleChat(ctx, { text: "我感觉不到背阔肌发力。" });
  assert.equal(result.hermes_output.type, "plan_patch");
  assert.equal(result.hermes_output.patch.operation, "update_cue");
  assert.match(result.hermes_output.chat_message, /裤兜方向拉/);
});

test("scenario 7: vision assessment returns movement correction patch", async () => {
  const ctx = await context();
  const result = await handleVisionAssess(ctx, {
    exercise: "高位下拉",
    media: "mock-frame",
    provider: "mock"
  });
  assert.equal(result.assessment.assessment.shoulder_elevation, "slightly_high");
  assert.equal(result.hermes_output.type, "plan_patch");
  assert.equal(result.hermes_output.patch.operation, "update_cue");
  assert.match(result.hermes_output.patch.reason, /耸肩/);
});

test("scenario 8: session end saves training card and history can list it", async () => {
  const ctx = await context();
  const result = await handleChat(ctx, { text: "今天练完了，帮我总结一下。" });
  assert.equal(result.hermes_output.type, "training_card");
  assert.ok(result.ui.training_card.id);
  const history = await handleHistoryList(ctx);
  assert.equal(history.length, 1);
  assert.equal(history[0].id, result.ui.training_card.id);
});

test("voice transcribe mock returns text", async () => {
  const result = await handleVoiceTranscribe({ audio: "高位下拉有人了", provider: "mock" });
  assert.equal(result.text, "高位下拉有人了");
  assert.equal(result.provider, "mock");
});

