# Fitness Agent Local Prototype Implementation

Updated: 2026-05-13

## Current State

The project now contains a local Codex-friendly Agent prototype for the Road to Summer fitness workflow. The implementation is intentionally small and dependency-free so it can run locally inside this workspace.

## Files Added

- `package.json`
- `README.md`
- `prompts/system_prompt.md`
- `workflows/preworkout.md`
- `workflows/in_session.md`
- `workflows/post_session.md`
- `schemas/*.schema.json`
- `memory/*.md`
- `runtime/*.json*`
- `src/input/*.mjs`
- `src/memory/*.mjs`
- `src/agent/*.mjs`
- `src/asr/asrStub.mjs`
- `src/cli.mjs`
- `tests/*.test.mjs`
- `skills/training-process-assistant/SKILL.md`

## Run Commands

```bash
npm test
npm run cli -- "今天该练什么？"
npm run cli -- "高位下拉和绳索划船有人了。"
npm run cli -- "我感觉不到背阔肌发力。"
```

## Verification

`npm test` passes 17 tests covering:

- Transcript cleaning and terminology normalization.
- Event classification.
- Memory Writer target selection.
- The seven acceptance scenarios from the meeting notes.

Latest verification in this workspace:

```text
npm test -> 17 passed, 0 failed
npm run cli -- "高位下拉和绳索划船有人了。" -> equipment_occupied event, chest-supported dumbbell row and one-arm dumbbell row replacements
```

## Next Implementation Step

Wire a model adapter after `src/agent/respond.mjs` so deterministic routing and memory context stay stable, while model-generated plan wording can be validated against the existing schemas.
