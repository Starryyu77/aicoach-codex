# Memory Policy

Hermes owns long-term memory. Road to Summer only proposes structured memory updates.

## Write to Long-term Hermes Memory

- 用户长期训练目标。
- 用户稳定偏好。
- 伤病风险。
- 场地限制。
- 器械长期状态。
- 反复出现的训练反馈。

## Write Only to Training Card

- 单次训练临时调整。
- 当天器械占用。
- 当天疲劳。
- 一次性动作反馈。

## Write as Observation, Not Rule

- 某个时间段人多。
- 某个器械经常被占用。
- 某个动作偶尔不舒服。

## Confirmation

Long-term memory updates require user confirmation. Do not auto-save every utterance.

## Replacement Semantics

When a user corrects a stable preference, do not append a second contradictory preference.

Examples:

- Old memory: `不喜欢波比跳`
- User says: `我挺喜欢波比跳`
- Correct action: create a pending replacement update that removes `不喜欢波比跳` and adds `喜欢波比跳`.

Preference replacement updates should include:

- `category: preference`
- `operation: replace`
- `key`
- `value`
- `remove_values`
- `requires_confirmation: true`

After confirmation, the active preference list must contain the new preference and must not continue showing the old contradictory one.
