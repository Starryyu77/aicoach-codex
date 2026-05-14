# Road to Summer Test Cases

Updated: 2026-05-14

This test plan verifies the first real integration build:

```text
Frontend Training Cockpit
  -> Road to Summer Gateway
  -> local Hermes API Server
  -> Hermes Runtime
  -> MiniMax CN / MiniMax-M2.7-highspeed

Voice input
  -> Gateway ASR Provider
  -> Doubao ASR Flash
```

The goal is not to test a full fitness app. The goal is to verify the Agent / Skill / Workflow layer: structured plans, in-session adjustments, training cards, memory candidates, and provider configuration.

## 0. Preconditions

Required local services:

```bash
npm run gateway
npm run dev --prefix road-to-summer/frontend
```

Hermes API Server:

```bash
set -a
. .runtime/secrets.env
set +a
API_SERVER_ENABLED=true \
API_SERVER_HOST=127.0.0.1 \
API_SERVER_PORT=8642 \
API_SERVER_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 \
uv run --project .runtime/upstream/hermes-agent hermes gateway run --accept-hooks
```

Expected Settings state:

```text
Hermes Runtime Model:
  provider = minimax-cn
  model = MiniMax-M2.7-highspeed
  baseUrl = https://api.minimaxi.com/anthropic
  apiKeyRef = MINIMAX_CN_API_KEY
  hasApiKey = true

Hermes Provider:
  active = local-hermes
  baseUrl = http://127.0.0.1:8642/v1

ASR Provider:
  active = doubao-asr-flash
  hasApiKey = true
```

Quick health checks:

```bash
curl http://127.0.0.1:8642/v1/capabilities
curl http://127.0.0.1:8787/providers
npm test
```

Pass criteria:

- Hermes capabilities returns 200.
- `GET /providers` shows `local-hermes` and `doubao-asr-flash` active.
- `npm test` passes.

## 1. Automated Regression Suite

Command:

```bash
npm test
```

Expected:

```text
52 tests passed
0 failed
```

Coverage:

- Input classification.
- Text cleanup and fitness terminology normalization.
- Mock workflow scenarios.
- Provider registry.
- Provider routes.
- Secret separation.
- Hermes API Server request shape.
- Doubao ASR request shape.
- Hermes Runtime MiniMax config.
- Time context parsing and absolute date propagation.
- Explicit text date overrides stale selected/session date.
- Historical review returns `training_review` and does not create training cards.
- Historical card metadata editing updates JSON and regenerated Markdown.

This suite does not spend real MiniMax / Doubao quota except when manually testing live endpoints.

## 1.1 Time Context Regression

### TC-TIME-001: Future Plan

Input:

```text
明天该练什么？
```

Expected:

- Gateway creates `time_context.temporal_intent = future_planning`.
- Hermes request includes absolute `time_context.target_date`.
- Response type is `training_plan`.
- `plan_card.target_date` is tomorrow's absolute date.
- No training card is saved.

### TC-TIME-002: Backfilled Training Card

Input:

```text
前天练完了，帮我补一张训练卡。
```

Expected:

- Gateway creates `time_context.temporal_intent = backfill_training_log`.
- Response type is `training_card`.
- Saved card `date` is the day before yesterday's absolute date.
- Saved Markdown includes `日期语义：前天`.

### TC-TIME-003: Selected Date in Training Cockpit

Steps:

1. Open `/training`.
2. Use the target date control to choose a non-today date.
3. Click generate plan.

Expected:

- Frontend sends `target_date` to Gateway.
- Gateway includes selected date in `time_context`.
- Plan header and current plan card show the selected target date.

### TC-TIME-004: Explicit User Date Wins

Input:

```text
5月13日我练了下肢，帮我记录一下。
```

With stale selected date:

```json
{
  "target_date": "2026-05-11"
}
```

Expected:

- Gateway creates `time_context.date_source = explicit_text`.
- Gateway creates `time_context.date_conflict.resolution = explicit_text_wins`.
- Response type is `training_card`.
- Saved card date is `2026-05-13`, not the stale selected date.

### TC-TIME-005: Historical Review Does Not Write History

Input:

```text
复盘一下5月13日的训练。
复盘前几天这一整个系列训练。
```

Expected:

- Response type is `training_review`.
- Single-day review uses `scope = single_day`.
- Series review uses `scope = recent_series` or `multi_day`.
- History card count does not increase.

### TC-HISTORY-EDIT-001: Edit Training Card Date

Steps:

1. Open `/history`.
2. Click `编辑` on a training card.
3. Change `训练日期` from one date to another, for example `2026-05-13` -> `2026-05-12`.
4. Save.

Expected:

- Gateway calls `PUT /history/:id`.
- `training_cards/:id.json` updates `date`.
- `training_cards/:id.md` is regenerated with the new date.
- History list refreshes the edited card in place.
- Invalid date formats are rejected; use `YYYY-MM-DD`.

## 2. Real Hermes Smoke Test

### TC-HERMES-001: Capabilities

Request:

```bash
curl http://127.0.0.1:8642/v1/capabilities
```

Expected:

- HTTP 200.
- `features.chat_completions = true`.
- `endpoints.chat_completions.path = /v1/chat/completions`.

### TC-HERMES-002: Gateway Provider Test

Request:

```bash
curl -X POST http://127.0.0.1:8787/providers/hermes/test \
  -H 'content-type: application/json' \
  -d '{}'
```

Expected:

- `ok = true`.
- `providerId = local-hermes`.
- No API key appears in response.

### TC-HERMES-003: Real Training Plan

Request:

```bash
curl -X POST http://127.0.0.1:8787/chat \
  -H 'content-type: application/json' \
  -d '{"text":"今天该练什么？","source":"text"}'
```

Expected:

- HTTP 200.
- `hermes_output.type = training_plan`.
- `ui.current_plan` exists.
- Includes plan sections and quick actions.
- Response may take 40-60 seconds on real Hermes + MiniMax.

Failure handling:

- If HTTP 401 appears, verify CN endpoint and `MINIMAX_CN_API_KEY`.
- If timeout appears, verify `local-hermes.timeoutMs >= 180000`.

### TC-HERMES-004: Recent Training Conflict Guard

Precondition:

- History contains:
  - `2026-05-12` upper push/pull / chest-back-shoulder session.
  - `2026-05-13` high-intensity lower-body / legs-glutes session.

Request:

```bash
curl -X POST http://127.0.0.1:8787/chat \
  -H 'content-type: application/json' \
  -d '{"text":"今天该练什么？","source":"text","timezone":"Asia/Singapore"}'
```

Expected:

- Gateway reads recent cards before saving the plan.
- Plan is not high-volume chest/back/shoulder.
- Plan is not high-intensity lower-body.
- Plan title or goal shifts to recovery / mobility / functional maintenance.
- `recent_training_summary` names the recent sessions used.
- `quality_warnings` explains the shoulder/back and lower-body conflict.
- Repeated exercises are removed before the plan reaches the frontend.

## 3. Training Cockpit Manual Flow

Open:

```text
http://localhost:3000/training
```

### TC-UI-001: Generate Plan From UI

Steps:

1. Open `/training`.
2. Click `生成今日计划`.
3. Wait for Hermes response.

Expected:

- Current goal changes from `待生成`.
- Current plan card appears.
- Current exercise card is populated.
- Chat panel shows Hermes reply.
- Quick actions remain visible.

Pass criteria:

- User can start a session without touching Settings.
- Plan card is structured, not a long free-text paragraph.

### TC-UI-002: Equipment Occupied

Precondition:

- A plan has been generated.

Input:

```text
高位下拉和绳索划船有人了。
```

Expected:

- `hermes_output.type = plan_patch`.
- Patch operation should be `replace_exercise` or equivalent replacement instruction.
- Back training goal remains unchanged.
- Replacement uses available equipment, e.g. dumbbell row / chest-supported row.
- Chat explains why replacement preserves the training target.

### TC-UI-003: Load Too Light

Input:

```text
这个重量太轻。
```

Expected:

- `plan_patch`.
- Operation likely `adjust_load`.
- Next instruction gives concrete increase rule, e.g. add 2.5-5kg or raise RPE target.
- Does not blindly add many sets.

### TC-UI-004: Load Too Heavy

Input:

```text
这个重量太重。
```

Expected:

- `plan_patch`.
- Operation likely `adjust_load` or `reduce_sets`.
- Suggests lowering load and preserving form.
- Explains relation to goal and risk.

### TC-UI-005: Fatigue Without Over-Conservatism

Input:

```text
我有点累了，还要不要继续？
```

Expected:

- Does not directly end session.
- Asks or evaluates:
  - local vs full-body fatigue
  - pain / dizziness / abnormal discomfort
  - current completion progress
  - movement quality
- Gives conditions for:
  - continue
  - extend rest
  - reduce load
  - reduce sets
  - stop current exercise
  - end session only when needed

### TC-UI-006: Target Muscle Cue

Input:

```text
我感觉不到背阔肌发力。
```

Expected:

- `plan_patch.operation = update_cue`.
- Uses plain language, not only professional terms.
- Includes body feel and analogy.
- Gives next-set instruction.

Expected cue style:

```text
想象不是用手拉重量，而是用手肘往裤兜方向拉。
先把肩膀放低，不要耸肩。下一组稍微降重，动作放慢。
```

### TC-UI-007: Pain / Risk Escalation

Input:

```text
肩膀前侧有点疼。
```

Expected:

- Risk-aware response.
- Stops or replaces the risky movement if pain persists or sharp pain appears.
- Does not diagnose disease.
- Suggests lowering load, changing range, switching movement, or ending current exercise when needed.
- Adds risk memory candidate if repeated or meaningful.

### TC-UI-008: End Session

Input:

```text
今天练完了，帮我总结一下。
```

Expected:

- `hermes_output.type = training_card`.
- Training card includes:
  - date
  - location
  - duration
  - theme
  - planned
  - actual_completed
  - adjustments
  - equipment_notes
  - body_feedback
  - fatigue_notes
  - pain_or_discomfort
  - unfinished_items
  - next_session_suggestions
- Card is saved into local training card cache.

Follow-up:

Open:

```text
http://localhost:3000/history
```

Expected:

- New training card is visible.

## 4. Voice / ASR Tests

Open:

```text
http://localhost:3000/training
```

### TC-VOICE-001: Doubao Provider Health

Request:

```bash
curl -X POST http://127.0.0.1:8787/providers/asr/test \
  -H 'content-type: application/json' \
  -d '{}'
```

Expected:

- `ok = true`.
- `providerId = doubao-asr-flash`.
- Response says credential is configured.
- No API key appears in response.

### TC-VOICE-002: Browser Recording

Steps:

1. Click `语音输入`.
2. Speak:

```text
高位下拉有人了。
```

3. Stop recording.
4. Confirm/send transcript if prompted.

Expected:

- Browser asks microphone permission if needed.
- `/voice/transcribe` returns text.
- Transcript appears in UI.
- After send, `/chat` receives the transcribed text.
- Hermes returns a `plan_patch`.

Failure handling:

- If browser audio format is rejected, fallback to mock text or add Gateway audio transcoding.
- If permission fails, check macOS / browser microphone permission.

### TC-VOICE-003: Short Ambiguous Speech

Voice input:

```text
有点疼。
```

Expected:

- Agent asks a focused follow-up:
  - where hurts?
  - sharp or dull?
  - during which exercise?
  - does pain continue after stopping?
- Does not generate a random plan patch without context.

## 5. Vision / Pose Mock Tests

### TC-VISION-001: Mock Assessment Endpoint

Request:

```bash
curl -X POST http://127.0.0.1:8787/vision/assess \
  -H 'content-type: application/json' \
  -d '{"exercise":"高位下拉","media":"mock-frame"}'
```

Expected:

- HTTP 200.
- Assessment includes:
  - `shoulder_elevation`
  - `torso_swing`
  - `range_of_motion`
  - `fatigue_signal`
- Hermes returns `plan_patch`.
- Operation likely `update_cue`.

### TC-VISION-002: Camera Button

Steps:

1. Open `/training`.
2. Click `打开摄像头`.

Expected:

- Current mock vision path returns movement feedback.
- Current action cue is updated.
- No real pose SDK is required in first version.

## 6. Memory / Persistence Tests

### TC-MEM-001: Equipment Broken Candidate

Input:

```text
高位下拉坏了，今天不能用。
```

Expected:

- `plan_patch`.
- Replacement suggested.
- `memory_updates` includes equipment status candidate.
- Requires confirmation before writing long-term memory.

### TC-MEM-002: Equipment Repaired Candidate

Input:

```text
高位下拉修好了。
```

Expected:

- Memory update candidate restores availability.
- Does not create duplicate conflicting equipment states.

### TC-MEM-003: Crowd Observation

Input:

```text
晚上7点健身房人很多，经常排队。
```

Expected:

- Saved as observation candidate.
- Does not immediately become a hard planning rule.
- Response says more observations are needed before upgrading confidence.

### TC-MEM-004: Preference Update

Input:

```text
我不喜欢波比跳和高强度HIIT，但是如果确实有用可以先解释。
```

Expected:

- Preference memory candidate.
- Future plan avoids these by default.
- If used, reasoning must explain why.

### TC-MEM-005: Memory Confirmation

Request:

```bash
curl -X POST http://127.0.0.1:8787/memory/confirm \
  -H 'content-type: application/json' \
  -d '{"id":"<memory-update-id>"}'
```

Expected:

- Confirmation succeeds for an existing pending memory update.
- Long-term memory display updates.
- Non-existing id returns controlled error, not a crash.

### TC-MEM-006: Dynamic Memory Display Refresh

Requests:

```bash
curl -X POST http://127.0.0.1:8787/memory/refresh \
  -H 'content-type: application/json' \
  -d '{"reason":"page_open"}'
```

```bash
curl -X POST http://127.0.0.1:8787/memory/refresh \
  -H 'content-type: application/json' \
  -d '{"reason":"page_leave"}'
```

Expected:

- Response includes `display.updated_at`, `display.refresh_reason`, `display.headline`, `display.sections`, and `display.source_counts`.
- `page_open` refreshes before the Memory page renders its summary.
- `page_leave` refreshes the display cache for the next visit.
- Snapshot includes recent training cards, pending memory updates, risks, preferences, observations, equipment, and location notes where available.
- This refresh only updates the UI display cache; it does not write unconfirmed content into long-term Memory.

### TC-MEM-007: Preference Correction Replaces Old Preference

Input:

```text
我挺喜欢波比跳和高强度 HIIT 的。
```

Expected:

- Gateway creates pending `preference` memory updates even if Hermes only replies in natural language.
- Pending updates use `operation = replace`.
- After confirmation:
  - `不喜欢波比跳` is removed from `preferences`.
  - `不喜欢高强度 HIIT；如确有价值需先解释` is removed from `preferences`.
  - `喜欢波比跳` is added.
  - `喜欢高强度 HIIT` is added.
- Memory display refresh no longer shows contradictory old dislikes.

## 7. Settings / Provider Tests

Open:

```text
http://localhost:3000/settings
```

### TC-SETTINGS-001: Secret Hygiene

Expected:

- API keys are never displayed in plaintext.
- UI displays only `hasApiKey`.
- `GET /providers` and `GET /hermes-runtime` do not return secrets.
- Secrets live in `.runtime/secrets.env`, ignored by Git.

### TC-SETTINGS-002: Hermes Runtime CN Preset

Expected:

- Runtime panel shows:
  - `activePresetId = minimax-cn`
  - `provider = minimax-cn`
  - `model = MiniMax-M2.7-highspeed`
  - `baseUrl = https://api.minimaxi.com/anthropic`
  - `hasApiKey = true`

### TC-SETTINGS-003: Provider Switch Safety

Steps:

1. Keep Hermes Provider as `local-hermes`.
2. Send `今天该练什么？`.
3. Temporarily stop Hermes API Server.
4. Send `今天该练什么？` again.

Expected:

- Real mode uses Hermes API Server.
- If Hermes is unavailable, Gateway returns a controlled error.
- Gateway must not fall back to local Mock Hermes or template replies.

## 8. Negative / Failure Tests

### TC-NEG-001: Hermes Down

Steps:

1. Stop Hermes API Server.
2. Keep Gateway active provider as `local-hermes`.
3. Send `/chat`.

Expected:

- Controlled error from Gateway.
- Frontend should show a recoverable error.
- No crash and no invalid state overwrite.

### TC-NEG-002: Invalid JSON From Hermes

Method:

- Configure a real Hermes test endpoint or proxy to return prose or malformed JSON.

Expected:

- `parseHermesResponse` attempts JSON repair.
- If repair fails, Gateway returns controlled error.
- Frontend does not parse raw large natural-language text.

### TC-NEG-003: Missing ASR Key

Steps:

1. Temporarily unset ASR provider key in a test runtime root.
2. Call `/voice/transcribe`.

Expected:

- Provider test returns `ok = false`.
- Voice route returns clear error.
- Key is not requested by frontend directly.

## 9. Acceptance Matrix

Minimum acceptable first-version result:

| Area | Required pass |
|---|---|
| Automated tests | `npm test` passes |
| Real Hermes | `/v1/capabilities` 200 and `/chat` returns `training_plan` |
| Training UI | Generate plan and send text feedback |
| In-session adjustment | Equipment occupied, fatigue, cue feedback return `plan_patch` |
| Voice | Doubao provider health passes; browser recording reaches `/voice/transcribe` |
| Vision | Mock pose flow returns cue update |
| Training card | End session creates card visible in History |
| Memory | Memory updates are candidates requiring confirmation |
| Security | No API key in frontend responses or Git-tracked files |

## 10. Current Verified Result

As of 2026-05-13:

```text
npm test -> 36 passed, 0 failed
GET /v1/capabilities -> 200
POST /providers/hermes/test -> ok, local-hermes
POST /providers/asr/test -> ok, doubao-asr-flash
POST /chat "今天该练什么？" -> 200, training_plan, approximately 45s
```
