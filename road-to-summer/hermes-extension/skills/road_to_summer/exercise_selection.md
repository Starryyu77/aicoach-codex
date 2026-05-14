# Exercise Selection and Plan Assembly

This file defines how Road to Summer chooses exercises. It prevents the agent from generating a random list of common gym movements.

## Core Decision Chain

For every `training_plan`, follow this chain:

```text
training goal
-> target adaptation
-> movement pattern
-> target muscle bias
-> candidate exercise pool
-> individual constraints
-> exercise role
-> training variables
-> in-session adjustment rule
-> post-session learning
```

The agent must first decide what adaptation the session should create, then choose the safest and most effective movement pattern and exercise for that adaptation.

## Required Inputs

Before choosing exercises, combine:

- Long-term goal: hypertrophy, body recomposition, strength, cardio, movement quality, recovery.
- Current phase: movement control, base strength, hypertrophy, strength, functional maintenance, recovery.
- Target date from `time_context`.
- Recent 3-5 training cards: muscles, movements, intensity, fatigue, pain, unfinished items.
- Current status: sleep, fatigue, soreness, pain, energy, available time.
- Location and equipment availability.
- User preferences and disliked movements.
- Known movement skill notes and risk memory.

If critical information is missing, ask only the smallest number of follow-up questions needed. If enough context exists, generate a plan.

## Exercise Roles

Each exercise must have one role:

- `warmup`: prepares joints, movement pattern, target muscle sensation, and risk areas.
- `main`: directly serves the day's main adaptation and should be trackable.
- `secondary`: fills a missing angle, range, or related muscle group after the main exercise.
- `accessory`: adds target-muscle volume, weak-point work, or lower-risk local stimulus.
- `functional_core`: trains control, anti-extension, anti-rotation, anti-lateral-flexion, single-side control, shoulder/scapular or hip stability.
- `cardio`: supports conditioning or recovery without automatically becoming HIIT.
- `cooldown`: low-intensity mobility, breathing, and recovery.

Do not stack exercises without roles. A plan is not complete until each exercise has a reason for being there.

## Scoring Dimensions

When there are multiple candidates, compare them by:

- Target match.
- Target muscle stimulus.
- Progressive overload potential.
- Technical controllability today.
- Joint friendliness.
- Stimulus-to-fatigue ratio.
- Equipment and location availability.
- Time efficiency.
- Tracking quality: load, reps, RPE/RIR can be recorded.
- User acceptance.

For hypertrophy, prioritize target muscle stimulus, stimulus-to-fatigue ratio, progressive overload, joint friendliness, technical control, and equipment availability.

For strength, prioritize specificity, heavy-load potential, stable technique, tracking quality, and recovery cost.

For functional maintenance, prioritize controllability, transfer, joint friendliness, asymmetry detection, and low excessive fatigue.

## Movement Pattern Mapping

- Chest: horizontal push, incline push, shoulder horizontal adduction, closed-chain push.
- Back width: vertical pull, shoulder extension/adduction.
- Back thickness: horizontal pull, scapular retraction.
- Shoulder: vertical push, shoulder abduction, horizontal abduction, scapular control.
- Quads: knee-dominant squat / press.
- Glutes and hamstrings: hip hinge / hip extension.
- Glute medius and hip stability: hip abduction and single-leg stability.
- Core: anti-extension, anti-rotation, anti-lateral-flexion, dynamic trunk control.
- Cardio: steady state, intervals, mixed conditioning, or recovery walking.

## Plan Quantity and Order

Keep the plan compact enough to execute:

- 30 minutes: warmup + 1 main + 1 secondary or accessory + 1 core/recovery.
- 45 minutes: warmup + 1 main + 1-2 secondary/accessory + 1 functional core/cardio.
- 60 minutes: warmup + 1 main + 2-3 secondary/accessory + 1 functional core/cardio + cooldown.

Default order:

1. Risk-aware warmup.
2. Main exercise.
3. Secondary exercise.
4. Accessory work.
5. Functional core.
6. Low-intensity cardio or cooldown when useful.

## Required PlanItem Fields

Every structured exercise item should include:

```json
{
  "exercise": "",
  "role": "main",
  "movement_pattern": "",
  "primary_muscles": [],
  "sets": "",
  "reps": "",
  "intensity": "",
  "rest": "",
  "cue": "",
  "selection_reason": "",
  "common_mistakes": [],
  "adjustment_rule": "",
  "substitutions": []
}
```

`selection_reason` must answer why this exercise is better than obvious alternatives for this session.

`adjustment_rule` must explain when to add load, reduce load, reduce sets, extend rest, replace the exercise, or stop the exercise.

## Substitution Logic

When equipment is unavailable:

1. Keep the session goal unchanged when safe.
2. Keep the movement pattern when possible.
3. Keep target muscle bias.
4. Choose the available option with the best stimulus-to-fatigue ratio.
5. Explain the tradeoff.

Example:

```text
High pulldown unavailable -> keep back-width goal -> vertical pull substitute if available; otherwise use chest-supported dumbbell row and note that it shifts from vertical pull to horizontal pull while preserving back stimulus.
```

## Forbidden Patterns

- Do not output a random list of popular exercises.
- Do not ignore recent training recovery.
- Do not repeat the same exercise in warmup and work sets unless the warmup is explicitly a ramp-up for the same main lift.
- Do not stack too many same-pattern pulls or pushes without a clear specialization reason.
- Do not choose a high-risk movement when a lower-risk candidate can produce the same target adaptation.
- Do not say only "lat activation" or "scapular depression"; translate the cue into ordinary body language.
