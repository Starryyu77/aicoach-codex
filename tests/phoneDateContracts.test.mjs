import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { handleGetCurrentSession, handleStartSession } from "../road-to-summer/gateway/src/routes/session.ts";
import { saveCurrentPlan, saveCurrentSession } from "../road-to-summer/gateway/src/storage/currentSessionStore.ts";
import { replaceRelativeDateLabels } from "../road-to-summer/gateway/src/time/absoluteDateText.ts";

async function context() {
  return {
    stateRoot: await mkdtemp(path.join(tmpdir(), "rts-phone-dates-"))
  };
}

test("persisted plan date normalization preserves user-facing title while normalizing risk notes", async () => {
  const ctx = await context();
  const session = await handleStartSession(ctx, {
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  const plan = await saveCurrentPlan({
    title: "今天胸部训练",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore",
    duration: "40 分钟",
    goal: "胸部增肌",
    sections: [
      {
        name: "主训练",
        items: [
          {
            exercise: "哑铃卧推",
            role: "main",
            movement_pattern: "水平推",
            primary_muscles: ["胸"],
            selection_reason: "今天想练胸。",
            source_note: "明天继续检查肩前侧。",
            common_mistakes: [],
            adjustment_rule: "明天还有痛就停止。",
            sets: "3",
            reps: "8-10",
            intensity: "RPE 7",
            rest: "90 秒",
            cue: "肩胛稳定后再推。",
            substitutions: []
          }
        ]
      }
    ],
    risk_notes: ["明天（5月16日）肩前侧仍疼就停止上肢推。"],
    reasoning: "今天胸部训练是用户目标，不应被改写成日期前缀。"
  }, ctx.stateRoot);
  await saveCurrentSession({
    ...session,
    plan_card: plan,
    current_exercise: "哑铃卧推"
  }, ctx.stateRoot);

  const current = await handleGetCurrentSession(ctx);
  assert.equal(current.current_plan.title, "今天胸部训练");
  assert.equal(current.current_plan.sections[0].items[0].selection_reason, "今天想练胸。");
  assert.equal(current.current_plan.sections[0].items[0].source_note, "明天继续检查肩前侧。");
  assert.equal(current.current_plan.sections[0].items[0].adjustment_rule, "明天还有痛就停止。");
  assert.match(current.current_plan.risk_notes[0], /2026-05-16 肩前侧/);
});

test("bare month-day replacement ignores impossible dates", () => {
  const result = replaceRelativeDateLabels(
    "5月16日检查，13月45日不是合法日期。",
    "2026-05-15"
  );
  assert.equal(result, "2026-05-16 检查，13月45日不是合法日期。");
});

test("bare month-day replacement does not rewrite dates with explicit Chinese year", () => {
  const result = replaceRelativeDateLabels(
    "2025年5月16日记录要保留，5月17日可以归到当前年份。",
    "2026-05-15"
  );
  assert.equal(result, "2025年5月16日记录要保留，2026-05-17 可以归到当前年份。");
});
