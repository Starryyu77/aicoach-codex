import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ProviderConfigStore } from "../road-to-summer/gateway/src/providers/ProviderConfigStore.ts";
import { ProviderRegistry } from "../road-to-summer/gateway/src/providers/ProviderRegistry.ts";
import { handleChat } from "../road-to-summer/gateway/src/routes/chat.ts";
import { handleMemoryGet } from "../road-to-summer/gateway/src/routes/memory.ts";
import { handleGetCurrentSession, handleStartSession } from "../road-to-summer/gateway/src/routes/session.ts";
import { buildTimeContext } from "../road-to-summer/gateway/src/time/timeContext.ts";
import { TestHermesClient } from "./support/TestHermesClient.ts";

async function context(overrideSendMessage) {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "rts-complex-input-"));
  const providerRegistry = new ProviderRegistry(new ProviderConfigStore(stateRoot));
  const testHermes = new TestHermesClient();
  providerRegistry.getHermesProvider = async () => ({
    instance: {
      id: "complex-input-hermes",
      type: "hermes-api-server",
      label: "Complex Input Hermes",
      model: "test-hermes-agent"
    },
    sendMessage: overrideSendMessage || ((input) => testHermes.sendMessage(input))
  });
  return {
    providerRegistry,
    stateRoot
  };
}

async function startWithPlan(ctx, text = "帮我安排今天胸部训练，疲劳4分，无疼痛。") {
  await handleStartSession(ctx, { location: "公寓健身房", timezone: "Asia/Singapore" });
  return handleChat(ctx, { text, timezone: "Asia/Singapore" });
}

test("complex input: risk signal overrides a load progression request", async () => {
  const ctx = await context();
  await startWithPlan(ctx);
  await handleChat(ctx, { text: "OK，我们开始训练吧", timezone: "Asia/Singapore" });
  const result = await handleChat(ctx, {
    text: "这个重量太轻了，但肩前侧有点顶，能不能加一点？",
    timezone: "Asia/Singapore"
  });

  assert.equal(result.hermes_output.type, "plan_patch");
  assert.notEqual(result.hermes_output.patch.operation, "adjust_load");
  assert.match(result.hermes_output.chat_message, /先不急|不要加重量|肩前侧/);
  assert.match(result.hermes_output.patch.reason, /风险|肩前侧|不适/);
  assert.match(result.hermes_output.patch.next_instruction, /不要加重量|停止|替代/);
  assert.ok(result.hermes_output.patch.target_item_id);
  assert.ok(result.hermes_output.state_after.current_item_id);
});

test("complex input: equipment occupied plus dumbbell-only context keeps training target and uses a patch", async () => {
  const ctx = await context();
  await startWithPlan(ctx, "今天想练背，疲劳4分，无疼痛。");
  const result = await handleChat(ctx, {
    text: "高位下拉和绳索划船都有人了，我现在只有哑铃，而且刚才感觉不到背。",
    timezone: "Asia/Singapore"
  });

  assert.equal(result.hermes_output.type, "plan_patch");
  assert.equal(result.hermes_output.patch.operation, "replace_exercise");
  assert.match(result.hermes_output.patch.to, /哑铃划船|胸托哑铃划船/);
  assert.match(result.hermes_output.patch.reason, /背部|拉力|目标/);
  assert.ok(result.hermes_output.patch.target_item_id);
  assert.equal(result.ui.current_session.current_item_id, result.hermes_output.state_after.current_item_id);
});

test("complex input: backfill plus future planning saves the past card first", async () => {
  const ctx = await context();
  const expected = buildTimeContext({
    rawText: "前天练了腿还没记录，明天想别再练腿，先帮我把前天保存。",
    timezone: "Asia/Singapore"
  });
  const result = await handleChat(ctx, {
    text: "前天练了腿还没记录，明天想别再练腿，先帮我把前天保存。",
    timezone: "Asia/Singapore"
  });

  assert.equal(result.hermes_output.type, "training_card");
  assert.equal(result.ui.training_card.date, expected.target_date);
  assert.equal(result.ui.training_card.date_label, expected.target_date_label);
  assert.match(result.ui.chat_message, /训练卡片/);
});

test("complex input: preference contradiction returns replacement memory candidates", async () => {
  const ctx = await context();
  const result = await handleChat(ctx, {
    text: "我之前说不喜欢波比跳和高强度 HIIT，但其实现在挺喜欢的，之后可以安排。",
    timezone: "Asia/Singapore"
  });
  const memory = await handleMemoryGet(ctx);

  assert.equal(result.hermes_output.type, "plan_patch");
  assert.equal(result.hermes_output.memory_updates.length, 2);
  assert.ok(result.hermes_output.memory_updates.every((update) => update.operation === "replace"));
  assert.equal(memory.pending_updates.length, 2);
  assert.ok(memory.pending_updates.some((update) => update.key === "波比跳" && update.value === "喜欢波比跳"));
  assert.ok(memory.pending_updates.some((update) => update.key === "高强度 HIIT" && update.value === "喜欢高强度 HIIT"));
});

test("complex input: Hermes session_update can advance the current set without frontend guessing", async () => {
  let currentPlan;
  const ctx = await context(async (input) => {
    if (!input.current_session.plan_card) {
      return new TestHermesClient().sendMessage(input);
    }
    const firstItem = input.current_session.plan_card.sections
      .flatMap((section) => section.items)
      .find((item) => typeof item === "object");
    currentPlan = input.current_session.plan_card;
    return {
      output: {
        type: "plan_patch",
        chat_message: "收到，已记录这一组完成。下一组继续同一动作，先保持动作稳定。",
        patch: {
          operation: "update_cue",
          target_exercise: firstItem.exercise,
          target_item_id: firstItem.item_id,
          applies_to_plan_id: currentPlan.plan_id,
          applies_to_revision: currentPlan.plan_revision,
          reason: "用户同时报告完成度和轻微晃动，先推进组数但保留动作质量提示。",
          next_instruction: "下一组保持原重量，动作速度放慢；如果继续晃动，就不要加重量。"
        },
        quick_actions: ["完成本组", "太轻了", "有点疼"],
        session_update: {
          current_item_id: firstItem.item_id,
          current_exercise: firstItem.exercise,
          current_set: 4,
          progress: `${firstItem.exercise} 第 4 组`
        }
      },
      raw: {},
      provider: "hermes"
    };
  });

  await startWithPlan(ctx);
  const result = await handleChat(ctx, {
    text: "前三组做完了，肩膀还好，但最后两次有点晃，下一步做什么？",
    timezone: "Asia/Singapore"
  });
  const current = await handleGetCurrentSession(ctx);

  assert.equal(result.hermes_output.type, "plan_patch");
  assert.equal(result.ui.current_session.current_set, 4);
  assert.match(result.ui.current_session.progress, /第 4 组/);
  assert.equal(current.current_set, 4);
  assert.equal(current.current_item_id, result.hermes_output.state_after.current_item_id);
});

