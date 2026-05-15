# Incoming Decision: aicoach phone testing review

Date: 2026-05-15  
Branch: `codex/phone`  
Decision owner: local project owner  
Source request: `handoffs/outgoing/2026-05-15-aicoach-phone-testing-review.md`  
Latest pushed handoff commit at decision time: `3264b6e` (`Add phone testing review handoff`)

## Decision Summary

Do not treat the `codex/phone` branch as merge-ready yet. The implementation direction is accepted, but merge should be blocked until a small, explicit Gateway + phone E2E + frontend safety test gate exists.

The product boundary remains unchanged:

- Phone is only a frontend/control surface for the local runtime.
- Gateway, Hermes provider calls, file-backed state, memory, tools, and history remain local.
- Provider/Hermes failures must not be hidden by a local fallback generator.
- Chat should not silently become long-term memory.

Conflict rule: when the two expert reviews conflict, the first expert review is authoritative. The second expert review is treated as a hardening addendum where it does not contradict the first.

## Inputs Received

### Expert 1: Primary Review

Primary conclusion:

- The branch direction is acceptable, but merge should require minimum E2E and contract tests.
- Existing Gateway route/unit tests are useful, but they do not cover real browser navigation, mobile hydration, frontend rendering warnings, or final Gateway state contracts.
- Core CI blockers should cover `/phone -> /history -> /phone`, refresh, session end, plan patch persistence, no fallback, source traces, and mobile viewport overlap.

Primary areas accepted from this review:

- Phone navigation and hydration.
- Chat persistence across navigation and refresh.
- Plan generation and plan patch persistence.
- Reset/end-session behavior.
- History/training-card persistence.
- Absolute date handling.
- Provider failure and no-fallback behavior.
- Final source attribution in `handleChat` output.
- A2UI safe rendering and quick-action normalization.
- Mobile viewport layout checks.

### Expert 2: Secondary Hardening Review

Secondary conclusion:

- The highest code-level risks are provider output normalization, over-broad date normalization, frontend safe rendering, and lack of browser/component tests.
- Adds specific concerns around object-shaped patch fields, ambiguous patch matching, unsafe source URLs, duplicate keys, and recursive date rewriting of user-facing text.

Accepted from this review where non-conflicting:

- Add parser/normalizer tests for object-shaped `plan_patch` fields.
- Add no-match and multi-match tests for plan patch application.
- Add date tests that protect user-facing text from broad recursive rewriting.
- Add safe URL handling tests for source links.
- Add duplicate-key and `[object Object]` frontend rendering tests.

## Consolidated Merge Blockers

The following are P0 blockers before merging `codex/phone` into a mainline branch.

### 1. Phone Hydration and Navigation

Required behavior:

- `/phone` must hydrate `current_plan`, `chat_messages`, and `target_date` from `/session/current`.
- Navigating `/phone -> /history -> /phone` must not lose chat or current plan state.
- Browser refresh must not restore an old conversation after `新对话`.
- Browser refresh must not restore a plan after the session has ended.

Required test shape:

- Add a browser E2E flow for `/phone -> /history -> /phone -> refresh`.
- Add a route contract test for `handleGetCurrentSession` returning the correct state shape.

### 2. Chat Persistence

Required behavior:

- Every successful `/chat` round persists both user and agent messages.
- Server-synced `current_session.chat_messages` is authoritative after the response.
- Message order must survive navigation and refresh.
- The 80-message truncation policy must keep the most recent messages.

Required test shape:

- Route integration test around `handleChat` and `handleGetCurrentSession`.
- Frontend/component or E2E test to ensure optimistic messages are not duplicated after server sync.

### 3. Plan Patch Persistence

Required behavior:

- `training_plan` writes `current_plan`.
- `plan_patch` modifies persisted `current_plan`, not only chat text.
- Generic targets like `当前动作` resolve through `current_item_id` / `current_exercise`.
- Object-shaped fields like `replacement: { exercise: "台阶上步" }` normalize to real display text.
- Zero-match and ambiguous-match patches must be observable; they must not silently pretend success.

Required test shape:

- Route tests for `replace_exercise`, `adjust_load`, `update_cue`, `extend_rest`, `add_set`, and `reduce_sets`.
- Negative tests for no-match and multi-match patch targets.
- Browser test: send `把当前动作换成台阶上步`, refresh, and verify the current plan still shows `台阶上步`.

### 4. Reset and End Session

Required behavior:

- `新对话` clears `current_plan`, `plan_card`, `current_exercise`, and `chat_messages`.
- Ending a session saves a history card.
- Ended sessions must not expose an active plan dock through `/session/current`.
- Double finish or refresh after finish must not duplicate cards or restore the dock.

Required test shape:

- Extend `tests/sessionReset.test.mjs`.
- Extend `tests/hermesGateway.test.mjs` for training-card save plus ended-session hiding.
- Browser test: finish session, visit `/history`, return to `/phone`, refresh.

### 5. History and Training-Card Persistence

Required behavior:

- MiniMax variants like `completed_exercises`, `completed_items`, and `actual_completed` all normalize consistently.
- Invalid or draft-only `training_plan` output must not become a completed history card.
- Markdown regeneration must follow normalized card data.
- History sort and card keys must be stable.

Required test shape:

- Add fixture-driven tests for multiple provider card shapes.
- Keep duplicate-key tests for history rendering.

### 6. Date Handling

Required behavior:

- Structural date fields must be absolute.
- User-facing titles/prose should not be corrupted by broad recursive rewriting.
- Invalid month/day text must not be normalized as if valid.
- `今天/明天/昨天/前天/后天` should be handled deterministically relative to the target date/time context.

Required test shape:

- Extend `tests/absoluteDateText.test.mjs`.
- Add cases for title/prose overreach, invalid dates, and nested plan/card objects.

Decision note:

The current recursive normalization is considered high risk. The likely direction is a field-aware normalization strategy, but any change must preserve the first expert's requirement that persisted plan/card/history dates are absolute.

### 7. Provider Failure and No-Fallback Contract

Required behavior:

- Mock Hermes must be rejected on `/chat`.
- Provider timeout, 500, or invalid JSON must surface an error.
- Failed provider requests must not create `current_plan`, write a training card, or append a fake coach plan.
- The frontend may show the error, but it must not invent a local plan.

Required test shape:

- Route tests for provider failure variants.
- Browser E2E test with deterministic failing provider fixture.

### 8. Final Source Attribution

Required behavior:

- Final `handleChat` result must include professional source traces in `ui.current_plan`.
- Testing only `withPlanSourceNotes` is not sufficient.
- Expected trace families include ACE IFT, NASM OPT, NSCA, ACSM 2026, and RPE/RIR.
- Phone expanded plan state must expose source notes or source chips without layout breakage.

Required test shape:

- Add route integration test where provider returns a valid plan with no trace fields.
- Assert final `result.ui.current_plan.framework_trace` and `official_source_trace` are present.

### 9. A2UI and React Safe Rendering

Required behavior:

- No `[object Object]` should appear in chat, plan dock, quick actions, or Agent UI.
- React keys must be stable for duplicate or malformed data.
- Unsupported Agent UI components and duplicate Agent UI ids should fail validation.
- `source_url` should only render as a clickable link for safe `http:` or `https:` URLs.

Required test shape:

- Add frontend pure/component tests for quick action normalization, duplicate keys, and source URL sanitization.
- Add or extend Gateway Agent UI validation tests for unsupported components and invalid trees.

### 10. Mobile Viewport Layout

Required behavior:

- At `390x844`, `430x932`, and `375x667`, composer, dock, bottom nav, and latest chat content must remain usable.
- Dock collapsed and expanded states must not hide the input path.
- Long Chinese text and source chips must wrap without horizontal overflow.
- Muscle picker and camera/voice entry should not trap or occlude core controls.

Required test shape:

- Add Playwright bounding-box smoke checks for the three viewport sizes.
- Manual screenshot QA remains useful but should not be the only gate.

## Implementation Backlog

Recommended order:

1. Gateway contract tests for chat persistence, reset/end, provider failure, source attribution, card normalization, and plan patch persistence.
2. Date normalization tests and any required field-aware normalization fix.
3. A2UI/parser/frontend pure tests for object-shaped fields, safe URLs, duplicate keys, and `[object Object]`.
4. Frontend component test setup for `PhoneTrainingCockpit`, `PhoneThread`, and `PhonePlanDock`.
5. Playwright E2E setup with deterministic provider fixtures for `/phone`.
6. Manual QA run on real local Gateway/provider after automated blockers pass.

## Minimum Merge Readiness Gate

Existing required commands:

```bash
npm test
npm --prefix road-to-summer/frontend run build
```

New required commands to add before merge:

```bash
npm --prefix road-to-summer/frontend run test
npm --prefix road-to-summer/frontend run e2e -- phone.spec.ts
```

Pass criteria:

- All Gateway tests pass.
- Frontend build has no type or build errors.
- Frontend component tests cover duplicate keys, object-shaped rendering, source URL safety, and optimistic/server-synced chat.
- Browser E2E covers generation, feedback, history navigation, refresh, plan patch persistence, finish session, and no-fallback failure.
- Console has no duplicate key warning, hydration error, or `[object Object]` rendering in the tested flows.

## Manual QA Script To Preserve

Use `http://localhost:3000/phone` with a clean or known Gateway state.

1. Open `/phone`; verify no stale ended dock appears.
2. Click `新对话`; refresh; verify chat and plan are still cleared.
3. Generate a plan for the selected target date.
4. Send `太轻了`; verify both chat response and current plan state change.
5. Send `把当前动作换成台阶上步`; verify current action changes in the dock.
6. Go to `/history`, then back to `/phone`; verify chat and plan remain.
7. Refresh `/phone`; verify state still matches Gateway state.
8. End the session; verify the dock disappears.
9. Open `/history`; verify the new training card exists with absolute dates.
10. Return to `/phone` and refresh; verify the ended plan does not return.
11. Force provider failure; verify an explicit error and no generated fallback plan.

## Accepted Follow-Up Notes

- If frontend test infrastructure is not already present, add the smallest Vitest/React Testing Library setup needed for phone components.
- If Playwright is not already present, add a focused `phone-state-flow.spec.ts` rather than a broad UI suite.
- Live MiniMax/Hermes smoke can remain optional; core CI should use deterministic fixtures and must not require provider secrets.
- Security hardening for source URLs is accepted as a blocker because it does not conflict with the first expert review and directly affects generated source attribution rendering.

