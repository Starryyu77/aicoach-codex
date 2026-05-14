# Road to Summer Agent UI Schema

This project now uses an A2UI-inspired rendering path:

```text
Hermes domain JSON
  -> Gateway validation and mapping
  -> AgentUiDocument JSON
  -> Frontend AgentUiRenderer
```

The goal is not to let the model execute UI code. The goal is to let Hermes describe training state and UI intent as data, while the client renders only trusted components.

## Why This Exists

A normal chat reply is too weak for a training cockpit. The frontend needs to know:

- what the coach said,
- what the current exercise is,
- whether a plan changed,
- what patch operation happened,
- what buttons should be available,
- whether a training card or memory update needs attention.

`AgentUiDocument` packages those pieces into a declarative UI document.

## Current Version

```text
rts-a2ui-0.1
```

This is not a full implementation of Google's A2UI protocol. It borrows the safe architecture:

- declarative JSON, not generated code,
- a component allowlist,
- a data model separated from rendered components,
- frontend-owned React implementations.

## Document Shape

```json
{
  "version": "rts-a2ui-0.1",
  "surface": "training_cockpit",
  "root": "root",
  "components": [
    {
      "id": "root",
      "type": "surface",
      "props": { "title": "训练动态界面" },
      "children": ["coach", "summary", "actions"]
    }
  ],
  "data": {
    "chat_message": "",
    "plan": {},
    "session": {},
    "patch": {},
    "training_card": {},
    "memory_updates": [],
    "quick_actions": []
  }
}
```

## Allowed Components

Only these component types can render:

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

Unsupported component types are rejected by Gateway validation.

## Current Policy

For the first version, Hermes still returns the domain output contract:

```text
training_plan
plan_patch
training_card
training_review
```

The Gateway compiles that domain JSON into `AgentUiDocument`. This keeps the UI stable even when model output varies.

Later, Hermes may return an optional `agent_ui` field directly, but only if it passes the same component allowlist and validation.

## Frontend Contract

The frontend renders `ui.agent_ui` through:

```text
frontend/src/components/AgentUiRenderer.tsx
```

The renderer:

- does not evaluate code,
- does not render arbitrary HTML,
- resolves only simple data paths,
- maps each allowed component type to local React markup,
- sends actions back through the existing `/chat` path.

## Boundary

This layer is UI state and rendering glue. It is not:

- a database,
- a new backend,
- a replacement for Hermes Memory,
- a replacement for Hermes Sessions,
- a generic website builder,
- a coach workbench.
