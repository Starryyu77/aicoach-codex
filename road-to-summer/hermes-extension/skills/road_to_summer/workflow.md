# Road to Summer Workflow

## Preworkout

1. Read Hermes Memory and recent training cards.
2. Read `time_context` and identify whether the user is asking for today, a future date, or a selected date.
3. Build a recent-training summary from the last 1-3 cards:
   - date
   - theme
   - trained muscle groups
   - fatigue / soreness / pain
   - unfinished items
   - next-session suggestions
4. Run conflict checks:
   - avoid repeating high-volume shoulder/back/chest within 48-72 hours
   - avoid high-intensity lower body the day after high-intensity lower training
   - avoid duplicate exercises and excessive same-pattern pulling/pushing
5. Run the five-framework integration from `framework_integration.md`:
   - ACE IFT checks user context, confidence, preference, and adherence constraints
   - NASM OPT chooses phase or regression/progression level
   - NSCA Program Design chooses session structure, order, recovery window, and total load
   - ACSM 2026 maps the target outcome to training variables
   - RPE/RIR Autoregulation sets adjustment rules
6. Run the exercise-selection chain from `exercise_selection.md`:
   - goal
   - target adaptation
   - movement pattern
   - target muscle bias
   - candidate exercise pool
   - individual constraints
   - exercise role
   - training variables
7. Ask for sleep, fatigue, pain, available time, location, training preference when missing.
8. Generate `training_plan` JSON for `time_context.target_date`.
9. Include quick actions.
10. Include `reasoning`, `decision_basis`, `framework_trace`, `official_source_trace`, `recent_training_summary`, and `quality_warnings` when useful.
11. Write the user-facing source explanation in Chinese inside `chat_message` and each exercise `source_note`; do not rely on a separate "official sources" display block for the user.
11. For every structured exercise item, include role, movement pattern, target muscles, selection reason, common mistakes, adjustment rule, cue, substitutions, sets, reps, intensity, and rest when possible.

## In-session

1. Receive text, voice transcript, quick action, or movement assessment.
2. Read `time_context`; resolve "今天 / 明天 / 昨天 / 前天" before deciding workflow.
3. Build current session context.
4. Classify event.
5. Adjust in priority order from `framework_autoregulation.md`: technique/cue, load, reps, rest, sets, exercise substitution, session type, session end.
6. Return `plan_patch` JSON.
7. If needed, include `memory_updates`.

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

## Product / Competitor Discussion

If the user asks about competitors or says the product does not understand competitors:

1. Keep the answer scoped to the Road to Summer Agent/Skill.
2. Compare only the workflow capability:
   - training memory
   - plan generation
   - in-session adjustment
   - structured training card
   - voice/video input adapter
3. Do not drift into market analysis, SaaS backend, coach workbench, CRM, payment, membership, or scheduling.
4. If the user is asking during a training session, return a concise training note or plan correction; do not replace training guidance with product strategy.
