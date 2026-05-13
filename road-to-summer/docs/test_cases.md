# Test Cases

## Scenario 1: Preworkout plan

Input:

```text
今天该练什么？
```

Expected:

- `training_plan`
- Plan card shown.
- Warmup, main training, accessory, core / cardio / stretching.
- Quick actions.

## Scenario 2: Equipment occupied

Input:

```text
高位下拉和绳索划船有人了。
```

Expected:

- `plan_patch`
- `operation = replace_exercise`
- Back training goal remains.
- Plan updates.

## Scenario 3: Equipment broken

Input:

```text
高位下拉坏了，今天不能用。
```

Expected:

- `plan_patch`
- Replacement exercise.
- Memory update candidate.

## Scenario 4: Equipment repaired

Input:

```text
高位下拉修好了。
```

Expected:

- Memory update candidate.
- Equipment restored as available.

## Scenario 5: Fatigue

Input:

```text
我有点累了，还要不要继续？
```

Expected:

- Does not directly end.
- Gives continue / reduce load / reduce sets / extend rest / stop conditions.

## Scenario 6: Cannot feel target muscle

Input:

```text
我感觉不到背阔肌发力。
```

Expected:

- Plain-language cue.
- Body feel.
- Next-set adjustment.

## Scenario 7: Video movement check

Input:

```text
POST /vision/assess
exercise = 高位下拉
```

Expected:

- Mock assessment.
- `plan_patch`
- `operation = update_cue`

## Scenario 8: End session

Input:

```text
今天练完了，帮我总结一下。
```

Expected:

- `training_card`
- Saved to `training_cards/`.
- History can list it.
- Memory updates require confirmation.

