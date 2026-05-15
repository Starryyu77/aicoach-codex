# Dev Review Action Plan - 2026-05-14

This document converts the external development review into an implementation plan for Road to Summer / Hermes Fitness Agent Extension.

## Decision

We accept the reviewer's main diagnosis:

```text
The project direction is right, but the Gateway must not become a second hidden Agent.
```

The next phase prioritizes contract and state consistency before adding new features.

## Boundary To Preserve

```text
Hermes owns:
- Agent Runtime
- model access
- Sessions
- long-term Memory
- Skills
- Tools
- learning loop

Road to Summer owns:
- fitness Skill Pack
- UI Gateway adapters
- Training Cockpit frontend
- provider setup UI
- voice / vision adapters
- structured output contract
- local file-backed UI/session cache
```

Forbidden scope remains:

- database
- traditional backend
- SaaS admin
- coach workstation
- CRM
- scheduling
- payment
- membership
- multi-student management
- rewriting Hermes Runtime / Memory / Sessions / Skills
- local Mock Hermes or local template replies for production training dialogue

## Review Findings

| Area | Decision |
|---|---|
| Hermes boundary | Keep the current architecture, but enforce it more strictly in code. |
| Gateway | Keep adapter/validator/state-applier duties; reduce semantic coaching logic. |
| Output contract | Upgrade from demo contract to stateful contract with IDs, revisions, event IDs, and state deltas. |
| Frontend | Move from chat-first to current-action-first cockpit. |
| Memory | Build a bridge to Hermes Memory; local memory display cache is not authoritative. |
| A2UI | Keep shallow allowlisted component rendering; do not build a generic UI builder. |
| Exercise selection | Keep Gateway context short term; later expose as deterministic Hermes-callable candidate tool. |

## Implementation Phases

### Phase 1: Contract and State Foundation

Goal: make every Hermes turn safely applicable to UI state.

Add output-level fields:

```ts
type AgentOutputEnvelope = {
  schema_version: "rts.agent_output.v1";
  contract_version: string;
  turn_id: string;
  event_id: string;
  session_id: string;
  idempotency_key: string;
  type: "training_plan" | "plan_patch" | "training_card" | "training_review";
};
```

Add plan state fields:

```ts
type PlanStateMeta = {
  plan_id: string;
  plan_revision: number;
};
```

Add patch state fields:

```ts
type StatefulPatch = {
  applies_to_plan_id: string;
  applies_to_revision: number;
  state_before: TrainingStateSnapshot;
  state_delta: TrainingStateDelta;
  state_after: TrainingStateSnapshot;
};
```

Use stable target IDs:

```ts
type PatchTarget = {
  target_section_id?: string;
  target_item_id?: string;
  target_set_id?: string;
};
```

Acceptance criteria:

- New plans receive stable `plan_id`, `section_id`, and `item_id`.
- `plan_patch` can target an item by ID.
- Gateway rejects or quarantines stale patches where `applies_to_revision` does not match current state.
- Duplicate `event_id` / `idempotency_key` does not apply the same patch twice.
- String-name matching is no longer the primary patch mechanism.

### Phase 2: Gateway Responsibility Cleanup

Goal: Gateway becomes deterministic adapter, not hidden coach.

Keep in Gateway:

- request normalization
- `time_context`
- provider selection
- context loading
- Hermes message assembly
- response parse/repair/validation
- ID/revision state application
- local cache persistence
- controlled errors

Reduce or move:

- strong output-type semantic inference
- preference memory extraction from raw text
- hardcoded coaching language
- final exercise-selection decisions

Acceptance criteria:

- `expectedOutputType` becomes an `intent_hint`, not the source of truth.
- Long-term memory changes originate from Hermes candidates or explicit user confirmation.
- Gateway parser may normalize structure but does not invent coach content.

### Phase 3: Current-Action-First Cockpit

Goal: the user always sees what to do now.

Refactor frontend into:

```text
TrainingCockpitPage
  useTrainingSession()
  SessionDateBar
  CurrentActionPanel
  PlanTimeline
  CoachTurnPanel
  InputDock
  MemoryCandidateDrawer
  ProviderStatusBanner
```

Acceptance criteria:

- Current action comes from canonical `state_after`, not frontend guessing.
- Plan timeline shows completed/current/next/replaced states.
- Chat history is supporting context, not the main control surface.
- Quick actions are scoped to current action and session phase.

### Phase 4: Memory Bridge

Goal: show memory intelligently without building local Memory.

Add:

```ts
interface MemoryBridge {
  getSnapshot(sessionKey: string): Promise<MemoryDisplaySnapshot>;
  proposeCandidates(input: MemoryCandidate[]): Promise<MemoryCandidateReceipt[]>;
  confirmCandidate(candidateId: string): Promise<MemoryMutationReceipt>;
  rejectCandidate(candidateId: string): Promise<MemoryMutationReceipt>;
  invalidateSnapshot(sessionKey: string): Promise<void>;
}
```

Acceptance criteria:

- Local memory display file is explicitly non-authoritative.
- Pending memory candidates have IDs, source turn, category, confidence, operation, and confirmation status.
- Confirm/reject flows are ready to route to Hermes Memory.

### Phase 5: Exercise Candidate Tool

Goal: make exercise planning more testable without taking final decisions away from Hermes.

Introduce:

```ts
select_exercise_candidates(input) -> {
  candidates: ExerciseCandidate[];
  contraindications: RiskConflict[];
  recent_volume_warnings: Warning[];
  regression_options: ExerciseCandidate[];
  progression_options: ExerciseCandidate[];
}
```

Acceptance criteria:

- Tool returns candidates and constraints only.
- Hermes still decides final plan and explanation.
- Golden tests cover candidate generation.

## Next Immediate Slice

Implement Phase 1 only:

1. Extend shared types with IDs/revisions/event metadata.
2. Assign stable IDs when saving or normalizing plans.
3. Add ID-based patch application.
4. Add idempotency tracking for recent events.
5. Add tests for:
   - ID-based replace exercise
   - ID-based load adjustment
   - stale revision rejection
   - duplicate event no-op
   - current action derived from `state_after`

Do not start the cockpit refactor until Phase 1 is stable.

## 2026-05-15 Implementation Status

Completed Phase 1 foundation items:

- Added `schema_version`, `contract_version`, `turn_id`, `event_id`, `session_id`, `idempotency_key`, `state_before`, `state_delta`, and `state_after` to the output envelope.
- Added `plan_id`, `plan_revision`, `section_id`, `item_id`, and `current_item_id`.
- Added `gateway/src/state/planState.ts` for deterministic plan normalization, event metadata, state snapshots, patch target resolution, and stale revision validation.
- Changed patch application to prefer `target_item_id` before exercise-name fallback.
- Added stale revision rejection before applying a patch.
- Removed raw-text preference memory extraction from `/chat`; preference memory candidates must come from Hermes output or explicit confirmation flow.
- Updated frontend plan/current-action typing and list keys to use the new stable IDs.
- Updated `output_contract.md` with the contract envelope and ID/revision rules.

Verification:

```text
npm test -> 78 passed
npm run build --prefix road-to-summer/frontend -> passed
road-to-summer/frontend/node_modules/.bin/tsc -p road-to-summer/gateway/tsconfig.json --noEmit -> passed
```

Not finished in this slice:

- Duplicate `event_id` / `idempotency_key` currently gets tracked in `recent_event_ids`, but there is not yet a replay cache that can return the previous Hermes turn without re-applying. This remains part of Phase 1 hardening.
- `expectedOutputType` still exists as a Gateway hint. It should be renamed and treated as `intent_hint` in the next cleanup slice.
- `buildHermesMessage.ts` still repeats too much coaching/methodology language; move that into Skill docs after state contract is stable.

## Verification Command Set

```bash
npm test
npm run build --prefix road-to-summer/frontend
npm run dx:smoke
git diff --check
```
