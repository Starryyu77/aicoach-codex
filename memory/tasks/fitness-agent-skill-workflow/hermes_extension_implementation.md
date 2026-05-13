# Hermes Extension Implementation

Updated: 2026-05-13

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
