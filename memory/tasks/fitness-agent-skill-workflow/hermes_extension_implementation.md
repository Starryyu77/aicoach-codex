# Hermes Extension Implementation

Updated: 2026-05-13

## Current State

The project now includes a `road-to-summer/` implementation layer for the Hermes-based direction.

This layer keeps Hermes as the intended runtime owner for Agent Runtime, Memory, Sessions, Skills, Tools, model calls, and long-term learning. Road to Summer adds the fitness Skill Pack, UI Gateway, Training Cockpit frontend shell, ASR mock, Vision/Pose mock, structured output contract, and training card cache.

## Added Structure

```text
road-to-summer/
  hermes-extension/skills/road_to_summer/
  gateway/
  frontend/
  tools/pose-tool/
  docs/
```

## Real Implementation

- Hermes Skill Pack files:
  - `SOUL.md`
  - `SKILL.md`
  - `training_rules.md`
  - `output_contract.md`
  - `exercise_cues.md`
  - `memory_policy.md`
  - `risk_policy.md`
  - `workflow.md`
- Gateway:
  - `HermesClient` abstraction.
  - `MockHermesClient`.
  - Hermes message builder.
  - JSON parser / validator.
  - UI mapper.
  - ASR mock.
  - Vision/Pose mock.
  - Native HTTP server.
  - Route handlers for chat, voice, vision, session, history, memory.
  - Lightweight file stores only.
- Frontend:
  - Training Cockpit.
  - Current plan card.
  - Current exercise card.
  - Chat panel.
  - Voice and camera buttons.
  - Quick actions.
  - History list.
  - Memory panel.

## Mocked Pieces

- Real Hermes runtime call.
- Real Hermes Memory / Sessions.
- ASR provider.
- Vision/Pose provider.
- Frontend deployment/runtime dependencies.

## Verification

```text
npm test -> 26 passed, 0 failed
```

New gateway tests cover:

1. Preworkout `training_plan`.
2. Equipment occupied `plan_patch`.
3. Equipment broken memory update.
4. Equipment repaired memory confirmation.
5. Fatigue feedback without immediate stop.
6. Target-muscle cue update.
7. Vision assessment -> movement correction patch.
8. Session end -> saved training card and history listing.
9. Voice mock transcription.

## Next Step

Replace `MockHermesClient` with a real Hermes API implementation while preserving:

- `buildHermesMessage.ts`
- `parseHermesResponse.ts`
- `validateAgentOutput.ts`
- `mapAgentOutputToUi.ts`
- `output_contract.md`

