# Phone real Chrome test - 2026-05-15

## Context

- Branch: `codex/phone`
- App: `http://localhost:3000/phone`
- Browser: Google Chrome via Computer Use
- Provider path: real `minimax-cn · MiniMax-M2.7-highspeed`, no mock fallback
- Voice input: not tested; text input only

## Flow Tested

1. Opened `/phone` with an existing recovered plan.
2. Clicked `新对话`.
3. Refreshed `/phone`.
4. Clicked `生成计划` for target date `2026-05-15`.
5. Sent text feedback: `太轻了`.
6. Refreshed `/phone`.
7. Sent text request: `把当前动作换成台阶上步`.
8. Clicked returned quick action: `确认台阶上步`.
9. Navigated `/history -> /phone`.
10. Clicked `结束并保存`.
11. Refreshed `/phone`.
12. Opened `/history`.

## Passed Checks

- `新对话` then refresh did not restore the previous `2026-05-16` plan.
- Real Hermes generated a plan without local fallback.
- `太轻了` changed the visible current action from `下肢恢复状态快速检查` to `全身活动度循环`.
- The `太轻了` change survived browser refresh.
- `/history -> /phone` preserved chat messages and the current session state.
- `结束并保存` removed the current plan dock.
- Refresh after ending did not restore the ended dock.
- History saved a new card at `road-to-summer/gateway/state/training_cards/card-1778836160289.json`.
- Local state after ending:
  - `road-to-summer/gateway/state/current_session.json`: `phase=ended`, `current_plan=null`, `plan_card=null`, `chat_messages=10`.
  - `road-to-summer/gateway/state/current_plan.json` does not exist.

## Bugs Found

### P0 - Chat says replacement succeeded, current plan does not change

User request: `把当前动作换成台阶上步`.

Observed:

- Agent text: `已记录。当前全身活动度循环替换为台阶上步。`
- Agent structured UI showed `替换动作`, but its `当前动作` remained `全身活动度循环`.
- Current plan dock still showed `当前动作: 全身活动度循环`.
- Clicking `确认台阶上步` produced additional text about 台阶上步, but current plan dock still remained `全身活动度循环`.
- History card later included `台阶上步` and a `replace_exercise` adjustment, so final training-card state and live current-plan state diverged.

Expected:

- If the replacement is accepted, `current_plan` / plan dock should update to `台阶上步` before session end.
- If Hermes returns an un-applied patch, the UI must not claim the current action was replaced.

### P1 - Target-date inconsistency in generated chat text

User request: `请按 2026-05-15 生成训练计划。`

Observed:

- Plan title and target date were `2026-05-15`.
- Agent text said: `已为 2026-05-16 生成训练计划。今天（2026-05-15）...`

Expected:

- User-facing text for generated plan should consistently reference target date `2026-05-15`, or explicitly explain why it is planning for another date.

### P1 - End summary merged same-day prior history with current session

Observed:

- The ended card theme became `上肢拉力·核心稳定·心肺激活 + 恢复与功能维护`.
- The summary described both an earlier same-day upper-body session and the current recovery session.

Expected:

- This may be intentional if same-day history merge is product behavior.
- If the user is ending only the current phone session, the saved card should make the merge explicit or separate current-session completion from earlier history.

## Evidence

Latest saved card:

- `road-to-summer/gateway/state/training_cards/card-1778836160289.json`
- `theme`: `上肢拉力·核心稳定·心肺激活 + 恢复与功能维护`
- `date`: `2026-05-15`
- `actual_completed` includes `台阶上步`
- `adjustments[0]`: `replace_exercise`, `target_exercise=全身活动度循环`, `to=台阶上步`

Current session after end:

```json
{
  "phase": "ended",
  "target_date": "2026-05-15",
  "current_plan": null,
  "plan_card": null,
  "chat_messages": 10
}
```
