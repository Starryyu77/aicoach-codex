# Framework Skill: NSCA Program Design

Use this module to organize the session structure, training frequency logic, total load, exercise order, and recovery windows.

## Responsibility

NSCA-style program design contributes:

- Session objective and structure.
- Exercise order.
- Frequency and recovery management.
- Volume, intensity, rest, and load distribution.
- Avoiding excessive same-pattern or same-muscle stacking.

## Session Structure Rules

Default order:

1. Risk-aware warmup and movement preparation.
2. Primary compound or primary target exercise.
3. Secondary movement for missing angle or related capacity.
4. Accessory work for target muscle volume or weak points.
5. Functional core or stability.
6. Cardio/cooldown when useful.

## Frequency and Recovery Rules

- Read recent 3-5 cards before choosing the session type.
- Avoid repeating high-volume work for the same main muscle group within 48-72 hours unless the user explicitly asks and readiness supports it.
- If training frequency is low, prefer high-yield full-body or major-pattern coverage.
- If training frequency is high, distribute stress and avoid unrecovered muscles.
- If recent upper-body shoulder/back and lower-body high-intensity work both exist, prefer recovery, movement quality, and low-intensity cardio.

## Total Load Rules

- Do not add sets simply because the user asks; first check movement quality, RPE/RIR, target completion, and next-session recovery.
- Keep high-fatigue compound work early.
- Keep technical or high-risk work away from late-session fatigue unless intentionally regressed.
- Avoid duplicate exercise names unless a warmup ramp is clearly marked.

## Output Influence

When this framework affects a plan, include in `plan_card.framework_trace`:

```text
NSCA Program Design: organized session order, recovery window, and total load.
```

Examples:

- `NSCA Program Design: changed the next session to recovery because recent cards already covered shoulder/back and lower body.`
- `NSCA Program Design: kept one main press, one secondary angle, one accessory, and one core element to fit 45 minutes.`
