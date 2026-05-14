import assert from "node:assert/strict";
import { access, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ProviderConfigStore } from "../road-to-summer/gateway/src/providers/ProviderConfigStore.ts";
import { ProviderRegistry } from "../road-to-summer/gateway/src/providers/ProviderRegistry.ts";
import { handleChat } from "../road-to-summer/gateway/src/routes/chat.ts";
import { handleHistoryDelete, handleHistoryList } from "../road-to-summer/gateway/src/routes/history.ts";
import { handleMemoryConfirm, handleMemoryGet } from "../road-to-summer/gateway/src/routes/memory.ts";
import { handleGetCurrentSession, handleStartSession } from "../road-to-summer/gateway/src/routes/session.ts";
import { handleVisionAssess } from "../road-to-summer/gateway/src/routes/vision.ts";
import { handleVoiceTranscribe } from "../road-to-summer/gateway/src/routes/voice.ts";
import { buildTimeContext } from "../road-to-summer/gateway/src/time/timeContext.ts";

async function context() {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "rts-gateway-"));
  return {
    providerRegistry: new ProviderRegistry(new ProviderConfigStore(stateRoot)),
    stateRoot
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
  const current = await handleGetCurrentSession(ctx);
  assert.equal(current.current_plan.title, result.hermes_output.plan_card.title);
  assert.match(current.storage.current_plan, /current_plan\.json$/);
});

test("future date planning keeps absolute target date on plan and session", async () => {
  const ctx = await context();
  const expected = buildTimeContext({ rawText: "明天该练什么？", timezone: "Asia/Singapore" });
  await handleStartSession(ctx, { location: "公寓健身房", target_date: expected.target_date, timezone: "Asia/Singapore" });
  const result = await handleChat(ctx, { text: "明天该练什么？", target_date: expected.target_date, timezone: "Asia/Singapore" });
  assert.equal(result.hermes_output.type, "training_plan");
  assert.equal(result.hermes_output.plan_card.target_date, expected.target_date);
  assert.equal(result.ui.current_session.target_date, expected.target_date);
  assert.equal(result.ui.current_session.target_date_label, "明天");
});

test("scenario 2: equipment occupied returns replace_exercise patch", async () => {
  const ctx = await context();
  const result = await handleChat(ctx, { text: "高位下拉和绳索划船有人了。" });
  assert.equal(result.hermes_output.type, "plan_patch");
  assert.equal(result.hermes_output.patch.operation, "replace_exercise");
  assert.match(result.hermes_output.patch.reason, /背部拉力/);
  assert.match(result.hermes_output.patch.to, /胸托哑铃划船/);
});

test("plan patch updates persisted current exercise and current plan", async () => {
  const ctx = await context();
  await handleStartSession(ctx, { location: "公寓健身房" });
  await handleChat(ctx, { text: "今天该练什么？" });
  const result = await handleChat(ctx, { text: "高位下拉和绳索划船有人了。" });
  assert.equal(result.hermes_output.type, "plan_patch");
  assert.equal(result.ui.current_session.current_exercise, "胸托哑铃划船");
  assert.ok(result.ui.current_plan.sections.some((section) => (
    section.items.some((item) => typeof item === "object" && item.exercise === "胸托哑铃划船")
  )));
  const current = await handleGetCurrentSession(ctx);
  assert.equal(current.current_exercise, "胸托哑铃划船");
  assert.ok(current.current_plan.sections.some((section) => (
    section.items.some((item) => typeof item === "object" && item.exercise === "胸托哑铃划船")
  )));
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
  assert.match(result.ui.training_card.markdown, /^# /);
  assert.match(result.ui.training_card.markdown_path, /training_cards\/card-\d+\.md$/);
  const history = await handleHistoryList(ctx);
  assert.equal(history.length, 1);
  assert.equal(history[0].id, result.ui.training_card.id);
  assert.match(history[0].storage_path, /training_cards\/card-\d+\.json$/);
  assert.match(history[0].markdown_path, /training_cards\/card-\d+\.md$/);
  assert.match(history[0].markdown, /## 原计划/);
});

test("backfilled training summary saves training card on target date", async () => {
  const ctx = await context();
  const result = await handleChat(ctx, { text: "前天练完了，帮我补一张训练卡。" });
  assert.equal(result.hermes_output.type, "training_card");
  assert.equal(result.ui.training_card.date, result.hermes_output.training_card.date);
  assert.equal(result.ui.training_card.date_label, "前天");
  assert.match(result.ui.training_card.markdown, /日期语义：前天/);
});

test("explicit text date overrides stale selected date for backfilled card", async () => {
  const ctx = await context();
  const result = await handleChat(ctx, {
    text: "5月13日我练了下肢，帮我记录一下。",
    target_date: "2026-05-11",
    timezone: "Asia/Singapore"
  });
  assert.equal(result.hermes_output.type, "training_card");
  assert.equal(result.ui.training_card.date, "2026-05-13");
  assert.equal(result.ui.training_card.date_label, "昨天");
  assert.match(result.ui.training_card.markdown, /日期：2026-05-13/);
});

test("single-day review reads history without creating a new training card", async () => {
  const ctx = await context();
  await handleChat(ctx, { text: "5月13日我练了下肢，帮我记录一下。", timezone: "Asia/Singapore" });
  const before = await handleHistoryList(ctx);
  const result = await handleChat(ctx, { text: "复盘一下5月13日的训练。", timezone: "Asia/Singapore" });
  const after = await handleHistoryList(ctx);
  assert.equal(result.hermes_output.type, "training_review");
  assert.equal(result.hermes_output.review_card.scope, "single_day");
  assert.equal(after.length, before.length);
  assert.ok(result.hermes_output.review_card.sessions.some((session) => session.date === "2026-05-13"));
});

test("recent series review returns training_review without writing history", async () => {
  const ctx = await context();
  await handleChat(ctx, { text: "5月12日我练了上肢，帮我记录一下。", timezone: "Asia/Singapore" });
  await handleChat(ctx, { text: "5月13日我练了下肢，帮我记录一下。", timezone: "Asia/Singapore" });
  const before = await handleHistoryList(ctx);
  const result = await handleChat(ctx, { text: "复盘前几天这一整个系列训练。", timezone: "Asia/Singapore" });
  const after = await handleHistoryList(ctx);
  assert.equal(result.hermes_output.type, "training_review");
  assert.equal(result.hermes_output.review_card.scope, "recent_series");
  assert.equal(after.length, before.length);
  assert.ok(result.hermes_output.review_card.sessions.length >= 2);
});

test("history card delete removes json and markdown files", async () => {
  const ctx = await context();
  const result = await handleChat(ctx, { text: "今天练完了，帮我总结一下。" });
  const card = result.ui.training_card;
  await access(card.storage_path);
  await access(card.markdown_path);
  const deleted = await handleHistoryDelete(ctx, card.id);
  assert.equal(deleted.deleted, true);
  assert.equal(deleted.removed_paths.length, 2);
  const history = await handleHistoryList(ctx);
  assert.equal(history.length, 0);
});

test("history card delete rejects non-card ids", async () => {
  const ctx = await context();
  await assert.rejects(() => handleHistoryDelete(ctx, "../secrets"), /Invalid training card id/);
  await assert.rejects(() => handleHistoryDelete(ctx, "card-123/../../x"), /Invalid training card id/);
});

test("voice transcribe mock returns text", async () => {
  const ctx = await context();
  const result = await handleVoiceTranscribe(ctx, { audio: "高位下拉有人了", provider: "mock" });
  assert.equal(result.text, "高位下拉有人了");
  assert.equal(result.provider, "mock-asr");
});
