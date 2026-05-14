# Output Contract

Hermes must output valid JSON. The UI Gateway must reject or repair non-JSON output before returning to the frontend.

Every request includes `time_context`. Treat it as the only source of truth for date reasoning.

```json
{
  "timezone": "Asia/Singapore",
  "today": "2026-05-14",
  "target_date": "2026-05-15",
  "target_date_label": "明天",
  "temporal_intent": "future_planning",
  "date_source": "relative_text"
}
```

- If the user asks about "today", "tomorrow", "yesterday", "the day before yesterday", or a specific date, use `time_context.target_date`.
- If `time_context.date_source` is `explicit_text` or `relative_text`, it overrides stale UI selected dates.
- If `time_context.date_conflict` exists, follow its `resolution` and mention the resolved date in `chat_message`.
- For future planning, output `training_plan`; do not create a completed training card.
- For backfilled training logs, output `training_card` and set `training_card.date` to `time_context.target_date`.

Before producing the final JSON, classify the input:

```json
{
  "time_analysis": {
    "today": "",
    "target_date": "",
    "date_label": "",
    "date_source": "explicit_text | relative_text | selected_date | default_today",
    "temporal_intent": "future_planning | backfill_training_log | today_session | past_reference | selected_date | unspecified",
    "classification": "future_training_plan | backfill_training_log | current_session_update | in_session_adjustment"
  }
}
```

`time_analysis` is optional in the response, but the classification must guide the chosen `type`.

## A. training_plan

```json
{
  "type": "training_plan",
  "chat_message": "",
  "plan_card": {
    "title": "",
    "target_date": "",
    "date_label": "",
    "timezone": "",
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
    "date_label": "",
    "timezone": "",
    "completed_at": "",
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

## D. training_review

Use this for reviewing existing historical training records. Do not save a new training card.

```json
{
  "type": "training_review",
  "chat_message": "",
  "review_card": {
    "title": "",
    "date_range": {
      "from": "",
      "to": "",
      "label": ""
    },
    "scope": "single_day | multi_day | recent_series",
    "referenced_cards": [],
    "sessions": [
      {
        "date": "",
        "theme": "",
        "summary": "",
        "highlights": [],
        "issues": []
      }
    ],
    "patterns": [],
    "risks": [],
    "next_actions": []
  },
  "quick_actions": []
}
```

Use `training_review` when the user asks to:

- 复盘某一天训练。
- 回顾最近几次训练。
- 分析前几天一整个系列训练。
- 根据历史训练卡找规律、风险、下次安排依据。

Never use `training_card` for a pure review request unless the user explicitly asks to补录/保存/生成训练卡.
