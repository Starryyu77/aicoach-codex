---
name: road_to_summer
description: Fitness training skill pack for Hermes. Handles preworkout planning, in-session adjustment, post-session training cards, and memory update candidates.
---

# Road to Summer Skill

## Scope

This skill supports a single user's training-session workflow:

1. Preworkout plan generation.
2. In-session dynamic adjustment.
3. Post-session summary and memory update candidates.
4. Historical training review.

It must return UI-consumable JSON defined in `output_contract.md`.

## Workflow 1: Preworkout Plan

Inputs:

- User training goal.
- Current status: sleep, fatigue, pain, available time, location.
- `time_context`: timezone, current date, target training date, date label, and temporal intent.
- Recent training cards.
- Hermes Memory summary: preferences, risks, equipment, locations.

Output:

- `type = training_plan`
- `plan_card`
- `quick_actions`

Date rule:

- If `time_context.temporal_intent` is `future_planning`, generate the plan for `time_context.target_date`.
- Include `plan_card.target_date`, `plan_card.date_label`, and `plan_card.timezone`.
- Do not assume "tomorrow" from the server clock; use `time_context`.
- If the user text explicitly mentions a date, that date wins over the UI selected date.

## Workflow 2: In-session Adjustment

Inputs:

- User text / voice / quick action.
- `time_context`, especially when feedback references yesterday, tomorrow, or a backfilled session.
- Current plan and current exercise.
- Current set and training phase.
- Equipment, fatigue, pain, video / pose feedback.

Output:

- `type = plan_patch`
- Patch operation: `replace_exercise`, `adjust_load`, `reduce_sets`, `add_set`, `extend_rest`, `end_session`, or `update_cue`.

## Workflow 3: Post-session Summary

Inputs:

- Planned session.
- Actual completed actions.
- In-session adjustments.
- Body feedback.
- Equipment notes.
- `time_context` for the session date.

Output:

- `type = training_card`
- `training_card`
- `memory_updates`

Date rule:

- Set `training_card.date` to `time_context.target_date`.
- Use `training_card.date_label` to keep labels such as "前天" or "明天" visible.
- If the user is backfilling a past workout, summarize it as a past training card, not as today's workout.

## Workflow 4: Historical Training Review

Inputs:

- `time_context`, especially target date or recent-series scope.
- Recent training cards.
- Hermes Memory summary.
- User question: single-day review, multi-day review, or recent series review.

Output:

- `type = training_review`
- `review_card`
- `quick_actions`

Rules:

- Do not create a new training card for pure review.
- Reference existing training card ids or dates.
- If the requested date has no matching card, say what is missing and ask whether to补录.
- For a series review, summarize patterns across sessions: training coverage, fatigue/risk signals, repeated equipment issues, unfinished items, and next-session implications.

## Time Classification Examples

- `明天该练什么？` -> `future_planning` -> return `training_plan`.
- `5月13日我练了下肢，帮我记录一下。` -> `backfill_training_log` -> return `training_card` with date `2026-05-13`.
- `前天练完了，帮我补一张训练卡。` -> `backfill_training_log` -> return `training_card`.
- `复盘一下5月13日的训练。` -> `training_review`, not `training_card`.
- `复盘前几天这一系列训练。` -> `training_review`.
- `今天卧推凳没有了。` -> `in_session_adjustment` -> return `plan_patch`.
- If the frontend selected date says `2026-05-11` but the user says `5月13日`, follow `time_context.target_date = 2026-05-13`.
