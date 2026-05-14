# Framework Integration

This file defines how the five framework skills work together. They are complementary modules, not competing prompts.

## Ownership Map

```text
NASM OPT
  -> phase and progression/regression

ACE IFT
  -> user-centered starting point, confidence, preference, adherence

NSCA Program Design
  -> session structure, exercise order, frequency, recovery, total load

ACSM 2026 Resistance Training
  -> outcome-to-variable mapping for strength, hypertrophy, power, endurance, and function

RPE/RIR Autoregulation
  -> real-time load, reps, sets, rest, and substitution decisions
```

## Integrated Decision Order

For `training_plan`, run this order:

1. Time/context classification from `time_context`.
2. Recent training and risk review.
3. ACE IFT: decide whether there is enough user context or a minimal follow-up is needed.
4. NASM OPT: choose phase or regression/progression level.
5. NSCA Program Design: choose session type, order, recovery window, and total load.
6. ACSM 2026: map outcome to sets, reps, load/RPE, rest, and intent.
7. Exercise Selection: choose movement patterns, candidate exercises, and roles.
8. RPE/RIR Autoregulation: set adjustment rules for each exercise.
9. Output contract: return strict JSON.

For `plan_patch`, run this order:

1. Classify event: equipment, fatigue, pain, target-muscle feedback, load mismatch, completion, time constraint.
2. Risk policy first.
3. RPE/RIR Autoregulation for load/reps/rest/sets.
4. Exercise Selection for substitutions.
5. NSCA Program Design for session-level changes.
6. ACE IFT for preference/adherence tradeoffs.
7. Return strict `plan_patch`.

## Conflict Resolution

- Safety/risk beats all other frameworks.
- User context and available equipment beat ideal textbook exercise selection.
- Recent-session recovery beats a desired muscle target unless the user explicitly confirms and readiness supports it.
- ACSM variable targets are adapted through RPE/RIR; they are not rigid prescriptions.
- NASM phase progression cannot skip movement control when technique or pain risk is unresolved.
- NSCA total-load management prevents over-stacking movements even when multiple frameworks suggest useful exercises.

## Required Trace

For every `training_plan`, include `plan_card.framework_trace` with 3-5 concise entries. Do not write a long textbook explanation. Mention only the frameworks that materially changed the decision.

Example:

```json
[
  "ACE IFT: used apartment gym and user preference to keep the plan simple and repeatable.",
  "NASM OPT: selected muscle_development because the goal is hypertrophy and readiness is green.",
  "NSCA Program Design: avoided repeating shoulder/back because recent cards showed high upper-body load.",
  "ACSM 2026: mapped hypertrophy to adequate volume, repeatable load, and RPE 7-8.",
  "RPE/RIR Autoregulation: each exercise includes a next-set adjustment rule."
]
```

Also include `plan_card.official_source_trace` from `official_sources.md`. This is the user-visible evidence layer:

- `framework_trace` says what the agent decided.
- `official_source_trace` says which official model/source supports that kind of decision, where it comes from, and why it applies here.

Update for the Training Cockpit UX:

- Treat `official_source_trace` as audit data, not the primary visible explanation.
- Put the practical coaching explanation into `chat_message` and each exercise item's `source_note`.
- Write source explanations in Chinese. A coach should say "这里参考 NSCA 的总负荷管理原则，所以今天不继续堆肩背", not present an English citation table.

Never copy long official text. Link the source and summarize the principle in your own words.
