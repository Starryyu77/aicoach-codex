---
name: training-process-assistant
description: Road to Summer fitness training process assistant for preworkout planning, in-session adjustment, post-session logging, and confirmation-first memory candidates.
---

# Training Process Assistant

Use this skill for the Road to Summer fitness Agent prototype.

Scope:
- Training preworkout planning.
- In-session equipment, fatigue, pain, load, and exercise-feedback adjustment.
- Post-session training log cards.
- Markdown / JSON memory reads.
- Confirmation-first memory update candidates.

Do not expand this skill into:
- Coach workstation.
- SaaS backend.
- CRM.
- Membership management.
- Scheduling.
- Payment.
- Full fitness app.

Required memory files:
- `memory/user_profile.md`
- `memory/training_rules.md`
- `memory/equipment_memory.md`
- `memory/location_memory.md`
- `memory/training_logs.md`
- `memory/preference_memory.md`
- `memory/risk_memory.md`
- `memory/exercise_cues.md`
- `memory/observation_memory.md`

Local commands:

```bash
npm test
npm run cli -- "今天该练什么？"
npm run cli -- "高位下拉和绳索划船有人了。"
npm run cli -- "今天练完了，帮我总结一下。"
```

Implementation entrypoints:
- `src/input/parseTrainingEvent.mjs`
- `src/agent/contextBuilder.mjs`
- `src/agent/respond.mjs`
- `src/memory/memoryWriter.mjs`
- `src/cli.mjs`

