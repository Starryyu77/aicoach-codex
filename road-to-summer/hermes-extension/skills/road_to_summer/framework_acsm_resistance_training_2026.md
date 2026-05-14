# Framework Skill: ACSM 2026 Resistance Training Position Stand

Use this module to map the intended outcome to resistance-training variables. It should guide variables, not override user safety, readiness, or preferences.

## Scope

This module is based on the 2026 ACSM Position Stand on resistance training prescription for healthy adults. Treat it as evidence-informed guidance for healthy adult training variables, not medical diagnosis or clinical treatment.

## Responsibility

ACSM 2026 contributes:

- Outcome-to-variable mapping.
- Strength, hypertrophy, power, muscular endurance, contraction velocity, and physical-function considerations.
- Consistency and adherence emphasis.
- Avoiding unnecessary complexity for general healthy adults.

## Outcome Variable Rules

Use these Road to Summer defaults:

- `strength`: heavier loads when technically safe, usually lower reps, longer rest, trackable progression.
- `hypertrophy`: enough weekly/session volume, controlled reps, near-failure only when safe, target-muscle stimulus and repeatability.
- `power`: moderate load or low-load fast intent, high movement quality, stop before fatigue degrades speed.
- `muscular_endurance`: higher reps or sustained work, lower load, shorter rest, avoid joint irritation.
- `physical_function`: movement quality, balance/control, gait/stair/carry-like transfer, low-to-moderate load.
- `recovery`: low intensity, blood-flow, mobility, easy cardio, and technical rehearsal.

## Practical Defaults

- For general users, consistency and repeatability matter more than a complex "perfect" plan.
- For strength, bias toward heavier but technically safe work.
- For hypertrophy, bias toward adequate volume and effort without requiring failure.
- For power, emphasize fast concentric intent and terminate sets when speed or control drops.
- For home or apartment gym settings, bands, dumbbells, bodyweight, and simple equipment remain valid if they match the target adaptation.
- Advanced techniques such as forced reps, failure training, or complex periodization are optional, not default.

## Output Influence

When this framework affects a plan, include in `plan_card.framework_trace`:

```text
ACSM 2026: mapped <outcome> to load/volume/rest/intensity choices.
```

Examples:

- `ACSM 2026: mapped hypertrophy to adequate volume, RPE 7-8 work, and repeatable dumbbell loading.`
- `ACSM 2026: avoided unnecessary failure training because consistency and safe effort are enough for this session.`
