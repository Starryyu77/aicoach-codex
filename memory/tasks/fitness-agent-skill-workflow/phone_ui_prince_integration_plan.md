# Phone UI / Prince Integration Plan

Updated: 2026-05-15

## Decision

Add the Training Diary `codex/prince` phone-first frontend experience into `aicoach-codex` as a scoped Road to Summer mobile preview, without merging Training Diary's backend workflow, reducer, local auth, or repository model.

The first implementation target is a separate mobile route in `road-to-summer/frontend`, not a replacement of the existing `/training` cockpit.

Architectural clarification from 2026-05-15:

The phone surface is a thin frontend/control surface only. All real program execution remains local on the user's computer: Hermes Gateway, provider calls, local files, Memory, training state, and tools. The phone/mobile surface should behave like a local UI client or remote control connected to the local runtime, similar in spirit to OpenClaw or Codex mobile access patterns. Do not move Agent runtime, Memory authority, provider secrets, or workflow decisions into a phone-only runtime.

Operational clarification from 2026-05-15:

Do not add a local fallback generator for Hermes failures. Provider failures must be fixed on the real Hermes/provider path and surfaced if unresolved. The current phone interactive path uses the Gateway with a compact HermesMessage and a direct Anthropic-compatible MiniMax CN provider (`minimax-cn-hermes`) targeting `MiniMax-M2.7-highspeed`; this replaces the overloaded local Hermes API Server route for interactive phone chat, rather than falling back to local plan generation.

Phone UI correction from 2026-05-15:

The phone plan dock must remain user-controlled. Do not auto-expand it after every chat/provider response. The dock and composer should sit in the normal bottom layout flow above the nav, not as absolute overlays over the chat thread. On phone, render Agent UI as a compact structured reply card instead of the full desktop `AgentUiRenderer` surface, and normalize object-shaped quick actions into stable string labels before rendering.

Session/history correction from 2026-05-15:

Ended sessions must not continue exposing a saved `current_plan` to the phone route. When Hermes returns a `training_card`, Gateway saves the normalized card, clears the active plan, and `/session/current` hides plan/current-exercise data for `phase: "ended"`. Training-card history must normalize MiniMax-style fields such as `completed_exercises` into `actual_completed`, so finished sessions appear in `/history` and regenerate markdown consistently.

Source attribution correction from 2026-05-15:

Professional references are now a deterministic Gateway enrichment step, not only a prompt instruction. Every training plan should be passed through `withPlanSourceNotes` via `enforcePlanQuality`, which merges model-provided source data with the default professional registry: ACE IFT, NASM OPT, NSCA Program Design / training frequency, ACSM 2026 resistance training update, and NSCA-style RPE/RIR autoregulation. Phone plan expanded state renders per-exercise `source_note`, `framework_trace`, and compact official-source chips so missing model citations are visible and corrected without adding a Hermes fallback path.

Chat/plan-patch correction from 2026-05-15:

The phone and desktop chat transcript must be restored from Gateway state, not only held in component state. Gateway persists bounded `chat_messages` on the current session, `/session/current` returns the array even for older sessions, and both `/phone` plus `/training` hydrate their chat panels from it. `plan_patch` responses must also update the persisted `current_plan`, including object-shaped MiniMax fields such as `replacement: { exercise: ... }`, generic targets like `当前动作`, and explicit `updated_plan/current_plan/plan_card` aliases returned by Hermes.

## Source Inputs

- Current repo: `/Users/starryyu/2026/roadtosummer/aicoach-codex`
- Current branch: `codex/phone`
- Current product boundary: Hermes-backed fitness Agent / Skill / Workflow, not a traditional fitness app or SaaS
- Current frontend route to protect: `/training`
- Candidate source repo: `https://github.com/Starryyu77/Training-diary.git`
- Candidate source branch: `codex/prince`
- Current remote `codex/prince` head observed on 2026-05-15: `5ec6bda`

## Non-Goals

- Do not merge the full Training Diary repository.
- Do not import Training Diary's `TrainingThreadApp` wholesale.
- Do not replace the current Hermes Gateway contract.
- Do not treat the phone UI as a separate backend or a second agent runtime.
- Do not add Training Diary local auth in the first implementation slice.
- Do not let frontend components mutate training state outside the Gateway API.
- Do not render AI-generated HTML or JavaScript.
- Do not remove the existing desktop/workbench `/training` route until the mobile route is verified.

## Target Shape

Create a mobile-first route:

```text
/phone
  -> PhoneTrainingCockpit
     -> PhoneShell
     -> PhoneHeader
     -> PhoneThread
     -> PhonePlanDock
     -> PhoneComposer
     -> PhoneQuickMenu
     -> optional MusclePicker
```

The route should consume the same Gateway state and APIs as the existing cockpit:

```text
GET  /session/current
POST /session/start
POST /chat
POST /session/end
POST /vision/assess
```

The mobile route should support:

- hydrate current session after refresh
- generate or regenerate the selected training date plan
- display current plan and current exercise
- send text, voice transcript, camera assessment, and quick actions
- show Hermes `AgentUiDocument` through the existing whitelist renderer
- end the session and save the training card
- keep user-visible UI Chinese-first

## Implementation Slices

### Slice 1: Mobile Route and Scoped Shell

Files likely touched:

```text
road-to-summer/frontend/src/app/phone/page.tsx
road-to-summer/frontend/src/components/phone/PhoneTrainingCockpit.tsx
road-to-summer/frontend/src/components/phone/PhoneShell.tsx
road-to-summer/frontend/src/components/phone/PhoneHeader.tsx
road-to-summer/frontend/src/components/phone/PhoneThread.tsx
road-to-summer/frontend/src/components/phone/PhoneComposer.tsx
road-to-summer/frontend/src/components/phone/PhoneQuickMenu.tsx
road-to-summer/frontend/src/app/globals.css
```

Rules:

- Prefix CSS classes with `rts-phone-` to avoid colliding with existing frontend pages.
- Reuse current API client from `road-to-summer/frontend/src/lib/api.ts`.
- Keep the existing `/training` route unchanged.
- No new backend behavior in this slice.

Acceptance:

- `/phone` loads without Gateway connected and shows a useful disconnected state.
- `/phone` hydrates from `/session/current` when Gateway is running.
- Existing `/training`, `/history`, `/memory`, and `/settings` still render.

### Slice 2: Prince Interaction Patterns

Bring over the interaction ideas, not the source architecture:

- phone frame
- bottom composer
- bottom nav
- compact plan dock
- quick menu behind a `+` button
- training-phase finish button
- model/provider status line

Adaptation:

- `结束并保存` calls existing `endSession()`.
- quick actions call existing `sendChat(action, "quick_action")`.
- model status should come from current Gateway/provider data if available; otherwise show a conservative status string.

Acceptance:

- During training, the plan card collapses enough that the current action and composer remain usable.
- `结束并保存` does not create duplicate training cards.
- Quick actions are visible but do not dominate the screen.

### Slice 3: Plan and Current Action Cards

Reuse or adapt existing components:

```text
CurrentPlanCard
CurrentExerciseCard
AgentUiRenderer
VoiceInputButton
CameraInputButton
QuickActionBar
```

Likely create phone-specific wrappers instead of changing the desktop cards heavily:

```text
PhonePlanDock.tsx
PhoneCurrentActionCard.tsx
PhoneAgentSurface.tsx
```

Acceptance:

- Plan shows title, goal, date, duration, risk notes, and section items.
- Current exercise respects `current_item_id` when available.
- Agent UI stays behind the existing component whitelist.

### Slice 4: Muscle Picker

Candidate source from Prince:

```text
src/features/training-thread/ui/muscle-picker/
```

Adaptation:

- Move into `road-to-summer/frontend/src/components/phone/muscle-picker/`.
- Keep it as an input helper only.
- On confirm, send text to Hermes through current `/chat`:

```text
我今天想训练：胸、肩、三头。请根据这些部位生成训练计划。
```

Do not let the picker directly mutate plan state.

Acceptance:

- Selected muscles are clearly visible.
- Confirmed selection becomes a normal user message.
- If the model asks "今天想练哪个部位", the picker can be shown as an assistive input.

### Slice 5: Visual QA and Mobile Fit

Viewport checks:

```text
390x844
430x932
375x667
```

Check:

- composer does not cover the current action
- plan dock does not trap the page
- long Chinese action names wrap correctly
- bottom nav is reachable
- touch targets are at least 44px where practical
- no card-in-card nesting for page structure
- no text overlaps at narrow width

## Verification Plan

Run after implementation:

```bash
npm test
npm --prefix road-to-summer/frontend run build
```

If Gateway/frontend runtime is available:

```bash
npm --prefix road-to-summer/gateway run build
npm --prefix road-to-summer/frontend run dev
```

Then verify `/phone` in browser with mobile viewport screenshots.

Do not run real provider smoke tests unless the user explicitly wants live Hermes/provider validation for this UI pass.

## Risk Register

1. **CSS collision**
   - Risk: Prince global classes change existing pages.
   - Mitigation: use `rts-phone-*` scoped classes and avoid generic `.app-shell`, `.phone-frame`, `.composer`.

2. **State contract drift**
   - Risk: Training Diary reducer concepts leak into Gateway state.
   - Mitigation: mobile UI only consumes existing `SessionSnapshot`, `PlanCard`, `AgentUiDocument`, and `UiResponse`.

3. **Hidden second agent**
   - Risk: frontend starts making coaching decisions locally.
   - Mitigation: all training decisions go through Hermes/Gateway; frontend only displays or submits user actions.

4. **Current dirty tree**
   - Risk: this UI pass mixes with ongoing Hermes contract changes.
   - Mitigation: isolate frontend-only changes where possible and report any unavoidable type coupling.

5. **Prince branch drift**
   - Risk: local Training Diary branch is stale.
   - Mitigation: use the GitHub remote `codex/prince` head, not only the local checkout.

## Suggested Execution Order

1. Add `/phone` route with an empty scoped phone shell.
2. Wire hydrate and basic chat through existing Gateway APIs.
3. Add plan dock, current action card, and compact message stream.
4. Add quick menu, finish button, voice/camera entrypoints.
5. Add optional muscle picker.
6. Build and mobile-viewport QA.
7. If accepted, decide whether `/training` should link to `/phone` or be replaced later.

## Handoff Notes

- This plan intentionally keeps implementation frontend-heavy.
- Any required changes to `frontend/src/lib/types.ts` should be additive only.
- Backend changes should be avoided unless `/phone` exposes a real missing Gateway field.
- The first demo should be a preview route, not a full product-route replacement.

## Execution Status 2026-05-15

Implemented:

- Added `/phone` preview route.
- Added scoped phone components under `road-to-summer/frontend/src/components/phone/`.
- Added Prince-inspired phone shell, header, bottom nav, compact composer, quick menu, plan dock, and current-action view.
- Migrated Prince muscle picker into `components/phone/muscle-picker/` as an input helper only.
- Confirming muscle selection sends a normal Hermes chat message, for example `我今天想训练：胸部。请根据这些部位生成训练计划。`
- Moved voice-to-text into the mobile composer as a primary input button.
- Phone voice input records in the browser, sends audio to local Gateway `/voice/transcribe`, and writes the transcript back into the composer text box for review before sending.
- Added additive frontend type fields for plan IDs, item IDs, section IDs, and current item tracking.
- Added home page entry to `/phone`.
- Hid the global app navigation on `/phone` so the mobile frame is not double-wrapped.

Code-review fixes applied:

- Replaced `session.phase === "training"` checks with helper recognition for Gateway phases: `training`, `in_session`, `warmup`, `main`, `accessory`, `cooldown`.
- Added ended-session handling for `ended` and `completed`.
- Added `finishInFlightRef` to prevent duplicate `/session/end` requests.
- Updated quick action handling so an explicit empty `quick_actions: []` clears stale actions.
- Disabled `新对话` while requests are busy.
- Changed expanded plan dock to render all section items instead of silently slicing to four.
- Added 375x667-friendly CSS so the phone frame fits short/narrow screens.
- Limited muscle picker height and chips scrolling so the composer does not cover its content.

Verification:

```text
npm --prefix road-to-summer/frontend run build
-> passed; /phone included in Next route output
```

Visual QA:

- 390x844 `/phone` default state screenshot checked.
- 390x844 muscle picker open screenshot checked.
- 375x667 muscle picker selected state screenshot checked.
- 430x932 muscle picker selected state screenshot checked.

Known verification caveat:

```text
npm test
-> 74 passed, 1 failed
```

The failing test was `explicit text date overrides stale selected date for backfilled card`.
On 2026-05-15, `5月13日` correctly labels as `前天`, but the test still expects `昨天`.
This failure is date-sensitive and outside the `/phone` frontend implementation path.

## History Key Regression 2026-05-15

Issue:

- `/history` could receive malformed or legacy training card entries without `id`, `date`, or `theme`.
- The previous React key fallback `${card.date}-${card.theme}` collapsed those entries into `undefined-undefined`, producing duplicate-key console errors.

Fix:

- Added `frontend/src/lib/historyKeys.ts` with `historyCardKey(card, index)`.
- `TrainingHistoryList` now uses the persisted `id` when present and an index-scoped fallback for no-id entries.

Regression tests:

```text
node --test tests/frontendHistoryKeys.test.mjs
```

Cases covered:

- two fully malformed cards still produce unique keys
- persisted `id` remains the preferred stable key
- repeated non-id fields remain unique because the fallback includes the list index

## Phone QA Pass 2026-05-15

Scope:

- Tested `/phone` with multiple parallel agents and one main-thread deterministic mock flow.
- Voice-to-text was intentionally excluded; text input was used instead.
- Gateway/provider calls were mocked for frontend interaction tests so no real provider was invoked.

Results:

- `/phone` read-only responsive QA passed at `390x844` and `430x932`.
- Initial `375x667` QA found a short-screen layout risk: expanded plan dock could compress or overlap the current-action/composer area.
- Text composer mock flow passed: typed Chinese input rendered as a user message and mocked Hermes reply rendered as an agent message.
- Quick action mock flow passed: `太轻了` submitted as `source: quick_action` and rendered the mocked reply.
- Muscle picker mock flow passed: selecting `胸部` and `肩部` submitted `我今天想训练：胸部、肩部。请根据这些部位生成训练计划。`
- `/history` duplicate-key regression remained clean; no duplicate-key console error appeared.

Fixes from QA:

- Hide `PhonePlanDock` while the muscle picker is open so plan content cannot intercept muscle chip clicks.
- Add `rts-phone-plan-dock--training` spacing so the expanded plan dock stays above the taller training composer with `结束并保存`.
- Tighten short-screen plan dock sizing for `max-width: 380px` or `max-height: 700px`.
- Close and gate the quick action menu while the muscle picker is open so the `+` menu cannot intercept picker chips.
- Increase the short-screen training dock gap after review feedback.

Verification after fixes:

```text
node --test tests/frontendHistoryKeys.test.mjs
-> 3 passed, 0 failed

npm --prefix road-to-summer/frontend run build
-> passed; /phone and /history included in Next route output

Playwright mock flow
-> text input, quick action, and muscle picker all passed with no relevant console errors

375x667 layout check
-> planDock.bottom=478, composer.top=492, gap=14, overlap=false

Quick-menu plus muscle-picker regression
-> opening `肌群选择` after `+` hides the quick menu; chest/shoulder chips remain clickable
```

Remaining known non-blocking issue:

- Browser console may show `favicon.ico` 404 on first load. This is unrelated to the phone interaction paths and history key fix.

## Phone Bugfix Pass 2026-05-15

User-reported issues:

- After tapping `新对话`, refreshing `/phone` restored the old current training from Gateway.
- Text chat could show `Cannot read properties of undefined (reading 'flatMap')` when the phone UI received an incomplete plan object.

Fixes:

- Added Gateway `POST /session/reset`.
- `resetSession` clears the persisted `current_plan.json` and writes a fresh preworkout session.
- Phone `新对话` now calls `/session/reset` using today's date in the active timezone, clears local UI state, and shows `已开启新对话。刷新后不会恢复上一段训练。`
- Phone current-item lookup now treats missing `plan.sections` as an empty list.
- Phone plan dock now renders fallback labels for incomplete plan objects instead of assuming `sections`, `duration`, or `goal` exist.

Verification:

```text
node --test tests/sessionReset.test.mjs tests/frontendHistoryKeys.test.mjs
-> 4 passed, 0 failed

npm --prefix road-to-summer/frontend run build
-> passed

Playwright reset + partial plan mock
-> reset called /session/reset with target_date=2026-05-15
-> old plan did not return after reload
-> text input rendered with an intentionally incomplete current_plan
-> no relevant console errors
```

Follow-up reviewer finding:

- The original `flatMap` crash could still happen in Gateway before frontend rendering if Hermes returned a `training_plan` with `plan_card` but no `sections`.

Additional fix:

- `validateAgentOutput` now rejects malformed `training_plan.plan_card.sections` before UI mapping.
- `mapAgentOutputToUi.firstPlanItem` and `applyPlanPatch` now guard missing `sections` and missing section `items`.
- `AgentUiRenderer` and `PhonePlanDock` now guard malformed section/item/risk fields.
- `新对话` now waits for `/session/reset` success before clearing local phone state, reducing the refresh-while-reset race.
- Reset failure copy now says the Gateway reset failed and the current UI state was preserved.

Additional verification:

```text
node --test tests/hermesProvider.test.mjs tests/sessionReset.test.mjs tests/frontendHistoryKeys.test.mjs
-> 10 passed, 0 failed

npm --prefix road-to-summer/frontend run build
-> passed
```
