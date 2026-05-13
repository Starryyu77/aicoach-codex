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

It must return UI-consumable JSON defined in `output_contract.md`.

## Workflow 1: Preworkout Plan

Inputs:

- User training goal.
- Current status: sleep, fatigue, pain, available time, location.
- Recent training cards.
- Hermes Memory summary: preferences, risks, equipment, locations.

Output:

- `type = training_plan`
- `plan_card`
- `quick_actions`

## Workflow 2: In-session Adjustment

Inputs:

- User text / voice / quick action.
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

Output:

- `type = training_card`
- `training_card`
- `memory_updates`

