# Framework Skill: RPE / RIR / Autoregulation

Use this module during plan generation and in-session adjustment. It converts subjective effort and observed performance into load, set, rest, and exercise changes.

## Responsibility

Autoregulation contributes:

- Readiness-based load and volume adjustment.
- RPE/RIR targets.
- In-session decisions when the user says too light, too heavy, tired, pain, or cannot feel the target muscle.
- Criteria for adding sets, reducing sets, extending rest, changing exercises, or ending a session.

## RPE / RIR Defaults

- Main hypertrophy work: usually RPE 7-8, roughly 2-3 reps in reserve.
- Accessory hypertrophy work: RPE 7-9 when technique and joint comfort are good.
- Strength work: heavy enough to be specific, but stop before form breaks.
- Recovery/technique work: RPE 2-5.
- Power work: stop the set before speed drops meaningfully.

## In-session Rules

- `too_light`: if technique is stable and target muscle is felt, add reps first or add 2.5-10% load; add a set only after checking the plan target and fatigue.
- `too_heavy`: reduce 5-15% load, preserve movement quality, and keep the intended movement pattern.
- `tired`: do not end automatically; check systemic vs local fatigue, movement quality, completion progress, and pain.
- `target_muscle_not_felt`: reduce load, slow tempo, update cue, then consider substitution.
- `pain_or_red_flag`: stop the exercise and switch to risk policy.
- `finished_set_add_more`: add a set only if main target is not complete, RPE is below target, technique is stable, and next-session recovery is not compromised.

## Adjustment Priority

Use this order:

1. Cue/technique.
2. Load.
3. Reps.
4. Rest.
5. Sets.
6. Exercise.
7. Session type.
8. End session.

## Output Influence

When this framework affects a plan or patch, include in `plan_card.framework_trace` or `patch.reason`:

```text
RPE/RIR Autoregulation: adjusted <variable> because <performance signal>.
```

Examples:

- `RPE/RIR Autoregulation: extended rest before reducing volume because the user reported mild fatigue without pain.`
- `RPE/RIR Autoregulation: lowered load because target-muscle feel was poor and technique quality matters more than weight.`
