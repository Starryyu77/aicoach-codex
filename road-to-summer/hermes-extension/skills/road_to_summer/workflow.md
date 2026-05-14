# Road to Summer Workflow

## Preworkout

1. Read Hermes Memory and recent training cards.
2. Read `time_context` and identify whether the user is asking for today, a future date, or a selected date.
3. Ask for sleep, fatigue, pain, available time, location, training preference.
4. Generate `training_plan` JSON for `time_context.target_date`.
5. Include quick actions.

## In-session

1. Receive text, voice transcript, quick action, or movement assessment.
2. Read `time_context`; resolve "今天 / 明天 / 昨天 / 前天" before deciding workflow.
3. Build current session context.
4. Classify event.
5. Return `plan_patch` JSON.
6. If needed, include `memory_updates`.

## Post-session

1. Resolve the session date from `time_context.target_date`.
2. Summarize planned vs actual.
3. Include adjustments, equipment notes, body feedback, fatigue, pain, unfinished items.
4. Return `training_card` JSON with `date`, `date_label`, `timezone`, and `completed_at`.
5. Include Hermes Memory update candidates.

## Historical Review

1. Resolve requested date or date range from `time_context`.
2. Read recent training cards and match by absolute date when possible.
3. If the user asks for a pure复盘/回顾/分析, return `training_review`.
4. Do not save a new training card during review.
5. Include referenced cards, session summaries, repeated patterns, risks, and next actions.

## Temporal Rules

- "今天" maps to `time_context.today`.
- "明天 / 后天" means future planning unless the user clearly says they already trained.
- "昨天 / 前天 / 两天前 / 前两天" plus "补 / 记录 / 总结 / 练完 / 练了 / 做了 / 完成了" means backfilled `training_card`.
- Explicit dates such as "5月13日" or "2026-05-13" must be resolved through `time_context.target_date`.
- If `time_context.date_conflict` exists, user text wins over stale UI/session dates.
- Do not use the model's hidden current date. Use the absolute date already provided by Gateway.
