# Hermes Extension Implementation

Updated: 2026-05-14

## Current State

The project now includes a `road-to-summer/` implementation layer for the Hermes-based direction and a configurable real-provider Gateway layer. As of 2026-05-13, the local runtime has been verified in real Hermes + MiniMax mode.

This layer keeps Hermes as the intended runtime owner for Agent Runtime, Memory, Sessions, Skills, Tools, model calls, and long-term learning. Road to Summer adds the fitness Skill Pack, UI Gateway, Training Cockpit frontend shell, ASR mock, Vision/Pose mock, structured output contract, and training card cache.

## Added Structure

```text
road-to-summer/
  hermes-extension/skills/road_to_summer/
  gateway/
  frontend/
  tools/pose-tool/
  docs/
```

## Real Implementation

- Hermes Skill Pack files:
  - `SOUL.md`
  - `SKILL.md`
  - `training_rules.md`
  - `output_contract.md`
  - `exercise_cues.md`
  - `memory_policy.md`
  - `risk_policy.md`
  - `workflow.md`
- Gateway:
  - Provider config store and registry.
  - Hermes Runtime model config stored separately from Gateway provider config.
  - Provider presets for in-project setup.
  - Hermes providers: mock, Hermes API Server, OpenAI-compatible Hermes.
  - ASR providers: mock, OpenAI Whisper, Groq Whisper, Local Whisper, Doubao ASR Flash.
  - Vision providers: mock and external pose HTTP.
  - Hermes message builder.
  - JSON parser / validator.
  - UI mapper.
  - Native HTTP server.
  - Route handlers for chat, voice, vision, session, history, memory, and providers.
  - Lightweight file stores only.
- Frontend:
  - Training Cockpit.
  - Current plan card.
  - Current exercise card.
  - Chat panel.
  - Voice and camera buttons.
  - Quick actions.
  - History list.
  - Memory panel.
  - Provider Settings page.
  - Hermes Runtime Model settings panel.
  - Quick provider templates in Settings.
  - Browser recording flow for voice input.

## Mocked Pieces

- Active Hermes provider is now locally configured as `local-hermes` with a 180s timeout.
- Hermes API Server is launched from `.runtime/upstream/hermes-agent` using `uv run --project .runtime/upstream/hermes-agent hermes gateway run --accept-hooks`.
- Hermes API Server listens on `http://127.0.0.1:8642/v1`.
- Hermes Runtime is configured locally for MiniMax CN through `.runtime/hermes-runtime.json` plus `.runtime/secrets.env`; the frontend only sees `hasApiKey`.
- The working MiniMax route is `minimax-cn / MiniMax-M2.7-highspeed / https://api.minimaxi.com/anthropic`.
- The previously attempted global endpoint `https://api.minimax.io/anthropic` rejected this Token Plan key with 401; this key belongs to the CN endpoint.
- Active ASR provider is configured locally as `doubao-asr-flash`; the API key is stored only in `.runtime/secrets.env`.
- Real Hermes API Server provider is implemented against `/v1/chat/completions`; it uses `/v1/capabilities` for connection tests.
- Road to Summer skill pack is installed into local Hermes at `~/.hermes/skills/road_to_summer/`.
- Hermes API Server required `aiohttp==3.13.3`; it was installed into the local upstream Hermes `.venv`.
- OpenAI Whisper ASR is implemented.
- Doubao ASR Flash is implemented against Volcengine `POST /api/v3/auc/bigmodel/recognize/flash`; supports new-console single API key and old-console `appKey:accessKey`.
- Vision/Pose default remains mock; external HTTP provider is implemented.
- Frontend deployment/runtime dependencies.

## Hermes Upstream Reference

NousResearch `hermes-agent` was cloned to:

```text
.runtime/upstream/hermes-agent
```

The source confirms:

- API Server adapter: `gateway/platforms/api_server.py`.
- Default API server target: `http://127.0.0.1:8642/v1`.
- Supported endpoints include `/v1/chat/completions`, `/v1/responses`, `/v1/models`, `/v1/capabilities`, `/v1/runs`.
- Session and memory scoping headers are `X-Hermes-Session-Id` and `X-Hermes-Session-Key`.
- Hermes skills use YAML frontmatter in `SKILL.md`; current Road to Summer skill already has basic frontmatter.

## Verification

```text
npm test -> 36 passed, 0 failed
```

Real-mode smoke test:

```text
POST /chat
input: 今天该练什么？
active Gateway provider: local-hermes
Hermes runtime: minimax-cn / MiniMax-M2.7-highspeed
result: 200 OK, type=training_plan, duration approximately 45s
```

## 2026-05-13 Real Test Run

Report:

```text
road-to-summer/docs/test_run_2026-05-13_real_integration.md
```

Results:

- `npm test -> 36 passed, 0 failed`.
- `npm run build --prefix road-to-summer/frontend -> passed`.
- Real provider health passed for `local-hermes` and `doubao-asr-flash`.
- Real `/chat` plan generation returned `training_plan`.
- Equipment occupied returned `plan_patch / replace_exercise`.
- Target muscle cue returned `plan_patch / update_cue`.
- Vision mock returned `plan_patch / update_cue`.
- Session completion returned `training_card`, and History read returned saved cards.

Fix from test:

- Frontend now supports mixed `PlanSection.items` shapes (`PlanItem | string`) because real Hermes may return warmup strings and main-training objects.

Open issue:

- Fatigue handling is still too shallow in real Hermes output. It avoids immediately ending training but does not explicitly evaluate local vs systemic fatigue, pain/dizziness, completion stage, and movement quality. Strengthen `road_to_summer` skill prompts and rules.
- UX/state issues identified after first real UI test:
  - Training Cockpit should not auto-generate a plan on page entry; plan generation must be an explicit user action.
  - Plan cards need a visible "generation basis" area so users can see why Hermes generated the plan.
  - Warmup or other string-only plan items from real Hermes must render as readable structured notes.
  - History page must show where structured training card JSON files are saved.
  - `plan_patch` responses must update persisted `current_plan.json` and `current_session.json`, including `current_exercise`.
  - Frontend refresh must hydrate from `/session/current` instead of losing all page state.
- Follow-up UX requirement:
  - Chat and plan text should support Markdown display rather than plain text only.
  - Training cards should be saved and rendered as sectioned Markdown, not raw JSON blobs.
  - History cards must support deletion; deleting a card removes both the JSON cache and Markdown cache.
  - Non-home frontend pages need a visible return/home navigation path; users should not need the browser chrome to leave Training, History, Memory, or Settings.

## 2026-05-14 Time Context Update

Implemented a first-class time layer across Gateway, Skill Pack, and frontend:

- Gateway now builds `time_context` for every chat and vision request.
- `time_context` includes timezone, absolute today date, target date, date label, offset, temporal intent, and mentioned date terms.
- Relative date parsing covers 今天, 明天, 后天, 昨天, 前天, 前两天, 两天前, and explicit ISO / 月日 dates.
- `buildHermesMessage.ts` instructs Hermes to use `time_context` as the only date source.
- Training plans now carry `plan_card.target_date`, `date_label`, and `timezone`.
- Training cards now carry `date`, `date_label`, `timezone`, and `completed_at`.
- Gateway normalizes plan/card date fields before saving UI state or history, so real Hermes cannot silently save a backfilled card under the wrong date.
- Training Cockpit now has a target date control with quick choices for 今天, 明天, 前天.
- Chat placeholder now explicitly supports examples like "明天该练什么" and "前天练完帮我补记录".
- Skill Pack docs now define temporal rules for future planning and backfilled logs.

Verification:

```text
npm test -> 45 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
git diff --check -> clean
```

Follow-up fix after manual 5/13 backfill test:

- Latest card `card-1778724577657` had correct training content but was saved as `2026-05-11 / 3 天前`.
- The root cause was stale selected/session date overriding the intended natural-language date.
- `time_context` now includes `date_source` and optional `date_conflict`.
- Explicit text dates and relative text dates override stale UI selected dates.
- Skill Pack now instructs Hermes to classify `future_training_plan`, `backfill_training_log`, `current_session_update`, and `in_session_adjustment` before choosing output type.
- Added regression tests for `5月13日我练了下肢，帮我记录一下。` overriding stale `target_date = 2026-05-11`.
- Corrected local runtime card `card-1778724577657` to `2026-05-13 / 昨天` and regenerated its Markdown.

Verification after follow-up:

```text
npm test -> 48 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
git diff --check -> clean
```

## 2026-05-14 Scenario Test Follow-up

Manual scenario testing found one more classification issue:

- Backfill text such as "5月10日我做了上肢训练...最后有点累，帮我补录到历史记录" originally matched fatigue before backfill and returned `plan_patch`.
- Fixed by raising `backfill_training_log` priority above fatigue/equipment/action feedback handling.
- Added `training_review` output type for pure historical review.
- Pure review now returns `training_review` and does not create a new training card.
- Skill Pack was synced to `~/.hermes/skills/road_to_summer/`.

Isolated scenario test results:

```text
补录训练 -> training_card, date=2026-05-10, history_delta=1
提前规划 -> training_plan, target_date=2026-05-16, history_delta=0
单日复盘 -> training_review, scope=single_day, history_delta=0
系列复盘 -> training_review, scope=recent_series, sessions=2, history_delta=0
```

Real Hermes checks:

```text
local-hermes capabilities -> ok
真实 Hermes 单日复盘 -> training_review, referenced card-1778724577657, history count 3 -> 3
真实 Hermes 补录 in temp state -> training_card, date=2026-05-10, history_delta=1
真实 Hermes 提前规划 in temp state -> training_plan, target_date=2026-05-16, history_delta=0
真实 Hermes 系列复盘 -> training_review, history count 3 -> 3
```

Verification after scenario follow-up:

```text
npm test -> 50 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
```

Gateway tests cover:

1. Preworkout `training_plan`.
2. Equipment occupied `plan_patch`.
3. Equipment broken memory update.
4. Equipment repaired memory confirmation.
5. Fatigue feedback without immediate stop.
6. Target-muscle cue update.
7. Vision assessment -> movement correction patch.
8. Session end -> saved training card and history listing.
9. Voice mock transcription.
10. Provider registry.
11. Provider config and secret separation.
12. Hermes API Server provider request shape and capability test.
13. OpenAI Whisper provider request shape.
14. Provider route handlers.
15. Doubao ASR Flash request shape.
16. Hermes Runtime MiniMax config and secret separation.

## Next Step

Next operational step: keep both local processes running when testing the UI:

```text
npm run gateway
npm run dev --prefix road-to-summer/frontend
set -a; . .runtime/secrets.env; set +a; API_SERVER_ENABLED=true API_SERVER_HOST=127.0.0.1 API_SERVER_PORT=8642 API_SERVER_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 uv run --project .runtime/upstream/hermes-agent hermes gateway run --accept-hooks
```

- `buildHermesMessage.ts`
- `parseHermesResponse.ts`
- `validateAgentOutput.ts`
- `mapAgentOutputToUi.ts`
- `output_contract.md`
