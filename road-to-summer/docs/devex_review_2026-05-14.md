# DX Live Audit 2026-05-14

Target: Road to Summer / Hermes Fitness Agent Extension

Branch: `main`

Base branch: `main`

Method: local README onboarding, CLI commands, Gateway API calls, local frontend pages through gstack browse, real provider smoke checks.

No prior `/plan-devex-review` baseline was found, so there is no boomerang comparison.

## Summary

Overall DX score: `5.3 / 10`

The core product works. The developer path is not yet clean enough for an outside expert to clone, run, understand, and safely change without handholding.

The biggest issue is not missing capability. It is missing a golden path. The repo has working pieces, but the first-time developer has to infer install steps, active runtime state, port ownership, provider mode, and which docs are source of truth.

## Evidence

Commands tested:

```bash
npm run cli -- "今天该练什么？"
npm run cli -- --help
npm run cli
npm test
npm run build --prefix road-to-summer/frontend
npm run gateway
npm run dev --prefix road-to-summer/frontend
curl http://127.0.0.1:8787/providers
curl -X POST http://127.0.0.1:8787/providers/hermes/test
curl -X POST http://127.0.0.1:8787/providers/asr/test
curl -X POST http://127.0.0.1:8787/chat
```

Browser evidence:

```text
/training screenshot: /private/tmp/rts-training.png
/settings screenshot: /private/tmp/rts-settings-loaded.png
```

Observed results:

- CLI training prompt returned a full structured Markdown plan in about `0.18s`.
- `npm test` eventually passed: `55 passed, 0 failed`.
- Frontend production build passed when run outside the sandbox.
- The first build attempt inside the Codex sandbox failed with a Turbopack process/port permission panic.
- `npm run gateway` failed when port `8787` was already in use and printed a raw Node stack trace.
- `npm run dev --prefix road-to-summer/frontend` detected an existing Next dev server and pointed to PID `87266`.
- Settings page loaded provider config after network idle.
- Hermes provider test passed against `local-hermes`.
- Doubao ASR provider test passed credential presence check.
- Real `/chat` returned `training_plan` with recent-training conflict correction, but took roughly `90s`.

## Scorecard

| Dimension | Score | Method | Evidence |
|---|---:|---|---|
| Getting Started | 5/10 | Tested | README has commands, but no full install/start golden path. |
| API / CLI / SDK | 6/10 | Tested | CLI works for prompts, but `--help` is parsed as user input. |
| Error Messages | 4/10 | Tested | Port conflict and invalid API calls are not developer-friendly. |
| Documentation | 6/10 | Inferred + tested | Architecture and setup docs exist, but README is not enough. |
| Upgrade Path | 2/10 | Inferred | No changelog, migration guide, or contribution flow. |
| Developer Environment | 6/10 | Tested | Tests and build work, but Node/package and sandbox friction are unclear. |
| Community / Ecosystem | 2/10 | Inferred | No issue templates, contributing guide, or public support path. |
| DX Measurement | 4/10 | Inferred | Test cases exist, but no DX checklist or onboarding metric. |

TTHW:

```text
CLI mock hello world after dependencies: < 1 minute
Local UI happy path with existing services: 2-5 minutes
Fresh outside developer path from README only: likely 10-15 minutes
Real Hermes plan generation once configured: about 90 seconds
```

## Findings

### 1. README lacks a true golden path

Current README starts with:

```bash
npm test
npm run cli -- "今天该练什么？"
npm run gateway
```

Missing:

- `npm install` location.
- Node version recommendation.
- Frontend install/start command.
- Gateway URL and frontend URL.
- How to tell whether Hermes is mock or real.
- What to do when ports are already in use.
- A one-command smoke test.

Impact: an outside expert can run the CLI, but will not know how to confidently bring up the whole Hermes + Gateway + Frontend loop.

### 2. Port conflict errors are raw stack traces

`npm run gateway` with port `8787` already occupied produced:

```text
Error: listen EADDRINUSE: address already in use 127.0.0.1:8787
...
Node.js v25.5.0
```

This should say:

```text
Gateway is already running on http://127.0.0.1:8787.
Use curl http://127.0.0.1:8787/session/current to verify it.
To stop it: kill <pid>
To use another port: GATEWAY_PORT=8788 npm run gateway
```

Impact: the current error makes a working environment look broken.

### 3. CLI has no real help path

`npm run cli -- --help` is parsed as user input:

```json
{
  "event_type": "unknown",
  "raw_text": "--help",
  "requires_followup": true
}
```

Impact: developers cannot discover examples, supported event types, or mock vs real behavior from the CLI.

### 4. API error semantics need cleanup

Examples:

```text
POST /providers/bad/test -> 500 {"error":"Unsupported provider category: bad"}
PUT /history/card-nope -> 500 {"error":"Invalid training card id."}
GET /not-a-route -> 404 {"error":"not_found"}
```

Client errors should be `400` or `404`, with `code`, `message`, and `fix`.

Impact: integrations cannot reliably distinguish bad user input from server failure.

### 5. Node version story is inconsistent

Root `package.json` says:

```json
"node": ">=20"
```

Gateway `package.json` says:

```json
"node": ">=25"
```

Current machine is:

```text
node v25.5.0
npm 11.8.0
```

Impact: a developer on Node 20 may pass the root requirement but fail later in Gateway behavior.

### 6. Frontend setup is split from root setup

Only `road-to-summer/frontend` has a `package-lock.json`. Root has no lockfile. The root README does not say whether a developer should install at root, frontend, both, or in sequence.

Impact: dependency installation is guesswork.

### 7. Settings page is useful, but the provider mental model is still heavy

Settings successfully shows:

- Hermes Runtime Model.
- Hermes Provider.
- ASR Provider.
- Vision Provider.
- `hasApiKey` without exposing secrets.

The page is doing the right thing. The missing piece is a short "current mode" summary:

```text
You are running: real Hermes + Doubao ASR + mock Vision
Hermes API: reachable
ASR: key configured, live audio required
Vision: mock
```

Impact: a developer can see many cards, but still has to infer whether the system is actually ready.

### 8. Real Hermes works, but latency should be surfaced

Real `/chat` returned a valid `training_plan`, including recent-training conflict correction. It took roughly `90s`.

Impact: this is acceptable for a prototype, but the UI and docs need to tell developers that real Hermes + MiniMax can be slow. Otherwise a working request looks hung.

## Recommended Fix Order

### P0

1. Add `npm run dx:smoke`.
   - Should test Node version, Gateway health, frontend route, provider config, and one mock `/chat`.

2. Rewrite README "Quick Start" as one golden path:
   - install root
   - install frontend
   - start Gateway
   - start frontend
   - open `/training`
   - run smoke test
   - switch mock to real Hermes

3. Add friendly port conflict handling in Gateway.

4. Add real CLI help:

```bash
npm run cli -- --help
npm run cli -- examples
npm run cli -- doctor
```

### P1

5. Normalize API errors:
   - `400 invalid_provider_category`
   - `400 invalid_training_card_id`
   - `404 route_not_found`
   - include `fix`.

6. Align Node engine requirements.

7. Add `CONTRIBUTING.md` with local dev, test, and provider-secret rules.

8. Add `CHANGELOG.md` before the next pushed milestone.

### P2

9. Add Settings readiness banner.

10. Add docs index:

```text
README -> docs/index.md -> architecture / hermes_setup / modular_development_template / test_cases
```

11. Track DX metrics in test docs:
   - TTHW mock path.
   - real Hermes first response time.
   - test runtime.
   - build runtime.

## Verdict

Status: `DONE_WITH_CONCERNS`

The implementation is real enough to test. The DX is not yet good enough for a cold external contributor. Fix the golden path, port/help errors, and API error semantics before inviting someone to modify the system independently.
