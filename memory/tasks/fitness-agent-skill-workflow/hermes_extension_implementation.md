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
  - Hermes providers: Hermes API Server and OpenAI-compatible Hermes. Training `/chat` rejects mock Hermes providers.
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

## Runtime / Provider Status

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
- Production Gateway `/chat` no longer imports, calls, or falls back to a local Mock Hermes/template coach. If real Hermes fails or is misconfigured, the route returns a controlled error instead of fabricating a training reply.

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

## 2026-05-14 Training Session Flow Follow-up

Fixed the live training cockpit feedback loop after testing the user flow:

- Gateway session flow now treats positive no-pain feedback as current-step completion:
  - `我感觉很好，没有任何酸痛`
  - `状态不错`
  - `没有不适`
  - `没有疼痛`
  - `可以继续`
- Risk phrases still stay out of auto-advance, so `有点疼` / `头晕` / `不舒服` should continue into the risk/fatigue path rather than silently completing a set.
- `CurrentExerciseCard` now exposes visible current-step actions next to the current exercise:
  - `完成本组`
  - `感觉很好，无酸痛`
  - `有点累`
  - `有点疼`
- This fixes the mismatch where the agent told the user to click `完成本组` while the current-action card itself had no such button.

Verification:

```text
npm test -> 71 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
npm run dx:smoke -> 5 passed, 0 failed
Live /chat sequence:
  今天该练什么？
  OK，我们开始训练吧
  我感觉很好，没有任何酸痛
Result:
  current exercise advanced from 下肢恢复状态快速检查 to 肩颈与肩胛状态检查
  no generic clarification response
```

## 2026-05-14 Natural In-session Dialogue Fix

Fixed the bad taxonomy fallback where training-session messages like `太轻了` returned:

```text
我已收到反馈。请确认这是器械、疲劳、疼痛、动作感受，还是训练结束。
```

Updated layers:

- `buildHermesMessage.ts` now explicitly tells Hermes to treat ordinary natural-language training feedback as in-session coaching input when `expectedType = plan_patch`.
- `HermesApiServerProvider.ts` system prompt now forbids the taxonomy prompt and maps common Chinese training phrases directly to patch operations.
- `SKILL.md`, `dynamic_coaching.md`, and `output_contract.md` now document natural-language in-session handling as part of the Skill, not as a frontend hack.
- Follow-up boundary update:
  - Production `/chat` now requires a real Hermes provider.
  - The local Mock Hermes/template coach path has been removed from production Gateway code.
  - Tests use a test-only fake client under `tests/support` to keep deterministic regression coverage without affecting runtime behavior.

## 2026-05-14 Real Hermes Only Boundary

Locked the training dialogue boundary so user-facing coaching replies come from real Hermes/LLM output:

- `road-to-summer/gateway/src/hermes/HermesClient.ts` now only defines the Hermes client interface.
- Removed the production `MockHermesProvider` implementation.
- Removed the unused production `training/sessionFlow.ts` local session-template path.
- `ProviderRegistry` rejects Hermes provider instances with `type: "mock"`.
- `/chat` and `/vision/assess` reject active mock Hermes providers instead of calling or falling back to them.
- The old deterministic coach replies were moved to `tests/support/TestHermesClient.ts` as a test-only fake.
- `parseHermesResponse` now performs structure-only normalization for real Hermes shorthand outputs, such as bare `operation/target_exercise` objects or nested `{ "plan_patch": ... }`; it does not generate local coach content.

Verification:

```text
npm test -> 74 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
npm run dx:smoke -> 5 passed, 0 failed
Live providers: hermes:local-hermes, asr:doubao-asr-flash, vision:mock-vision
```
  - `这个动作我不会做` -> `update_cue`.
  - `有点晃/不稳` -> stabilization cue.
  - Unknown feedback no longer asks the user to classify; it stays on the current exercise and asks for natural-language detail.

Verification:

```text
npm test -> 73 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
npm run dx:smoke -> 5 passed, 0 failed
Live /chat:
  太轻了 -> plan_patch / adjust_load, no taxonomy prompt
  这个动作我不太会做 -> plan_patch / update_cue, no taxonomy prompt
```

## 2026-05-14 A2UI-inspired Agent UI Layer

Added a controlled Agent UI JSON layer inspired by Google's A2UI pattern.

Reference idea:

- Agent/UI output should be declarative JSON, not generated frontend code.
- The client owns a trusted component catalog.
- Agent output is rendered by mapping JSON component descriptions to local components.

Implementation:

- Gateway now compiles every normalized Hermes domain output into `ui.agent_ui`.
- Current schema version: `rts-a2ui-0.1`.
- New Gateway file:
  - `road-to-summer/gateway/src/ui/agentUi.ts`
- New Frontend renderer:
  - `road-to-summer/frontend/src/components/AgentUiRenderer.tsx`
- New docs:
  - `road-to-summer/docs/agent_ui_schema.md`

Current allowlisted components:

```text
surface
section
coach_message
plan_summary
plan_sections
current_exercise
patch_card
training_card
memory_updates
action_row
```

Policy:

- Hermes still returns domain JSON: `training_plan`, `plan_patch`, `training_card`, or `training_review`.
- Gateway compiles domain JSON into Agent UI JSON.
- Frontend renders only allowlisted local components.
- No arbitrary HTML, JavaScript, iframe, or model-generated code execution.
- Future work can allow Hermes to return optional direct `agent_ui`, but only after the same validation.

Verification:

```text
npm test -> 75 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
npm run dx:smoke -> 5 passed, 0 failed
Live /chat:
  今天该练什么？ -> ui.agent_ui.version = rts-a2ui-0.1, includes plan_sections/action_row
  太轻了 -> ui.agent_ui.version = rts-a2ui-0.1, includes patch_card/current_exercise/action_row
```

## 2026-05-14 Official Source Trace

Implemented visible official-source attribution for training-plan decisions.

Changes:

- Added `official_sources.md` to the Road to Summer Skill Pack.
- `output_contract.md` now requires `plan_card.official_source_trace` for training plans.
- `SKILL.md`, `workflow.md`, and `framework_integration.md` now distinguish:
  - `framework_trace`: what the agent decided.
  - `official_source_trace`: which official model/source supports that type of decision.
- `PlanCard` now supports `official_source_trace`.
- Mock plan generation now emits visible source traces for:
  - NASM OPT Model
  - ACE IFT Model
  - NSCA Program Design / frequency and load management
  - ACSM 2026 Resistance Training Guidelines Update
  - NSCA RPE/RIR Autoregulation reference
- Gateway Hermes prompts now instruct real Hermes to return `official_source_trace`.
- Frontend `CurrentPlanCard` now renders an "官方依据" section with framework, model, source URL, source location, principle, applied decision, and why it matters.
- Added regression coverage in `tests/skillFrameworks.test.mjs` and `tests/hermesGateway.test.mjs`.
- Synced updated Skill Pack to local Hermes at `~/.hermes/skills/road_to_summer/`.

Verification:

```text
npm test -> 65 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
git diff --check -> clean
```

## 2026-05-14 Exercise Selection Skill Integration

Integrated the two new skill ideas from:

- `/Users/starryyu/Downloads/AI健身教练动作选择与计划编排Skill_v2.md`
- `/Users/starryyu/Downloads/AI健身教练动态带训Skill_v1.md`

Changes:

- Added explicit Skill Pack files:
  - `road-to-summer/hermes-extension/skills/road_to_summer/exercise_selection.md`
  - `road-to-summer/hermes-extension/skills/road_to_summer/dynamic_coaching.md`
- Updated `SKILL.md`, `SOUL.md`, `workflow.md`, `training_rules.md`, and `output_contract.md` so Hermes must use:
  - goal -> target adaptation -> movement pattern -> candidate pool -> constraints -> exercise role -> variables
  - readiness levels for green/yellow/orange/red
  - next-best-session logic from recent training cards
  - per-exercise role, movement pattern, target muscles, selection reason, common mistakes, adjustment rule, and substitutions
- Added a Gateway-side lightweight `exerciseSelection` context builder so Hermes receives explicit candidate roles, movement patterns, constraints, and framework context instead of inventing from a blank prompt.
- `buildHermesMessage` now sends `exercise_selection_context` to Hermes.
- Production Gateway no longer composes final user-facing plans locally; real Hermes must return the plan JSON.
- Training plan UI now displays exercise role, movement pattern, selection reason, and adjustment rule.
- Fixed readiness parsing so `无疼痛` is not classified as pain/red readiness.
- Synced the updated Road to Summer Skill Pack to local Hermes at `~/.hermes/skills/road_to_summer/`.

Verification:

```text
npm test -> 61 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
git diff --check -> clean
npm run dx:smoke -> now checks the live Gateway `/chat` path against real Hermes instead of an in-process mock.
```

## 2026-05-14 Five-Framework Skill Split

Added five complementary training-framework skill modules and one integration module:

- `framework_nasm_opt.md`: phase and progression/regression logic.
- `framework_ace_ift.md`: user-centered starting point, confidence, preference, and adherence logic.
- `framework_nsca_program_design.md`: session structure, exercise order, frequency, recovery windows, and total load.
- `framework_acsm_resistance_training_2026.md`: outcome-to-variable mapping for strength, hypertrophy, power, endurance, and physical function.
- `framework_autoregulation.md`: RPE/RIR-based load, reps, sets, rest, substitution, and stop/continue decisions.
- `framework_integration.md`: ownership map, decision order, and conflict-resolution rules.

Integration changes:

- `SKILL.md`, `workflow.md`, `training_rules.md`, and `output_contract.md` now require the five-framework bridge.
- `buildHermesMessage` instructs Hermes to use ACE IFT, NASM OPT, NSCA Program Design, ACSM 2026, and RPE/RIR Autoregulation together.
- `HermesApiServerProvider` system prompt now reinforces the same framework bridge for real Hermes calls.
- `PlanCard` now supports `framework_trace`.
- Mock plan generation and plan-quality recovery plans now populate `framework_trace`.
- Frontend `CurrentPlanCard` renders a "框架判断" section.
- Added `tests/skillFrameworks.test.mjs` to lock the skill module split and integration contract.
- Synced the updated Skill Pack to local Hermes at `~/.hermes/skills/road_to_summer/`.

Verification:

```text
npm test -> 64 passed, 0 failed
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

## 2026-05-14 Editable History Update

Implemented editable historical training card metadata:

- Added `PUT /history/:id`.
- `updateTrainingCard` edits the file-backed JSON card and regenerates the paired Markdown file.
- Editable fields: `date`, `date_label`, `timezone`, `theme`, `location`, `duration`.
- Date validation requires `YYYY-MM-DD`.
- History list now sorts cards by training `date` descending, then id.
- Frontend history cards have an `编辑` mode with date, date label, timezone, theme, location, and duration fields.

Verification:

```text
npm test -> 52 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
git diff --check -> clean
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

## 2026-05-14 Dynamic Memory Display Update

Implemented a file-backed Memory display snapshot layer:

- Added `memory_display.json` as UI display cache under the Gateway state root.
- Added `POST /memory/refresh` with refresh reasons such as `page_open`, `page_leave`, `manual`, and `memory_confirm`.
- Memory page now refreshes the display snapshot when opened, sends a lightweight refresh when leaving, and supports manual `立即整理`.
- Snapshot summarizes recent training cards, current session direction, pending memory updates, confirmed updates, risks, preferences, observations, equipment, and location notes.
- This only updates the presentation cache. Long-term Memory writes still require explicit confirmation.

Verification target:

```text
npm test -> 53 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
git diff --check -> clean
```

## 2026-05-14 Preference Memory Correction Update

Fixed a Memory semantics bug:

- Previously, confirming a Memory update only moved it from `pending_updates` to `confirmed_updates`.
- Confirmed preference changes now actually update the structured `preferences` array.
- Explicit preference corrections such as `我挺喜欢波比跳和高强度 HIIT 的` now create structured pending updates with:
  - `category = preference`
  - `operation = replace`
  - `key`
  - `value`
  - `remove_values`
- Confirming those updates removes contradictory old dislikes and inserts the new positive preference.
- Gateway also creates preference update candidates from explicit user text, so the UI is not dependent on Hermes remembering to emit `memory_updates`.

Verification:

```text
npm test -> 54 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
git diff --check -> clean
```

## 2026-05-14 Plan Quality Guard Update

Fixed plan-generation quality issues:

- Added Gateway plan quality analysis for recent training cards.
- The Gateway now infers recent muscle groups from the last 1-5 training cards and checks the target-date plan against recent shoulder/back/chest/lower/glute/core load.
- If a generated plan conflicts with recent recovery windows, it is converted into a recovery / mobility / functional-maintenance plan before reaching the frontend.
- Exact duplicate exercises are removed before saving `current_plan.json`.
- `PlanCard` now supports:
  - `decision_basis`
  - `recent_training_summary`
  - `quality_warnings`
- `CurrentPlanCard` displays recent training sources and plan self-check warnings, so the user can see why the plan was chosen.
- Skill Pack now explicitly requires recent-training conflict checks, plan dedupe, and scoped competitor/product discussion.

Key scenario covered:

```text
2026-05-12 上肢推拉综合 · 胸背肩
2026-05-13 下肢综合 · 腿+臀
2026-05-14 用户问：今天该练什么？
Expected: recovery / mobility / functional-maintenance plan, not chest/back/shoulder or heavy lower body.
```

Verification:

```text
npm test -> 55 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
git diff --check -> clean
```

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

## 2026-05-14 Real Hermes Timeout UX Update

Fixed a real-provider timeout UX issue:

- The active `local-hermes` provider timeout was raised from 180s to 420s because true Hermes + MiniMax planning can exceed 3 minutes.
- `HermesApiServerProvider` now normalizes aborted/timeout fetch failures into a readable configuration error instead of leaking the raw `The operation was aborted due to timeout` message.
- Frontend API helpers now unwrap Gateway `{ "error": "..." }` responses before throwing.
- Training Cockpit catches chat/session/camera failures and renders them as agent messages plus status text, instead of allowing Next.js to show a runtime overlay.

Operational note:

- If a real Hermes request still exceeds 420s, the UI should remain usable. Increase the provider `timeoutMs` in Settings or narrow the request.

Follow-up adjustment:

- Added a Gateway soft timeout for `/chat`: if real Hermes does not return within 45s, Gateway returns a local Road to Summer structured fallback instead of keeping the frontend waiting for the hard provider timeout.
- Added regression tests for provider failure and soft-timeout fallback.
- Changed the official-source UX:
  - `official_source_trace` remains machine/audit data.
  - User-facing explanation now belongs in Chinese `chat_message` and each exercise item's `source_note`.
- The Training Cockpit no longer renders a separate "官方依据" reference block.
- Plan items now render inline coach-style source notes such as "教练依据：这里参考 NSCA 的训练结构原则..."
- Follow-up UX cleanup: the soft-timeout fallback no longer exposes "真实 Hermes / 本地结构化版本 / soft timeout" in the user-facing chat message. It returns the same coach-style Chinese plan and keeps technical fallback details out of the training conversation.

Verification:

```text
npm test -> 67 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
npm run dx:smoke -> 5 passed, 0 failed
Live POST /chat with active local-hermes -> 200 OK after 45068ms, returned training_plan fallback with Chinese coach explanation and per-exercise source_note.
```

## 2026-05-14 Training Session Flow Update

Fixed the in-session dialogue flow:

- Added a Gateway-side training session state machine for clear coaching events.
- `开始训练 / OK，我们开始训练吧` now starts the first current exercise instead of falling into generic intent clarification.
- `完成本组 / 做完了 / 我做了...` now advances current set or current exercise based on the current plan.
- If the user says they completed multiple check items in one sentence, the session advances past all mentioned completed checks.
- `current_session.current_exercise`, `current_set`, `phase`, and `progress` are persisted and returned to the frontend.
- Current Exercise Card now displays phase, current set / total sets, and progress.
- Quick actions now include `开始训练`.

Verification:

```text
npm test -> 70 passed, 0 failed
npm run build --prefix road-to-summer/frontend -> passed
npm run dx:smoke -> 5 passed, 0 failed
Live flow:
  今天该练什么？ -> training_plan, current=下肢恢复状态快速检查
  OK，我们开始训练吧 -> plan_patch, current=下肢恢复状态快速检查, progress=动作 1/6 · 下肢恢复状态快速检查 · 第 1/1 组
  我做了下肢恢复检查...肩胛和肩颈状态也没有任何问题 -> plan_patch, current=全身活动度循环, progress=动作 3/6 · 全身活动度循环 · 第 1/3 组
```

## 2026-05-14 Modular Development Template Update

Added a project-level modular development template:

```text
road-to-summer/docs/modular_development_template.md
```

Purpose:

- Make future changes layer-addressable instead of scattered across Skill, Gateway, Frontend, and tests.
- Keep Hermes as the runtime owner while Road to Summer owns the fitness skill pack, provider adapters, UI shell, output contract, and file-backed UI state.
- Define repeatable templates for new Skill workflows, frontend modules, Gateway features, Memory features, providers, and output types.

Key layer map:

```text
L0 Product Boundary
  -> L1 Hermes Skill Pack
  -> L2 Output Contract
  -> L3 UI Gateway Adapter
  -> L4 File-backed UI State
  -> L5 Frontend Experience
  -> L6 Provider Integrations
  -> L7 Tests / Docs / Runtime Ops
```

Updated docs:

- `road-to-summer/docs/architecture.md` now points to the modular template as the main development entrypoint.
- `road-to-summer/docs/frontend_spec.md` now defines component layers, recommended props, and design rules for the Training Cockpit, History, Memory, and Settings pages.

Development rule going forward:

- Classify each request as Skill / Contract / Gateway / Frontend / Provider / Memory / Ops before editing.
- If an output type changes, update Skill contract, Gateway validation/mapping, Frontend types/components, and tests together.
- If UI state or memory behavior changes, distinguish training cards, pending memory updates, and display snapshots.
- Continue avoiding databases, traditional backend expansion, SaaS features, coach workbench, CRM, scheduling, payments, and Hermes Runtime rewrites.

## 2026-05-14 DX Quick Start Update

Implemented the P0 developer-experience fixes from the live DX audit:

- Added `npm run dx:smoke`.
  - Checks Node version.
  - Checks live Gateway `/session/current`.
  - Checks live Frontend `/training`.
  - Checks `/providers` and verifies the public provider config does not expose plaintext API keys.
  - Runs an in-process mock `/chat` path and requires a structured `training_plan`.
- Rewrote README Quick Start into a cold-start path:
  - Node / npm requirement.
  - Root install.
  - Frontend install.
  - CLI validation.
  - Gateway startup.
  - Frontend startup.
  - `dx:smoke`.
  - Optional real Hermes / ASR setup through Settings.
- Gateway startup now handles `EADDRINUSE` with a clear message:
  - how to verify the existing service,
  - how to stop it,
  - how to run on another port through `GATEWAY_PORT`.
- CLI now has real developer commands:
  - `npm run cli -- --help`
  - `npm run cli -- examples`
  - `npm run cli -- doctor`
- Root Node engine is aligned to `>=25`, matching the Gateway's direct TypeScript runtime path.
- Added CLI DX tests so `--help` cannot regress into a parsed training input again.

Verification:

```text
npm test -> 58 passed, 0 failed
npm run cli -- --help -> prints CLI help
npm run cli -- examples -> prints example prompts
npm run cli -- doctor -> all local CLI checks pass
npm run dx:smoke -> 5 passed, 0 failed
npm run gateway -- --help while 8787 is occupied -> friendly EADDRINUSE message, no Node stack trace
npm run build --prefix road-to-summer/frontend -> passed
git diff --check -> clean
```
