import assert from "node:assert/strict";
import { access, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ProviderConfigStore } from "../road-to-summer/gateway/src/providers/ProviderConfigStore.ts";
import { ProviderRegistry } from "../road-to-summer/gateway/src/providers/ProviderRegistry.ts";
import { buildHermesMessage } from "../road-to-summer/gateway/src/hermes/buildHermesMessage.ts";
import { TestHermesClient } from "./support/TestHermesClient.ts";
import { handleChat } from "../road-to-summer/gateway/src/routes/chat.ts";
import { handleHistoryDelete, handleHistoryList, handleHistoryUpdate } from "../road-to-summer/gateway/src/routes/history.ts";
import { handleMemoryConfirm, handleMemoryGet, handleMemoryRefresh } from "../road-to-summer/gateway/src/routes/memory.ts";
import { handleGetCurrentSession, handleStartSession } from "../road-to-summer/gateway/src/routes/session.ts";
import { handleVisionAssess } from "../road-to-summer/gateway/src/routes/vision.ts";
import { handleVoiceTranscribe } from "../road-to-summer/gateway/src/routes/voice.ts";
import { saveTrainingCard } from "../road-to-summer/gateway/src/storage/trainingCardStore.ts";
import { buildTimeContext } from "../road-to-summer/gateway/src/time/timeContext.ts";

async function context() {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "rts-gateway-"));
  const providerRegistry = new ProviderRegistry(new ProviderConfigStore(stateRoot));
  const testHermes = new TestHermesClient();
  providerRegistry.getHermesProvider = async () => ({
    instance: {
      id: "test-real-hermes",
      type: "hermes-api-server",
      label: "Test Hermes Provider",
      model: "test-hermes-agent"
    },
    sendMessage: (input) => testHermes.sendMessage(input),
    test: async () => ({
      ok: true,
      providerId: "test-real-hermes",
      providerType: "hermes-api-server",
      message: "Test Hermes provider responded."
    })
  });
  return {
    providerRegistry,
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
  assert.equal(result.ui.agent_ui.version, "rts-a2ui-0.1");
  assert.ok(result.ui.agent_ui.components.some((component) => component.type === "plan_sections"));
  assert.ok(result.ui.agent_ui.components.some((component) => component.type === "action_row"));
  const current = await handleGetCurrentSession(ctx);
  assert.equal(current.current_plan.title, result.hermes_output.plan_card.title);
  assert.match(current.storage.current_plan, /current_plan\.json$/);
});

test("plan generation uses explicit exercise selection context and item roles", async () => {
  const ctx = await context();
  await handleStartSession(ctx, { location: "公寓健身房" });
  const result = await handleChat(ctx, {
    text: "帮我安排今天胸部训练，公寓健身房，有哑铃和卧推凳，疲劳4分，无疼痛。",
    timezone: "Asia/Singapore"
  });
  assert.equal(result.hermes_output.type, "training_plan");
  assert.match(result.hermes_output.plan_card.title, /胸部/);
  assert.match(result.hermes_output.plan_card.reasoning, /动作选择/);
  assert.ok(result.hermes_output.plan_card.framework_trace.some((item) => /NASM OPT/.test(item)));
  assert.ok(result.hermes_output.plan_card.framework_trace.some((item) => /ACSM 2026/.test(item)));
  assert.ok(result.hermes_output.plan_card.framework_trace.some((item) => /RPE\/RIR/.test(item)));
  assert.ok(result.hermes_output.plan_card.official_source_trace.some((item) => (
    item.framework === "NASM OPT" &&
    item.source_url.includes("nasm.org") &&
    item.source_location.includes("稳定耐力")
  )));
  assert.ok(result.hermes_output.plan_card.official_source_trace.some((item) => (
    item.framework === "ACSM 2026" &&
    item.source_url.includes("acsm.org") &&
    item.applied_decision.includes("组数")
  )));
  assert.ok(result.hermes_output.plan_card.official_source_trace.every((item) => (
    item.framework &&
    item.model &&
    item.official_source &&
    item.source_url &&
    item.source_location &&
    item.principle &&
    item.applied_decision &&
    item.why_it_matters
  )));
  assert.ok(result.hermes_output.plan_card.decision_basis.some((item) => /目标适应|动作模式|角色/.test(item)));

  const items = result.hermes_output.plan_card.sections
    .flatMap((section) => section.items)
    .filter((item) => typeof item === "object");
  assert.ok(items.length >= 4);
  assert.ok(items.some((item) => item.exercise === "哑铃平板卧推" && item.role === "main"));
  assert.ok(items.some((item) => item.selection_reason?.includes("胸部增肌")));
  assert.ok(items.every((item) => item.role && item.movement_pattern && item.selection_reason && item.source_note && item.adjustment_rule));
  assert.ok(items.some((item) => /教练依据/.test(item.source_note)));
});

test("exercise selection context is embedded in Hermes message", async () => {
  const timeContext = buildTimeContext({
    rawText: "今天想练胸，疲劳4分，无疼痛。",
    timezone: "Asia/Singapore"
  });
  const message = buildHermesMessage({
    source: "text",
    rawText: "今天想练胸，疲劳4分，无疼痛。",
    currentSession: {
      location: "公寓健身房",
      timezone: "Asia/Singapore",
      target_date: timeContext.target_date
    },
    recentTrainingCards: [],
    timeContext,
    expectedType: "training_plan"
  });
  assert.equal(message.exercise_selection_context.target_focus, "chest");
  assert.ok(message.exercise_selection_context.candidate_roles.some((role) => role.role === "main"));
  assert.match(message.instruction, /target -> target adaptation -> movement pattern/);
  assert.match(message.instruction, /ACE IFT/);
  assert.match(message.instruction, /NASM OPT/);
  assert.match(message.instruction, /NSCA Program Design/);
  assert.match(message.instruction, /ACSM 2026 Resistance Training/);
  assert.match(message.instruction, /RPE\/RIR Autoregulation/);
  assert.match(message.instruction, /official_source_trace/);
  assert.match(message.instruction, /source_note/);
  assert.match(message.instruction, /Chinese|中文/);
  assert.match(message.instruction, /Every structured PlanItem should include role/);
});

test("Hermes provider failure is surfaced instead of using local fallback", async () => {
  const ctx = await context();
  ctx.providerRegistry = {
    getHermesProvider: async () => ({
      instance: {
        id: "broken-real-hermes",
        type: "hermes-api-server",
        label: "Broken Real Hermes"
      },
      sendMessage: async () => {
        throw new Error("upstream timeout");
      }
    })
  };
  await handleStartSession(ctx, { location: "公寓健身房" });
  await assert.rejects(() => handleChat(ctx, { text: "今天该练什么？" }), /upstream timeout/);
});

test("mock Hermes provider is rejected for chat", async () => {
  const ctx = await context();
  ctx.providerRegistry = {
    getHermesProvider: async () => ({
      instance: {
        id: "mock-hermes",
        type: "mock",
        label: "Mock Hermes"
      },
      sendMessage: async () => {
        throw new Error("mock should not be called");
      }
    })
  };
  await handleStartSession(ctx, { location: "公寓健身房" });
  await assert.rejects(() => handleChat(ctx, { text: "今天该练什么？" }), /Active Hermes provider is mock/);
});

test("high fatigue shifts requested hypertrophy plan toward recovery and control", async () => {
  const ctx = await context();
  await handleStartSession(ctx, { location: "公寓健身房" });
  const result = await handleChat(ctx, {
    text: "帮我安排今天胸部训练，但睡眠5小时，疲劳7/10，别太猛。",
    timezone: "Asia/Singapore"
  });
  assert.equal(result.hermes_output.type, "training_plan");
  assert.match(result.hermes_output.plan_card.title, /恢复|功能维护/);
  assert.match(result.hermes_output.plan_card.goal, /恢复|技术控制|低疲劳/);
  const planText = JSON.stringify(result.hermes_output.plan_card.sections);
  assert.doesNotMatch(planText, /哑铃平板卧推/);
  assert.ok(result.hermes_output.plan_card.quality_warnings.some((warning) => /疲劳|睡眠/.test(warning)));
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

test("plan generation persists the real Hermes plan without local quality rewrite", async () => {
  const ctx = await context();
  await saveTrainingCard({
    date: "2026-05-12",
    date_label: "前天",
    timezone: "Asia/Singapore",
    location: "公寓健身房",
    duration: "60 分钟",
    theme: "上肢推拉综合 · 胸背肩",
    planned: [],
    actual_completed: ["哑铃卧推", "高位下拉", "哑铃坐姿肩推", "Face Pull"],
    adjustments: [],
    equipment_notes: [],
    body_feedback: ["肩背训练量较高"],
    fatigue_notes: ["热身阶段有疲劳感"],
    pain_or_discomfort: [],
    unfinished_items: [],
    next_session_suggestions: ["下次避免继续高容量胸背肩。"]
  }, ctx.stateRoot);
  await saveTrainingCard({
    date: "2026-05-13",
    date_label: "昨天",
    timezone: "Asia/Singapore",
    location: "公寓健身房",
    duration: "65 分钟",
    theme: "下肢综合 · 腿+臀",
    planned: [],
    actual_completed: ["哑铃罗马尼亚硬拉", "哑铃高脚杯深蹲", "单腿臀桥"],
    adjustments: [],
    equipment_notes: [],
    body_feedback: ["训练后左腿后侧和小腿后侧有酸感"],
    fatigue_notes: ["RDL 挑战组有明显疲劳感"],
    pain_or_discomfort: [],
    unfinished_items: [],
    next_session_suggestions: ["下一次先做恢复检查。"]
  }, ctx.stateRoot);
  const result = await handleChat(ctx, { text: "今天该练什么？", timezone: "Asia/Singapore" });
  assert.equal(result.hermes_output.type, "training_plan");
  assert.equal(result.ui.current_plan.title, result.hermes_output.plan_card.title);
  assert.doesNotMatch(result.hermes_output.chat_message, /重新校验训练计划|已改成恢复与功能维护计划|已移除重复动作/);
  const current = await handleGetCurrentSession(ctx);
  assert.equal(current.current_plan.title, result.hermes_output.plan_card.title);
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

test("Hermes session_update drives current exercise state", async () => {
  const ctx = await context();
  ctx.providerRegistry.getHermesProvider = async () => ({
    instance: {
      id: "test-real-hermes",
      type: "hermes-api-server",
      label: "Test Hermes Provider"
    },
    sendMessage: async () => ({
      output: {
        type: "plan_patch",
        chat_message: "收到，我们进入下一组。",
        patch: {
          operation: "update_cue",
          target_exercise: "死虫",
          reason: "Hermes 根据当前训练反馈推进状态。",
          next_instruction: "下一组继续保持腰背贴稳。"
        },
        quick_actions: ["完成本组", "太轻了", "有点累"],
        session_update: {
          current_exercise: "死虫",
          current_set: 2,
          progress: "动作 1/4 · 死虫 · 第 2/3 组"
        }
      },
      raw: {},
      provider: "hermes"
    })
  });
  await handleStartSession(ctx, { location: "公寓健身房" });
  const result = await handleChat(ctx, { text: "我感觉很好，没有任何酸痛" });
  assert.equal(result.hermes_output.type, "plan_patch");
  assert.equal(result.ui.current_session.current_exercise, "死虫");
  assert.equal(result.ui.current_session.current_set, 2);
  assert.match(result.ui.current_session.progress, /第 2\/3 组/);
});

test("in-session natural language too-light feedback returns load adjustment, not taxonomy prompt", async () => {
  const ctx = await context();
  await handleStartSession(ctx, { location: "公寓健身房" });
  await handleChat(ctx, { text: "帮我安排今天胸部训练，疲劳4分，无疼痛。" });
  await handleChat(ctx, { text: "OK，我们开始训练吧" });
  const result = await handleChat(ctx, { text: "太轻了" });
  assert.equal(result.hermes_output.type, "plan_patch");
  assert.equal(result.hermes_output.patch.operation, "adjust_load");
  assert.doesNotMatch(result.hermes_output.chat_message, /请确认这是器械、疲劳、疼痛/);
  assert.match(result.hermes_output.chat_message, /偏轻|加重|RPE|RIR/);
  assert.ok(result.ui.current_session.current_exercise);
  assert.match(result.hermes_output.patch.next_instruction, /加重|原重量/);
});

test("in-session natural language unfamiliar movement returns cue patch", async () => {
  const ctx = await context();
  await handleStartSession(ctx, { location: "公寓健身房" });
  await handleChat(ctx, { text: "帮我安排今天胸部训练，疲劳4分，无疼痛。" });
  await handleChat(ctx, { text: "OK，我们开始训练吧" });
  const result = await handleChat(ctx, { text: "这个动作我不太会做" });
  assert.equal(result.hermes_output.type, "plan_patch");
  assert.equal(result.hermes_output.patch.operation, "update_cue");
  assert.doesNotMatch(result.hermes_output.chat_message, /请确认这是器械、疲劳、疼痛/);
  assert.match(result.hermes_output.chat_message, /先别急|动作|重量/);
  assert.match(result.hermes_output.patch.next_instruction, /热身重量|正式重量/);
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

test("memory display refresh builds dynamic snapshot from history and pending updates", async () => {
  const ctx = await context();
  await handleChat(ctx, { text: "高位下拉坏了，今天不能用。" });
  await handleChat(ctx, { text: "今天练完了，帮我总结一下。" });
  const memory = await handleMemoryRefresh(ctx, { reason: "page_open" });
  assert.equal(memory.display.refresh_reason, "page_open");
  assert.equal(memory.display.source_counts.training_cards, 1);
  assert.ok(memory.display.source_counts.pending_updates >= 1);
  assert.ok(memory.display.headline.includes("最近训练"));
  assert.ok(memory.display.sections.some((section) => section.id === "recent_training" && section.items.length === 1));
  assert.ok(memory.display.sections.some((section) => section.id === "pending_updates" && section.items.length >= 1));
});

test("preference correction replaces old disliked preferences after confirmation", async () => {
  const ctx = await context();
  await handleChat(ctx, { text: "我挺喜欢波比跳和高强度 HIIT 的。" });
  let memory = await handleMemoryGet(ctx);
  assert.equal(memory.pending_updates.length, 2);
  assert.ok(memory.pending_updates.every((update) => update.category === "preference"));
  for (const update of [...memory.pending_updates]) {
    memory = await handleMemoryConfirm(ctx, { id: update.id });
  }
  assert.ok(memory.preferences.includes("喜欢波比跳"));
  assert.ok(memory.preferences.includes("喜欢高强度 HIIT"));
  assert.ok(!memory.preferences.some((preference) => preference.includes("不喜欢波比跳")));
  assert.ok(!memory.preferences.some((preference) => preference.includes("不喜欢高强度 HIIT")));
  const refreshed = await handleMemoryRefresh(ctx, { reason: "manual" });
  const preferenceSection = refreshed.display.sections.find((section) => section.id === "preferences_observations");
  const labels = preferenceSection.items.map((item) => item.label).join("\n");
  assert.match(labels, /喜欢波比跳/);
  assert.match(labels, /喜欢高强度 HIIT/);
  assert.doesNotMatch(labels, /不喜欢波比跳/);
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

test("history card update edits metadata and regenerates markdown", async () => {
  const ctx = await context();
  const result = await handleChat(ctx, { text: "今天练完了，帮我总结一下。" });
  const card = result.ui.training_card;
  const updated = await handleHistoryUpdate(ctx, card.id, {
    date: "2026-05-12",
    date_label: "2 天前",
    theme: "修正后的训练主题",
    location: "公寓健身房",
    duration: "50 分钟"
  });
  assert.equal(updated.date, "2026-05-12");
  assert.equal(updated.date_label, "2 天前");
  assert.equal(updated.theme, "修正后的训练主题");
  assert.match(updated.markdown, /日期：2026-05-12/);
  assert.match(updated.markdown, /日期语义：2 天前/);
  assert.match(updated.markdown, /^# 修正后的训练主题/);
});

test("history card update rejects invalid dates", async () => {
  const ctx = await context();
  const result = await handleChat(ctx, { text: "今天练完了，帮我总结一下。" });
  await assert.rejects(() => handleHistoryUpdate(ctx, result.ui.training_card.id, { date: "2026/05/12" }), /Invalid training card date/);
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
