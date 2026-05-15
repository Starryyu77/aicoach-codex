import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { handleGetCurrentSession, handleResetSession, handleStartSession } from "../road-to-summer/gateway/src/routes/session.ts";
import { saveCurrentPlan } from "../road-to-summer/gateway/src/storage/currentSessionStore.ts";

async function context() {
  return {
    stateRoot: await mkdtemp(path.join(tmpdir(), "rts-session-reset-"))
  };
}

test("session reset clears the persisted current plan so refresh stays on a new conversation", async () => {
  const ctx = await context();
  await handleStartSession(ctx, {
    location: "公寓健身房",
    target_date: "2026-05-14",
    timezone: "Asia/Singapore"
  });
  await saveCurrentPlan({
    title: "旧训练计划",
    target_date: "2026-05-14",
    date_label: "昨天",
    timezone: "Asia/Singapore",
    duration: "40 分钟",
    goal: "旧计划",
    sections: [
      {
        name: "主训练",
        items: [
          {
            exercise: "下肢恢复状态快速检查",
            sets: "1",
            reps: "5",
            intensity: "轻",
            rest: "30 秒",
            cue: "只确认状态",
            substitutions: []
          }
        ]
      }
    ],
    risk_notes: [],
    reasoning: "测试旧计划。"
  }, ctx.stateRoot);

  const before = await handleGetCurrentSession(ctx);
  assert.equal(before.current_plan.title, "旧训练计划");

  const reset = await handleResetSession(ctx, {
    location: "公寓健身房",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  assert.equal(reset.target_date, "2026-05-15");
  assert.equal(reset.current_plan, null);

  const afterRefresh = await handleGetCurrentSession(ctx);
  assert.equal(afterRefresh.target_date, "2026-05-15");
  assert.equal(afterRefresh.current_plan, null);
});
