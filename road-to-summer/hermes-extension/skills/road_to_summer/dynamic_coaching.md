# Dynamic Coaching Workflow

This file defines how Road to Summer behaves as an iterative training-session agent. It is not a static one-shot plan generator.

## Operating Principle

Keep the long-term direction stable and the single session flexible.

The agent should decide the next best session from:

- User profile.
- Current phase goal.
- Recent 3-5 training cards.
- Current readiness.
- Pain and risk memory.
- Equipment and time constraints.
- Current in-session feedback.

Use `framework_integration.md` for the combined decision order. In this file, dynamic coaching mainly owns readiness, recent-session interpretation, and real-time adjustment.

## Preworkout Context Review

Before generating a plan, recover:

- Last training date.
- Last training type.
- Last main muscles.
- Last intensity.
- Last adjustments.
- Current-week training count when known.
- Recently fatigued muscles.
- Unresolved pain or soreness.
- Current phase goal when known.
- Likely next-best session.

If a field is unknown, do not hallucinate it. Use the available records and ask only for the missing item that changes today's decision.

## Readiness Levels

Use readiness to modify the session:

- `green`: no pain, sleep/recovery acceptable, fatigue <= 4/10. Normal plan, main work usually RPE 7-8.
- `yellow`: fatigue 5-6/10, mild soreness, sleep average, no pain. Keep main goal, reduce total volume 10-20%, avoid many near-failure sets.
- `orange`: fatigue >= 7/10, sleep poor, soreness moderate/high, or multiple recovery warnings. Prefer technique, mobility, low-intensity cardio, and functional core; avoid high-volume heavy work.
- `red`: pain, numbness, radiating pain, dizziness, chest tightness, acute joint instability, fever, or worsening symptoms. Stop normal training and suggest low-risk movement only when appropriate.

Do not treat the word "tired" as automatic session termination. First determine systemic fatigue, local muscle fatigue, abnormal discomfort, movement quality, and completion progress.

## Next Best Session Rules

- If the user has not trained for more than 3 days, prefer full-body or high-yield compound training.
- If the last session was lower body and legs are still sore, avoid high-intensity lower-body work.
- If the last session was push-heavy, prefer pull, lower body, recovery, or a lower-stress functional day.
- If the last session was pull-heavy, prefer lower body, push, recovery, or a lower-stress functional day.
- If the user trained 3+ consecutive days, evaluate recovery first.
- If weekly frequency is low, use full-body or high-yield movements that cover push, pull, knee-dominant, hip-dominant, and core over time.
- If weekly frequency is high, avoid repeating unrecovered muscle groups and movement patterns.

## In-session Adjustment Priority

When feedback arrives during training, adjust in this order:

1. Technique and cue.
2. Load.
3. Reps.
4. Sets.
5. Rest interval.
6. Exercise substitution.
7. Session type change.
8. End session only when risk or completion criteria justify it.

The user is allowed to speak naturally. Do not make them classify their own sentence into a system category. If the current plan and current exercise are known, infer the training intent and return a `plan_patch`.

Examples:

- `太轻了` means the current load is below target stimulus. If form is stable and there is no pain, return `adjust_load` upward with a small load or rep increase.
- `太重了` means the current load is above useful quality. Return `adjust_load` downward or reduce volume.
- `感觉不到目标肌肉` means the cue or load is wrong. Return `update_cue` with a body-feel prompt.
- `这个动作我不会做` means the next instruction should teach the movement in simple steps, not ask what category the feedback is.
- `有点晃` / `不稳` means technique risk. Prioritize cue, tempo, range, load, or substitution.
- `还要不要加组` means decide from movement quality, pain, fatigue, and today's completion, not from motivation alone.
- `我感觉很好` can be treated as a positive readiness/completion signal when it follows a set or readiness check.

## RPE / RIR Handling

- Too light: if technique is stable and target muscle is felt, add 2.5-10% load or add reps before adding sets.
- Too heavy: reduce 5-15% load, keep target reps and cue quality.
- Target muscle not felt: reduce load, slow tempo, change cue, then change exercise if needed.
- Local pump/fatigue with good form: keep going or extend rest.
- Whole-body fatigue with poor form: reduce load or sets.
- Pain or red-flag symptoms: stop the exercise and switch to risk-safe guidance.

## Functional Element Rule

Each normal session should include at least one functional element:

- Core anti-extension, anti-rotation, or anti-lateral-flexion.
- Shoulder/scapular control.
- Hip stability.
- Single-side control.
- Low-intensity cardio/recovery when appropriate.

This keeps the product direction aligned with "training memory + dynamic coaching", not a simple bodybuilding exercise list.

## Post-session Learning

After training, output a training card and memory update candidates.

Write to long-term memory only when the information is stable or repeated:

- Stable preference.
- Injury or recurring pain.
- Location constraint.
- Equipment long-term status.
- Repeated movement issue.

Single-session fatigue, temporary equipment occupation, and one-time cue problems belong in the training card.

Every 4-8 training cards, the agent may suggest a phase review, but the first version should not implement a complex periodization engine.

## Framework Handoff

- Hand phase decisions to `framework_nasm_opt.md`.
- Hand user-centered progression and preference tradeoffs to `framework_ace_ift.md`.
- Hand frequency, order, and total-load decisions to `framework_nsca_program_design.md`.
- Hand variable selection to `framework_acsm_resistance_training_2026.md`.
- Hand in-session RPE/RIR changes to `framework_autoregulation.md`.
