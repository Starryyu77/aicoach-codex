# Road to Summer Workflow

## Preworkout

1. Read Hermes Memory and recent training cards.
2. Ask for sleep, fatigue, pain, available time, location, training preference.
3. Generate `training_plan` JSON.
4. Include quick actions.

## In-session

1. Receive text, voice transcript, quick action, or movement assessment.
2. Build current session context.
3. Classify event.
4. Return `plan_patch` JSON.
5. If needed, include `memory_updates`.

## Post-session

1. Summarize planned vs actual.
2. Include adjustments, equipment notes, body feedback, fatigue, pain, unfinished items.
3. Return `training_card` JSON.
4. Include Hermes Memory update candidates.

