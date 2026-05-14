import assert from "node:assert/strict";
import test from "node:test";
import { buildTimeContext } from "../road-to-summer/gateway/src/time/timeContext.ts";

const now = new Date("2026-05-14T04:00:00.000Z");

test("time context resolves tomorrow in configured timezone", () => {
  const context = buildTimeContext({
    rawText: "明天该练什么？",
    timezone: "Asia/Singapore",
    now
  });
  assert.equal(context.today, "2026-05-14");
  assert.equal(context.target_date, "2026-05-15");
  assert.equal(context.target_date_label, "明天");
  assert.equal(context.temporal_intent, "future_planning");
});

test("time context resolves backfilled day before yesterday logs", () => {
  const context = buildTimeContext({
    rawText: "前天练完了，帮我补一张训练记录。",
    timezone: "Asia/Singapore",
    now
  });
  assert.equal(context.target_date, "2026-05-12");
  assert.equal(context.target_date_label, "前天");
  assert.equal(context.temporal_intent, "backfill_training_log");
});

test("time context accepts selected date when text has no date term", () => {
  const context = buildTimeContext({
    rawText: "生成训练计划",
    timezone: "Asia/Singapore",
    targetDate: "2026-05-18",
    now
  });
  assert.equal(context.target_date, "2026-05-18");
  assert.equal(context.target_date_label, "4 天后");
  assert.equal(context.temporal_intent, "selected_date");
  assert.equal(context.date_source, "selected_date");
});

test("time context classifies explicit past completed training as backfill", () => {
  const context = buildTimeContext({
    rawText: "5月13日我练了下肢，帮我记录一下。",
    timezone: "Asia/Singapore",
    now
  });
  assert.equal(context.target_date, "2026-05-13");
  assert.equal(context.target_date_label, "昨天");
  assert.equal(context.date_source, "explicit_text");
  assert.equal(context.temporal_intent, "backfill_training_log");
});

test("explicit text date wins over stale selected date", () => {
  const context = buildTimeContext({
    rawText: "5月13日训练结束，帮我总结一下。",
    timezone: "Asia/Singapore",
    targetDate: "2026-05-11",
    now
  });
  assert.equal(context.target_date, "2026-05-13");
  assert.equal(context.date_source, "explicit_text");
  assert.equal(context.date_conflict?.selected_date, "2026-05-11");
  assert.equal(context.date_conflict?.resolution, "explicit_text_wins");
});
