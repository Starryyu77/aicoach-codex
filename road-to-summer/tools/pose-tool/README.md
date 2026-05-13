# Pose Tool Mock

第一版不实现完整动作识别 SDK，也不修改 Hermes Core。

这个工具只模拟外部 Vision / Pose Tool 的结构化输出：

```json
{
  "event_type": "movement_assessment",
  "exercise": "高位下拉",
  "assessment": {
    "shoulder_elevation": "slightly_high",
    "torso_swing": "moderate",
    "range_of_motion": "acceptable",
    "fatigue_signal": "possible"
  },
  "recommendation_needed": true
}
```

Gateway 会把该结果发给 Hermes，由 Road to Summer Skill Pack 生成 `plan_patch`。

