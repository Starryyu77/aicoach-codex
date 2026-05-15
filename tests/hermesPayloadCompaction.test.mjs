import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildHermesMessage } from "../road-to-summer/gateway/src/hermes/buildHermesMessage.ts";
import { getStorePaths } from "../road-to-summer/gateway/src/storage/fileStore.ts";
import { listTrainingCards, saveTrainingCard } from "../road-to-summer/gateway/src/storage/trainingCardStore.ts";

function validCard(overrides = {}) {
  return {
    date: "2026-05-13",
    date_label: "前天",
    timezone: "Asia/Singapore",
    completed_at: "2026-05-13T13:00:00.000Z",
    location: "公寓健身房",
    duration: "60 分钟",
    theme: "下肢综合",
    planned: ["哑铃高脚杯深蹲", "哑铃罗马尼亚硬拉"],
    actual_completed: ["哑铃高脚杯深蹲", "哑铃罗马尼亚硬拉"],
    adjustments: [],
    equipment_notes: [],
    body_feedback: ["下肢疲劳"],
    fatigue_notes: ["RPE 偏高"],
    pain_or_discomfort: [],
    unfinished_items: [],
    next_session_suggestions: ["下次先检查恢复。"],
    ...overrides
  };
}

test("listTrainingCards ignores pending plan drafts", async () => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "rts-cards-"));
  const paths = getStorePaths(stateRoot);
  await mkdir(paths.trainingCardsDir, { recursive: true });
  await writeFile(
    path.join(paths.trainingCardsDir, "card-pending-1.json"),
    JSON.stringify({
      type: "training_plan",
      chat_message: "old draft",
      plan_card: { title: "不是训练记录" },
      quick_actions: []
    }),
    "utf8"
  );
  await saveTrainingCard(validCard(), stateRoot);

  const cards = await listTrainingCards(stateRoot);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].theme, "下肢综合");
});

test("buildHermesMessage sends compact history without local markdown fields", () => {
  const card = validCard({
    id: "card-1",
    storage_path: "/tmp/card-1.json",
    markdown_path: "/tmp/card-1.md",
    markdown: "x".repeat(40000),
    planned: Array.from({ length: 20 }, (_, index) => `计划动作 ${index + 1}`),
    actual_completed: Array.from({ length: 20 }, (_, index) => `完成动作 ${index + 1}`)
  });

  const message = buildHermesMessage({
    source: "text",
    rawText: "今天想练胸和肩，时间 40 分钟。",
    currentSession: {
      timezone: "Asia/Singapore",
      target_date: "2026-05-15",
      target_date_label: "今天",
      phase: "preworkout",
      location: "公寓健身房"
    },
    recentTrainingCards: [card],
    memorySummary: {},
    expectedType: "training_plan"
  });

  assert.equal(message.recent_training_cards?.length, 1);
  assert.equal(message.recent_training_cards?.[0].markdown, undefined);
  assert.equal(message.recent_training_cards?.[0].storage_path, undefined);
  assert.equal(message.recent_training_cards?.[0].markdown_path, undefined);
  assert.equal(message.recent_training_cards?.[0].planned.length, 0);
  assert.equal(message.recent_training_cards?.[0].actual_completed.length, 4);
  assert.ok(JSON.stringify(message).length < 16000);
});
