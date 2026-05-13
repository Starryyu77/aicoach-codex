# Test Run: Real Hermes + MiniMax Integration

Date: 2026-05-13

## Environment

```text
Frontend: http://localhost:3000/training
Gateway: http://127.0.0.1:8787
Hermes API Server: http://127.0.0.1:8642/v1
Hermes Provider: local-hermes
Hermes Runtime: minimax-cn / MiniMax-M2.7-highspeed
ASR Provider: doubao-asr-flash
Vision Provider: mock-vision
```

## Fix Applied Before Test

Issue:

```text
Encountered two children with the same key, `热身-undefined`.
```

Root cause:

- Real Hermes returned warmup items as strings.
- `CurrentPlanCard` assumed every `section.items[]` entry was a `PlanItem` object.
- React key used `item.exercise`, which was `undefined` for string items.

Fix:

- `PlanSection.items` now supports `Array<PlanItem | string>`.
- `CurrentPlanCard` renders string items as simple rows.
- Object rows still render exercise / sets / reps / intensity / rest.
- React key now uses `section.name + index + label`, avoiding duplicates.
- `TrainingCockpit` now filters only real `PlanItem` objects when selecting the current exercise.

Files changed:

```text
road-to-summer/frontend/src/lib/types.ts
road-to-summer/frontend/src/components/CurrentPlanCard.tsx
road-to-summer/frontend/src/components/TrainingCockpit.tsx
```

## Automated Results

```text
npm test -> 36 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
git diff --check -> clean
```

Note:

- First `next build` attempt failed inside the sandbox because Turbopack tried to create a process / bind a port.
- Retried outside the sandbox as required; production build passed.

## Real API Test Results

### Provider Health

```text
POST /providers/hermes/test -> 200, ok, local-hermes
POST /providers/asr/test -> 200, ok, doubao-asr-flash
POST /session/start -> 200
```

### TC-UI-001: Generate Plan

Input:

```text
今天该练什么？
```

Result:

```text
status: 200
duration: 107075ms
type: training_plan
hasPlan: true
```

Observed:

- Real Hermes generated a structured training plan.
- Plan included mixed string and object items.
- The duplicate-key issue is addressed by the frontend fix above.

### TC-UI-002: Equipment Occupied

Input:

```text
高位下拉和绳索划船有人了。
```

Result:

```text
status: 200
duration: 61172ms
type: plan_patch
operation: replace_exercise
```

Observed:

- Passed.
- Hermes preserved the training target and suggested replacement.

### TC-UI-005: Fatigue

Input:

```text
我有点累了，还要不要继续？
```

Result:

```text
status: 200
duration: 104207ms
type: plan_patch
operation: extend_rest
```

Observed response:

```text
热身强度很轻，能量消耗不大。累了可以先暂停，伸展一下，等状态回来再继续。如果感觉还行，直接做下一组也没问题。
```

Assessment:

- Partially passed.
- It did not immediately end the session, which is correct.
- But it did not sufficiently ask or evaluate fatigue type, completion progress, pain, and movement quality.

Follow-up needed:

- Strengthen Road to Summer skill / prompt for fatigue handling.
- Require response to include local vs systemic fatigue, pain/dizziness check, progress check, and explicit continue/reduce/rest/stop criteria.

### TC-UI-006: Target Muscle Cue

Input:

```text
我感觉不到背阔肌发力。
```

Result:

```text
status: 200
duration: 21279ms
type: plan_patch
operation: update_cue
```

Observed:

- Passed.
- Response used cue update flow.

### TC-VISION-001: Vision Mock

Input:

```text
POST /vision/assess
exercise = 高位下拉
```

Result:

```text
status: 200
duration: 26479ms
type: plan_patch
operation: update_cue
```

Observed:

- Passed.
- Mock pose assessment produced movement correction cue.

### TC-UI-008: End Session

Input:

```text
今天练完了，帮我总结一下。
```

Result:

```text
status: 200
duration: 43745ms
type: training_card
hasCard: true
```

Observed:

- Passed.
- Training card was written.
- `GET /history` returned the card list.

## Issues Found

### P1: Real Plan Items Can Be Mixed Shape

Status: fixed.

Details:

- Hermes may return `section.items[]` as strings for warmup and objects for main training.
- Frontend now supports both.

### P2: Fatigue Handling Is Too Shallow

Status: open.

Details:

- Real Hermes response did not directly stop training, but it did not fully follow the fatigue workflow.
- The response should explicitly evaluate:
  - local vs full-body fatigue
  - abnormal discomfort / dizziness / pain
  - current completion stage
  - movement quality
  - whether to continue, reduce load, reduce sets, extend rest, switch movement, or end.

Recommended fix:

- Update `road-to-summer/hermes-extension/skills/road_to_summer/SKILL.md`.
- Update `training_rules.md` and `risk_policy.md`.
- Add a stricter output requirement for fatigue `plan_patch`.

### P3: Real Hermes Latency Is High

Status: expected for current integration.

Observed:

```text
training_plan: ~107s
equipment patch: ~61s
fatigue patch: ~104s
cue patch: ~21s
vision patch: ~26s
training_card: ~44s
```

Recommended fix:

- Keep `local-hermes.timeoutMs >= 180000`.
- Later add a faster path for simple in-session plan patches.
- Consider a lighter prompt for `plan_patch` events.

### P3: History Endpoint Shape Differs From Initial Script Assumption

Status: not a product bug.

Details:

- `GET /history` returns an array directly, not `{ cards: [] }`.
- The manual test script expected `data.cards`, so count was not printed.
- Actual endpoint returned saved cards correctly.

## Current Verdict

The real integration path is usable:

```text
Frontend -> Gateway -> Hermes API Server -> MiniMax CN -> structured JSON -> UI mapping
```

Passed:

- Provider health.
- Real training plan.
- Equipment replacement patch.
- Target-muscle cue patch.
- Vision mock correction.
- Training card generation.
- History read.
- Automated tests.
- Frontend production build.

Needs improvement:

- Fatigue workflow response quality.
- Real-mode latency.
