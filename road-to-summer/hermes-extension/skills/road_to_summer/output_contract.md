# Output Contract

Hermes must output valid JSON. The UI Gateway must reject or repair non-JSON output before returning to the frontend.

Every request includes `time_context`. Treat it as the only source of truth for date reasoning.

The frontend may render a dynamic UI from `ui.agent_ui`, but the current first version does not require Hermes to generate arbitrary UI JSON directly. Hermes should return the domain JSON below. The Gateway compiles that domain JSON into an A2UI-inspired `AgentUiDocument` using a strict component allowlist.

```json
{
  "timezone": "Asia/Singapore",
  "today": "2026-05-14",
  "target_date": "2026-05-15",
  "target_date_label": "2026-05-15",
  "temporal_intent": "future_planning",
  "date_source": "relative_text"
}
```

- If the user asks about "today", "tomorrow", "yesterday", "the day before yesterday", or a specific date, use `time_context.target_date`.
- If `time_context.date_source` is `explicit_text` or `relative_text`, it overrides stale UI selected dates.
- If `time_context.date_conflict` exists, follow its `resolution` and mention the resolved date in `chat_message`.
- For future planning, output `training_plan`; do not create a completed training card.
- For backfilled training logs, output `training_card` and set `training_card.date` to `time_context.target_date`.
- Treat `time_context.today` and `time_context.target_date` as absolute `YYYY-MM-DD` facts. Compare those dates before deciding whether the request is past, present, or future.
- Do not write relative labels such as `今天`, `明天`, `昨天`, or `前天` into `plan_card.date_label`, `training_card.date_label`, history cards, generated Markdown, or primary plan/card headline explanations. If a label field is required, use the absolute date or leave it empty.

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

All user-facing text in `training_plan` must be Chinese and coach-like. Do not make the user feel they are reading a reference table. If an official model affects a decision, explain it inline in `chat_message` and in each action's `source_note`.

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
            "role": "main",
            "movement_pattern": "",
            "primary_muscles": [],
            "sets": "",
            "reps": "",
            "intensity": "",
            "rest": "",
            "cue": "",
            "selection_reason": "",
            "source_note": "",
            "common_mistakes": [],
            "adjustment_rule": "",
            "substitutions": []
          }
        ]
      }
    ],
    "risk_notes": [],
    "reasoning": "",
    "framework_trace": [],
    "official_source_trace": [],
    "decision_basis": [],
    "recent_training_summary": [],
    "quality_warnings": []
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

For every `training_plan`:

- `reasoning` must explain why this plan fits today or the target date.
- `framework_trace` should include 3-5 concise framework decisions, using NASM OPT, ACE IFT, NSCA Program Design, ACSM 2026 Resistance Training, and RPE/RIR Autoregulation only when they materially affect the plan.
- `official_source_trace` is retained for machine traceability. It should cite the official model/source behind those decisions. Each item must include `framework`, `model`, `official_source`, `source_url`, `source_location`, `principle`, `applied_decision`, and `why_it_matters`.
- Do not render `official_source_trace` as a separate user-facing reference list. The coach-facing explanation belongs in `chat_message` and each exercise item's `source_note`.
- `source_note` must be a short Chinese sentence that says how an official model/principle affected this action. Example: `教练依据：这里参考 NSCA 的训练结构原则，把这个动作放在主训练后补足水平拉动作模式，不盲目重复高位下拉。`
- `decision_basis` should name the concrete sources used: recent training cards, current status, equipment, preferences, risks.
- `recent_training_summary` should summarize the last 1-3 sessions read before planning.
- `quality_warnings` should mention conflict checks such as recent shoulder/back work, yesterday lower-body fatigue, duplicate exercise removal, or risk constraints.
- If the last 48-72 hours already include high-volume shoulder/back/chest or high-intensity lower-body work, do not output another high-volume plan for the same area unless the user explicitly confirms.
- Each structured exercise item should include `role`, `movement_pattern`, `primary_muscles`, `selection_reason`, `source_note`, `common_mistakes`, `adjustment_rule`, and `substitutions`.
- `selection_reason` must explain why the exercise was selected over likely alternatives in this session.
- `adjustment_rule` must explain how to modify the exercise if load, fatigue, pain, equipment, or target-muscle feedback changes.
- Include at least one functional element such as core anti-extension, anti-rotation, shoulder/scapular control, hip stability, single-side control, or low-intensity recovery unless the session is stopped for red-flag risk.

`official_source_trace` item format:

```json
{
  "framework": "NASM OPT",
  "model": "Optimum Performance Training Model",
  "official_source": "NASM OPT Model",
  "source_url": "https://www.nasm.org/certified-personal-trainer/the-opt-model",
  "source_location": "The OPT Model page; five phases from Stabilization Endurance to Power.",
  "principle": "Choose the training phase before choosing intensity.",
  "applied_decision": "Selected muscle-development work because the target is hypertrophy and readiness is acceptable.",
  "why_it_matters": "This explains why the plan uses moderate-to-high effort hypertrophy work instead of maximal strength or power work."
}
```

Do not paste long copyrighted text from official sources. Summarize the principle and link to the official page.

## B. plan_patch

Use `plan_patch` for training-session dialogue. The user can speak in normal language; Hermes should infer the intent from `raw_text`, `current_session`, current exercise, current plan, and risk context.

Do not answer with a generic taxonomy prompt such as:

```text
请确认这是器械、疲劳、疼痛、动作感受，还是训练结束
```

Instead, map the sentence to a concrete training action and tell the user the next step in Chinese.

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

Common in-session language mapping:

- `太轻了`, `太轻松`, `重量不够`: `adjust_load`; raise load 2.5%-5% or add 1-2 reps when form is stable and no pain.
- `太重了`, `做不动`, `姿势变形`: `adjust_load`; lower load 5%-15% or reduce volume.
- `感觉不到目标肌肉`: `update_cue`; give plain-language body cue and next-set adjustment.
- `不会做`, `怎么做`: `update_cue`; teach the next set with simple steps and lower-risk execution.
- `有点晃`, `不稳`, `控制不住`: `update_cue` or `adjust_load`; stabilize first.
- `要不要加组`, `还能继续吗`: `add_set` only if movement quality, pain, fatigue, and session completion allow it.
- `有点累`: `extend_rest`, `adjust_load`, or `reduce_sets`; do not end automatically.
- `有点疼`, `不舒服`, red-flag symptoms: risk-safe guidance, substitution, or `end_session`.
- `器械有人`, `器械坏了`: `replace_exercise`.

For preference corrections, include structured replacement metadata so the Gateway can replace contradictory old memory instead of appending another note:

```json
{
  "target": "Hermes Memory",
  "category": "preference",
  "operation": "replace",
  "key": "波比跳",
  "value": "喜欢波比跳",
  "remove_values": ["不喜欢波比跳"],
  "content": "将训练偏好更新为：喜欢波比跳。",
  "reason": "用户明确纠正旧偏好。",
  "requires_confirmation": true
}
```

Do not leave old contradictory preferences active after a confirmed replacement. If the user says they now like something previously listed as disliked, propose a `replace` update, not an additional generic note.

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
