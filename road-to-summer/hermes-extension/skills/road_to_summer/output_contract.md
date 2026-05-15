# Output Contract

Hermes must output valid JSON. The UI Gateway must reject or repair non-JSON output before returning to the frontend.

Every request includes `time_context`. Treat it as the only source of truth for date reasoning.

The frontend may render a dynamic UI from `ui.agent_ui`, but the current first version does not require Hermes to generate arbitrary UI JSON directly. Hermes should return the domain JSON below. The Gateway compiles that domain JSON into an A2UI-inspired `AgentUiDocument` using a strict component allowlist.

## Contract Envelope

All outputs should include a lightweight state envelope when the fields are available. The Gateway can fill missing fields, but Hermes should preserve IDs and revisions sent in `current_session`, `state_before`, and the current plan.

```json
{
  "schema_version": "rts.agent_output.v1",
  "contract_version": "2026-05-15",
  "turn_id": "turn_...",
  "event_id": "evt_...",
  "session_id": "session_...",
  "idempotency_key": "evt_...",
  "state_before": {
    "session_id": "session_...",
    "plan_id": "plan_...",
    "plan_revision": 3,
    "current_item_id": "plan_...-item-...",
    "current_exercise": "哑铃卧推",
    "current_set": 2,
    "session_phase": "main",
    "target_date": "2026-05-15"
  },
  "state_delta": {
    "operations": [
      {
        "type": "adjust_load",
        "target_item_id": "plan_...-item-...",
        "from": "RPE 6",
        "to": "RPE 7",
        "reason": "用户反馈太轻且动作稳定"
      }
    ]
  },
  "state_after": {
    "session_id": "session_...",
    "plan_id": "plan_...",
    "plan_revision": 4,
    "current_item_id": "plan_...-item-...",
    "current_exercise": "哑铃卧推",
    "current_set": 2,
    "session_phase": "main",
    "target_date": "2026-05-15"
  }
}
```

Rules:

- `plan_id`, `section_id`, `item_id`, and `plan_revision` are state identifiers, not user-facing coaching content.
- A `plan_patch` must target `target_item_id` when the current plan contains item IDs. `target_exercise` is kept only as a readable fallback.
- A `plan_patch` should include `applies_to_plan_id` and `applies_to_revision`. If the Gateway receives a stale revision, it must reject the patch instead of guessing.
- Replacing an exercise keeps the same `item_id`; the slot changed, not the identity of the plan item in the UI timeline.
- Gateway may compile this domain output into UI, but Hermes remains responsible for the coaching decision.

```json
{
  "timezone": "Asia/Singapore",
  "today": "2026-05-15",
  "target_date": "2026-05-16",
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

All user-facing text in `training_plan` must be Chinese and coach-like. Do not make the user feel they are reading a reference table. If an official model affects a decision, explain it inline in `chat_message` and in each action's `source_note`.

```json
{
  "type": "training_plan",
  "chat_message": "",
  "plan_card": {
    "plan_id": "plan_...",
    "plan_revision": 1,
    "title": "",
    "target_date": "",
    "date_label": "",
    "timezone": "",
    "duration": "",
    "goal": "",
    "sections": [
      {
        "section_id": "sec_...",
        "name": "热身",
        "items": []
      },
      {
        "section_id": "sec_...",
        "name": "主训练",
        "items": [
          {
            "item_id": "item_...",
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

Hard structural rule:

- Every `plan_patch` response must contain a nested `patch` object.
- Do not put `patch_operation`, `reasoning`, `next_action`, `direction`, or `adjustment_magnitude` as the only top-level patch fields.
- If you need those concepts, map them into `patch.operation`, `patch.reason`, `patch.next_instruction`, and `patch.to`.
- A top-level shorthand such as `{ "type": "plan_patch", "patch_operation": "...", "reasoning": "...", "next_action": "..." }` is invalid for Road to Summer UI.
- The Gateway may repair this invalid shape defensively, but Hermes should never intentionally output it.

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
    "target_item_id": "",
    "target_section_id": "",
    "applies_to_plan_id": "",
    "applies_to_revision": 1,
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

Invalid `plan_patch` shape:

```json
{
  "type": "plan_patch",
  "patch_operation": "adjust_load",
  "reasoning": "用户反馈太轻。",
  "next_action": "下一组加 5%。"
}
```

Correct `plan_patch` shape:

```json
{
  "type": "plan_patch",
  "chat_message": "可以微调，但先看动作质量。下一组只加 5%，如果姿势变形就退回原重量。",
  "patch": {
    "operation": "adjust_load",
    "target_item_id": "item_...",
    "target_exercise": "当前动作",
    "from": "当前重量",
    "to": "增加 5%",
    "reason": "用户反馈太轻，且未报告疼痛或动作质量下降。",
    "next_instruction": "下一组只加 5%，保持动作轨迹；如果最后两次明显晃动，立刻退回原重量。"
  },
  "quick_actions": ["完成本组", "太轻了", "太重了", "有点疼"]
}
```

`memory_updates` is optional for ordinary patches, but required when the patch comes from a long-term equipment, risk, location, or preference update.

When one user sentence contains multiple signals, resolve conflicts explicitly instead of following the easiest keyword:

```text
priority:
1. red-flag symptoms / pain / joint instability
2. equipment unavailable or location constraint
3. completed set / current action state update
4. load progression or extra-set request
5. technique cue or target-muscle feedback
6. general conversation
```

Examples:

- `这个重量太轻了，但肩前侧有点顶，能不能加一点？` -> do not simply increase load. Treat shoulder discomfort as higher priority; output `update_cue`, `adjust_load` downward/hold, or substitution if needed.
- `高位下拉有人了，我现在只有哑铃，而且感觉不到背` -> preserve the back-training goal, choose a dumbbell replacement, and include a cue that helps the user feel the target area.
- `前三组做完了，最后两次有点晃` -> update the current set state if appropriate, but do not progress load until movement quality is stable.
- `前天练了腿还没记录，明天想别再练腿，先帮我把前天保存` -> because the user explicitly says "先保存", output a `training_card` for the past session first. Put the future-planning concern into `next_session_suggestions`; do not silently turn it into a future `training_plan`.

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
