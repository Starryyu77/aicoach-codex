# Framework Skill: NASM OPT Model

Use this module to decide the training phase and the stability-to-intensity progression logic. It should not directly choose every exercise by itself.

## Responsibility

NASM OPT contributes:

- Phase classification.
- Stability and movement-quality requirements.
- Progression/regression decisions.
- Whether a session should emphasize control, strength endurance, hypertrophy, maximal strength, or power.

## Phase Mapping

Use these Road to Summer phase labels:

- `stabilization_endurance`: movement control, balance, core control, low-to-moderate load, higher technical attention.
- `strength_endurance`: one stable strength movement plus controlled accessory or stability pairing.
- `muscle_development`: hypertrophy-oriented volume, trackable load, controlled proximity to failure.
- `max_strength`: heavy loading emphasis, lower reps, longer rest, only when readiness and technique support it.
- `power`: moderate load or bodyweight moved fast, never when movement quality is poor or pain risk is present.

## Decision Rules

- If the user is new, detrained, recovering, has unstable technique, or reports recurring movement issues, bias toward `stabilization_endurance` or `strength_endurance`.
- If the user wants增肌塑形 and readiness is green/yellow, use `muscle_development`.
- If the user asks for strength but recent logs show pain, poor sleep, or high fatigue, keep the strength goal but regress to `strength_endurance`.
- Do not use `max_strength` or `power` when readiness is orange/red, when pain is unresolved, or when the current movement pattern is not technically stable.

## Output Influence

When this framework affects a plan, include in `plan_card.framework_trace`:

```text
NASM OPT: selected <phase> because <reason>.
```

Examples:

- `NASM OPT: selected muscle_development because the target is chest hypertrophy and readiness is green.`
- `NASM OPT: regressed to stabilization_endurance because fatigue is high and recent lower-body soreness is unresolved.`
