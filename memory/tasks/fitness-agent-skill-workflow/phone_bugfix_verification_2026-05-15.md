# Phone bugfix verification - 2026-05-15

## Scope

Fixed issues found during real Chrome testing of `http://localhost:3000/phone` on branch `codex/phone`.

## Fixed

1. `UT-001` plan replacement state split:
   - `plan_patch` now applies to explicit `session_update.plan_card` instead of trusting it as already-correct.
   - Section/group-level targets such as `全身活动度循环` can patch the first item in that section.
   - Applied `replace_exercise` now drives `current_session.current_exercise` from `patch.to`, avoiding stale Hermes `session_update.current_exercise`.
   - Explicit already-updated plan aliases (`updated_plan/current_plan/plan_card`) are treated as applied when they contain the replacement exercise, so the plan and cursor do not split.

2. `UT-002` ended session resurrection:
   - New training-plan requests on an `ended` session now create a fresh preworkout session context before calling Hermes.
   - The phone muscle picker also resets an ended session before submitting the selected muscles.
   - Muscle-picker text `训练：胸部` is now classified as `training_plan`.

3. `UT-003` date mismatch:
   - Generated-plan chat text is aligned to the resolved `time_context.target_date` for the common `已为 YYYY-MM-DD 生成...` phrase.
   - Alternate phrases such as `已生成 YYYY-MM-DD 的训练计划` and `为 YYYY-MM-DD 生成训练计划` are also normalized.

4. `UT-004` camera without plan:
   - Phone camera entry now requires both a live plan and a current exercise target.
   - Camera entry is also disabled while a chat/end-session request is in flight.
   - Without a current plan it shows `先生成或恢复一个训练计划，再打开摄像头检查具体动作。` instead of an `打开摄像头` permission button.

5. Additional real-provider mismatch:
   - `planQuality` no longer silently replaces a requested provider plan with a local `恢复与功能维护` plan when recent-history conflicts exist.
   - Conflicts now stay as `quality_warnings` / decision context while the provider plan remains the live `current_plan`.

## Regression Coverage Added

- `tests/phoneP0Contracts.test.mjs`
  - Section-level replace patch writes `current_plan`, `plan_card`, and `current_exercise`.
  - Muscle picker text is treated as `training_plan`.
  - Planning from ended session starts clean and does not resurrect ended plan.
  - Generated-plan date text is aligned with selected target date.
  - Recent-history quality conflicts warn without local recovery-plan replacement.

- `tests/phoneFrontendSafety.test.mjs`
  - Camera entry requires active plan target.

## Verification

Commands:

```bash
npm test
npm run build --prefix road-to-summer/frontend
git diff --check
```

Results:

- `npm test`: 115/115 passing.
- `frontend build`: passing.
- `git diff --check`: passing.

Real Chrome verification after restarting Gateway:

- Reset phone session with `新对话`.
- Opened camera with no plan: panel showed the no-plan warning, not `打开摄像头`.
- Selected `胸部` in muscle picker and confirmed.
- Result: current header, structured response, and plan dock all showed `胸部增肌 · 水平推+上斜推`; old `恢复与功能维护` plan did not reappear.

## Remaining Product Question

`UT-005` is not fully resolved here because it is a product decision: ending a session currently may produce a same-day merged summary. Decide whether `/history` should store a current-session card only, a daily summary card, or both with separate labels.
