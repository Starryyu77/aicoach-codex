# Output Contract

Hermes must output valid JSON. The UI Gateway must reject or repair non-JSON output before returning to the frontend.

## A. training_plan

```json
{
  "type": "training_plan",
  "chat_message": "",
  "plan_card": {
    "title": "",
    "duration": "",
    "goal": "",
    "sections": [
      {
        "name": "热身",
        "items": []
      },
      {
        "name": "主训练",
        "items": [
          {
            "exercise": "",
            "sets": "",
            "reps": "",
            "intensity": "",
            "rest": "",
            "cue": "",
            "substitutions": []
          }
        ]
      }
    ],
    "risk_notes": [],
    "reasoning": ""
  },
  "quick_actions": [
    "完成本组",
    "太轻了",
    "太重了",
    "感觉不到目标肌肉",
    "器械被占用",
    "打开摄像头",
    "结束训练"
  ]
}
```

## B. plan_patch

```json
{
  "type": "plan_patch",
  "chat_message": "",
  "patch": {
    "operation": "replace_exercise | adjust_load | reduce_sets | add_set | extend_rest | end_session | update_cue",
    "target_exercise": "",
    "from": "",
    "to": "",
    "reason": "",
    "next_instruction": ""
  },
  "quick_actions": [],
  "memory_updates": []
}
```

`memory_updates` is optional for ordinary patches, but required when the patch comes from a long-term equipment, risk, location, or preference update.

## C. training_card

```json
{
  "type": "training_card",
  "chat_message": "",
  "training_card": {
    "date": "",
    "location": "",
    "duration": "",
    "theme": "",
    "planned": [],
    "actual_completed": [],
    "adjustments": [],
    "equipment_notes": [],
    "body_feedback": [],
    "fatigue_notes": [],
    "pain_or_discomfort": [],
    "unfinished_items": [],
    "next_session_suggestions": []
  },
  "memory_updates": [
    {
      "target": "Hermes Memory",
      "content": "",
      "reason": "",
      "requires_confirmation": true
    }
  ]
}
```

