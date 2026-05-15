# Road to Summer Local Deployment Agent Handoff

Date: 2026-05-15  
Branch: `codex/phone`  
Repo: `https://github.com/Starryyu77/aicoach-codex`

## Purpose

This handoff is for another local coding agent that needs to deploy the phone training agent on a user's machine.

The product boundary is important: this is not a standalone phone app. The Gateway, provider calls, persistence, training-plan logic, and tests run locally on the user's computer. The phone UI at `/phone` is the front-end control surface.

The user only needs to provide:

- MiniMax API key for Hermes/coach generation.
- Doubao/Volcengine ASR API key for speech-to-text.

Do not ask for any extra cloud credentials unless the user explicitly wants a different provider.

## Copy This Prompt To The Local Deployment Agent

```text
You are deploying Starryyu77/aicoach-codex locally for a user. Treat the phone UI as a local front-end control surface: Gateway, training state, Hermes/MiniMax calls, ASR, and persistence all run on the user's computer.

Use repo https://github.com/Starryyu77/aicoach-codex on branch codex/phone.

Ask the user for exactly two secrets:
1. MiniMax API key. Use it for MINIMAX_CN_API_KEY.
2. Doubao/Volcengine ASR API key. Use it for DOUBAO_ASR_API_KEY.

Never paste or commit those keys into README, handoff docs, screenshots, or git history. Save them only through the Settings UI or local runtime secret storage.

Deployment steps:
1. git clone https://github.com/Starryyu77/aicoach-codex.git
2. cd aicoach-codex
3. git checkout codex/phone
4. Verify Node.js >= 25 and npm >= 11.
5. npm install
6. npm install --prefix road-to-summer/frontend
7. Start Gateway with npm run gateway. It should listen on http://127.0.0.1:8787.
8. Start frontend with npm run dev --prefix road-to-summer/frontend. It should listen on http://localhost:3000.
9. Open http://localhost:3000/settings.
10. Configure Hermes Runtime Model as MiniMax CN for Hermes.
11. Configure Hermes Provider as MiniMax CN Hermes Direct / minimax-cn-hermes and set it active. Use the MiniMax key. This direct path does not require running a separate local Hermes API Server.
12. Configure ASR Provider as Doubao ASR Flash / doubao-asr-flash and set it active. Use the Doubao/Volcengine ASR key.
13. Leave Vision Provider as mock-vision unless the user has a real vision provider ready.
14. Open http://localhost:3000/phone and validate: new conversation, generate plan, send text feedback, navigate to history and back, refresh, finish session, verify history card, test voice transcription.

Do not enable mock Hermes as a successful /chat path. If MiniMax/Hermes fails, surface the real provider error and do not create a fallback local plan.

Before declaring success, run:
- npm test
- npm run build --prefix road-to-summer/frontend
```

## Expected Local Architecture

- Gateway: `npm run gateway`, default `http://127.0.0.1:8787`.
- Frontend: `npm run dev --prefix road-to-summer/frontend`, default `http://localhost:3000`.
- Phone UI: `http://localhost:3000/phone`.
- Settings UI: `http://localhost:3000/settings`.
- Local runtime state: `road-to-summer/gateway/state`.
- Local secrets/runtime config: `.runtime/` and `.runtime/secrets.env`.

Never commit `.runtime/` or secret-bearing files.

## Recommended Provider Setup

Use the direct MiniMax provider for the low-friction path:

- Hermes Runtime Model: `MiniMax CN for Hermes`.
- Hermes Provider: `MiniMax CN Hermes Direct` (`minimax-cn-hermes`).
- Hermes API key reference: `MINIMAX_CN_API_KEY`.
- ASR Provider: `Doubao ASR Flash` (`doubao-asr-flash`).
- ASR API key reference: `DOUBAO_ASR_API_KEY`.
- Vision Provider: `mock-vision` unless the user specifically provides a real vision provider.

This is enough for:

- Text conversation.
- Training plan generation.
- Training plan updates from chat feedback.
- History persistence.
- Speech-to-text from the phone composer.

The separate local Hermes API Server path is optional. Only use it if the user explicitly wants a custom local Hermes runtime.

## Optional API Configuration Commands

Prefer the Settings UI for humans. If an agent needs to configure through the Gateway API after `npm run gateway` is running, use placeholders and do not persist these commands with real keys:

```bash
curl -s -X PUT http://127.0.0.1:8787/hermes-runtime \
  -H 'content-type: application/json' \
  -d '{"activePresetId":"minimax-cn","apiKey":"<MINIMAX_CN_API_KEY>"}'

curl -s -X POST http://127.0.0.1:8787/providers/hermes/instances \
  -H 'content-type: application/json' \
  -d '{"id":"minimax-cn-hermes","label":"MiniMax CN Hermes Direct","type":"anthropic-compatible-hermes","baseUrl":"https://api.minimaxi.com/anthropic","model":"MiniMax-M2.7-highspeed","apiKey":"<MINIMAX_CN_API_KEY>","timeoutMs":90000,"extra":{"maxTokens":3072}}'

curl -s -X PUT http://127.0.0.1:8787/providers/hermes/active \
  -H 'content-type: application/json' \
  -d '{"id":"minimax-cn-hermes"}'

curl -s -X POST http://127.0.0.1:8787/providers/asr/instances \
  -H 'content-type: application/json' \
  -d '{"id":"doubao-asr-flash","label":"Doubao ASR Flash","type":"doubao-asr","baseUrl":"https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash","model":"bigmodel","apiKey":"<DOUBAO_ASR_API_KEY>","timeoutMs":60000,"extra":{"resourceId":"volc.bigasr.auc_turbo","authMode":"auto","enableItn":true,"enablePunc":true}}'

curl -s -X PUT http://127.0.0.1:8787/providers/asr/active \
  -H 'content-type: application/json' \
  -d '{"id":"doubao-asr-flash"}'
```

## Validation Checklist

Run these commands:

```bash
npm test
npm run build --prefix road-to-summer/frontend
```

Manual validation:

1. Open `/phone`.
2. Click new conversation.
3. Generate a training plan with text input.
4. Send feedback such as `太轻了` and verify the current plan changes, not only the chat text.
5. Send `把当前动作换成台阶上步` and refresh; the current plan should still show the updated action.
6. Navigate `/phone -> /history -> /phone`; chat messages and current plan should persist.
7. Finish the training session; the current plan dock should disappear.
8. Open `/history`; the finished training card should exist.
9. Return to `/phone` and refresh; the ended plan should not come back.
10. Test voice transcription from the composer. The transcribed text should be user-confirmed input, not automatic long-term memory.

Acceptance criteria:

- `/chat` does not succeed through mock Hermes.
- Provider failures show errors and do not create fallback plans.
- No `[object Object]` appears in the phone UI.
- Console has no React duplicate-key warnings during the tested flows.
- API keys are not committed and are not visible in docs.

## Troubleshooting

- If install or build fails, check Node.js first. This branch expects Node.js 25+ and npm 11+.
- If Gateway is unreachable, confirm `npm run gateway` is still running and port `8787` is free.
- If the frontend is unreachable, confirm `npm run dev --prefix road-to-summer/frontend` is running and note the port printed by Next.js.
- If MiniMax returns 401/403, confirm the key belongs to the MiniMax CN endpoint and is configured for `https://api.minimaxi.com/anthropic`.
- If Doubao ASR fails, confirm whether the user's credential is the new single `X-Api-Key` style key or an older `appKey:accessKey` credential. The provider has `authMode: auto`, but the raw key still needs to be valid for the ASR Flash endpoint.
- If voice upload is denied by the browser, check microphone permission for the local browser profile.
- If an old plan appears after restart, use the app's new conversation/reset flow first. Do not manually edit state files unless debugging.

## What Not To Do

- Do not add fallback training-plan templates for provider failure.
- Do not commit `.runtime/`, `secrets.env`, copied API keys, screenshots containing keys, or local state from another user.
- Do not treat the phone UI as the compute/runtime layer.
- Do not ask the user to provide GitHub, OpenAI, or vision keys unless they specifically choose those providers.
