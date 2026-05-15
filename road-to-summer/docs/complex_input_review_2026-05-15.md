# Complex Input Review - 2026-05-15

This review checks whether Road to Summer / Hermes Fitness Agent Extension can handle natural, compound training inputs without falling back to generic taxonomy prompts or stale UI state.

## Scope

Focus areas:

- In-session compound feedback.
- Risk signal vs load progression conflicts.
- Equipment constraints mixed with target-muscle feedback.
- Past-session backfill mixed with future planning.
- Preference contradiction and replacement memory candidates.
- Current-set advancement driven by Hermes `session_update`.

This is not a live MiniMax/Hermes quality evaluation. These are Gateway contract and test-double checks that make the expected behavior executable.

## Added Automated Cases

File:

```text
tests/complexInputReview.test.mjs
```

### Case 1: Risk Signal Overrides Load Progression

Input:

```text
这个重量太轻了，但肩前侧有点顶，能不能加一点？
```

Expected:

- Return `plan_patch`.
- Do not simply increase load.
- Mention shoulder discomfort.
- Preserve `target_item_id`.
- Return `state_after.current_item_id`.

Result:

```text
passed
```

Review note:

This is the most important compound-feedback rule. Pain/risk must beat load progression.

### Case 2: Equipment Occupied + Dumbbell Only + Target Muscle Feedback

Input:

```text
高位下拉和绳索划船都有人了，我现在只有哑铃，而且刚才感觉不到背。
```

Expected:

- Return `plan_patch`.
- Use `replace_exercise`.
- Keep back-training goal.
- Replace with dumbbell rowing option.
- Preserve `target_item_id`.

Result:

```text
passed
```

Review note:

The system should not treat this as three unrelated messages. It should solve the equipment constraint while keeping the training goal and adding a cue.

### Case 3: Backfill + Future Planning Mixed Together

Input:

```text
前天练了腿还没记录，明天想别再练腿，先帮我把前天保存。
```

Expected:

- Because the user says `先保存`, output `training_card`.
- Save the past card to `time_context.target_date`.
- Put future planning concern into later suggestions instead of silently generating a future plan.

Initial result:

```text
failed: test double returned training_plan because it saw 明天 first
```

Fix applied:

- Updated the test Hermes client so backfill / `先保存` wins before future planning.
- Updated `output_contract.md` and Hermes provider prompt with the same sequencing rule.

Final result:

```text
passed
```

Review note:

This caught a real ambiguity that would otherwise create wrong historical data.

### Case 4: Preference Contradiction

Input:

```text
我之前说不喜欢波比跳和高强度 HIIT，但其实现在挺喜欢的，之后可以安排。
```

Expected:

- Return `plan_patch`.
- Return two `memory_updates`.
- Each update uses `operation: replace`.
- Do not leave contradictory disliked preferences active after confirmation.

Result:

```text
passed
```

Review note:

This protects the Memory layer from append-only contradiction.

### Case 5: Completed Sets + Mild Instability

Input:

```text
前三组做完了，肩膀还好，但最后两次有点晃，下一步做什么？
```

Expected:

- Hermes can send `session_update.current_set`.
- Gateway persists the current set and current item from Hermes output.
- Frontend should not guess the next action.

Result:

```text
passed
```

Review note:

This validates the new `state_after` / `current_item_id` direction.

## Skill / Contract Changes

Updated:

```text
road-to-summer/hermes-extension/skills/road_to_summer/output_contract.md
road-to-summer/gateway/src/hermes/buildHermesMessage.ts
road-to-summer/gateway/src/providers/hermes/HermesApiServerProvider.ts
```

Added compound input priority:

```text
1. red-flag symptoms / pain / joint instability
2. equipment unavailable or location constraint
3. completed set / current action state update
4. load progression or extra-set request
5. technique cue or target-muscle feedback
6. general conversation
```

## Verification

```text
npm test -> 83 passed
road-to-summer/frontend/node_modules/.bin/tsc -p road-to-summer/gateway/tsconfig.json --noEmit -> passed
git diff --check -> clean
```

## Review Findings

### Finding 1: Mixed temporal input needed explicit sequencing

Before this pass, the test double could treat `明天` as future planning even when the user explicitly said `先保存` a past session.

Status:

```text
fixed in test contract and prompt/Skill guidance
```

### Finding 2: Risk-vs-load conflict needed a hard priority rule

The prior guidance listed examples but did not state what to do when the user says both `太轻` and `肩前侧有点顶`.

Status:

```text
fixed in output contract and Hermes runtime prompt
```

### Finding 3: Gateway state handling is good enough for Hermes-driven current action updates

With `target_item_id`, `current_item_id`, and `state_after`, Hermes can advance the current set and Gateway will persist it.

Status:

```text
passed
```

### Finding 4: This is still not a live model evaluation

These tests prove the contract and Gateway path. They do not prove MiniMax/Hermes will always choose the right response under real generation.

Next recommended check:

```text
Run the same five prompts against real Hermes + MiniMax and save raw Hermes JSON + UI state snapshots as golden fixtures.
```

