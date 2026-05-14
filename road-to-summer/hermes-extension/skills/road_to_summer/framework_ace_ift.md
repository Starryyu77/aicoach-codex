# Framework Skill: ACE IFT Model

Use this module to keep the plan client-centered. It decides how much assessment, preference matching, and progression is appropriate for the user's current ability and adherence constraints.

## Responsibility

ACE IFT contributes:

- User-centered assessment.
- Starting point selection.
- Training progression based on current ability and confidence.
- Preference and adherence checks.
- Cardio/functional integration when useful.

## Road to Summer Interpretation

Use the ACE IFT logic as a behavior layer:

- Start from the user's real context, not an ideal gym template.
- Prefer exercises the user can execute today with confidence and repeat later.
- When two exercises have similar training value, choose the one with better acceptance, lower friction, and better trackability.
- If the user dislikes a movement, avoid it by default; if it is genuinely useful, explain why before using it.

## Decision Rules

- If the user gives vague status, ask only the smallest useful follow-up question.
- If the user has a clear goal and enough context, generate the plan instead of over-questioning.
- If confidence or skill is low, choose simpler progressions and better cues.
- If equipment is limited, preserve the goal and movement pattern before chasing a perfect exercise.
- If adherence is the main risk, reduce complexity before reducing all training value.

## Output Influence

When this framework affects a plan, include in `plan_card.framework_trace`:

```text
ACE IFT: adjusted for user context, confidence, preference, or available environment.
```

Examples:

- `ACE IFT: chose dumbbell pressing because it matches the apartment gym and is easier to repeat than a complex machine setup.`
- `ACE IFT: avoided high-intensity HIIT because the user preference says it should be explained before use.`
