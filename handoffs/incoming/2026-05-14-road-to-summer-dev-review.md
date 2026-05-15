# Incoming Review: Road to Summer Development Review

> Received 2026-05-14 from external development review based on the handoff document and public GitHub repository. This file records the actionable interpretation for repo continuity; it is not a verbatim transcript.

## Overall Judgment

The reviewer agreed with the project direction and boundary:

- Hermes should own Agent Runtime, model access, Sessions, Memory, Skills, Tools, and learning loop.
- Road to Summer should own only the fitness Skill Pack, UI Gateway adapters, Training Cockpit, provider setup UI, voice/video adapters, structured output contract, and lightweight local UI/session cache.
- The project must not expand into a SaaS backend, coach workstation, CRM, scheduling, payment, membership, multi-student management, or full consumer fitness app.

The main warning:

> The Gateway is at risk of becoming a second hidden Agent.

The reviewer sees the current Gateway doing appropriate adapter/validator work, but also sees semantic leakage in places such as output type inference, preference extraction, plan-patch matching, and runtime coaching instructions.

## Highest Priority Findings

1. Contract and state synchronization are the current weakest point.
2. Gateway should be deterministic adapter, validator, and state applier, not a hidden coach.
3. The UI should become current-action-first rather than chat-first.
4. Memory should become a thin bridge to Hermes Memory, not a local memory store.
5. A2UI-inspired rendering is safe and worth keeping shallow; do not turn it into a generic UI builder.
6. Fitness framework citations should be visible as concise coach explanations, with full traces reserved for debug/audit.

## Accepted Recommendations

### Contract

Add explicit state and concurrency fields:

- `schema_version`
- `contract_version`
- `turn_id`
- `event_id`
- `session_id`
- `plan_id`
- `plan_revision`
- `applies_to_revision`
- `idempotency_key`
- `state_before`
- `state_delta`
- `state_after`

Move patch targets from string names to stable IDs:

- `target_item_id`
- `target_section_id`
- `target_set_id` where needed

### Gateway

Gateway should keep:

- request normalization
- `time_context` construction
- provider registry and secret references
- lightweight current state loading
- Hermes message assembly
- response parsing and schema validation
- safe UI document compilation
- validated state-delta application
- local UI/cache persistence
- controlled errors

Gateway should not keep expanding:

- final coaching decisions
- final exercise selection decisions
- hidden memory meaning extraction
- autonomous preference inference
- plan generation templates
- hidden scheduling or analytics state
- authoritative long-term memory

### Exercise Selection

Short term:

- Keep `exercise_selection_context` as read-only Gateway-built context.
- Make clear it is not the final plan generator.

Medium term:

- Convert it into a Hermes-callable deterministic support tool such as `select_exercise_candidates`.
- Tool returns candidates, constraints, risks, substitutions, and warnings.
- Hermes still makes the final coaching decision and outputs the plan.

### Memory

Introduce a `MemoryBridge` abstraction rather than a database:

```ts
interface MemoryBridge {
  getSnapshot(sessionKey: string): Promise<MemoryDisplaySnapshot>;
  proposeCandidates(input: MemoryCandidate[]): Promise<MemoryCandidateReceipt[]>;
  confirmCandidate(candidateId: string): Promise<MemoryMutationReceipt>;
  rejectCandidate(candidateId: string): Promise<MemoryMutationReceipt>;
  invalidateSnapshot(sessionKey: string): Promise<void>;
}
```

Local files may cache display data, but must be explicitly non-authoritative.

### Frontend

Refactor Training Cockpit toward:

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

The main UX goal:

```text
User should always know:
- what to do now
- which set they are on
- target reps/load/RPE/rest
- why the adjustment happened
- what happens next
```

### A2UI

Keep the current safe direction:

```text
Hermes domain JSON
  -> Gateway validation/mapping
  -> allowlisted AgentUiDocument
  -> local frontend components
```

Do not add:

- arbitrary layout grid
- model-generated themes
- model-generated custom components
- arbitrary HTML/JS/iframe execution

## Recommended 4-Week Plan

### Week 1: Contract and State Consistency

- Add stable IDs and revision fields.
- Add event/turn/idempotency fields.
- Add `state_before`, `state_delta`, and `state_after`.
- Replace string patch matching with ID-based patch targets.
- Add golden contract fixtures.

### Week 2: Training Cockpit Refactor

- Split `TrainingCockpit`.
- Add `useTrainingSession`.
- Add current-action-first layout.
- Add `CurrentActionPanel`, `PlanTimeline`, `InputDock`, `CoachTurnPanel`, `MemoryCandidateDrawer`, and `ProviderStatusBanner`.

### Week 3: Memory Bridge and Provider Doctor

- Add `MemoryBridge` interface.
- Mark local memory display cache as non-authoritative.
- Route memory confirmation through Hermes-facing bridge.
- Unify Settings health checks and CLI doctor checks.

### Week 4: Exercise Candidate Tool and Methodology Polish

- Extract deterministic `select_exercise_candidates` support tool.
- Keep final plan decisions in Hermes.
- Move full source traces to debug/audit layer.
- Keep user-facing methodology explanation concise and coach-like.

## Immediate Next Engineering Slice

The next implementation should not be a broad feature pass. It should start with Week 1:

1. Define `rts.agent_output.v1` and state-delta contract.
2. Add stable IDs to plan sections/items and training cards.
3. Add `plan_revision` and `applies_to_revision`.
4. Update parser/validator/UI mapper to use IDs.
5. Add tests for stale patch rejection, duplicate event idempotency, and ID-based patch application.

This is the foundation needed before the frontend cockpit refactor.
