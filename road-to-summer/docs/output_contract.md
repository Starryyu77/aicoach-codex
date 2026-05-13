# Output Contract

Canonical contract:

- `road-to-summer/hermes-extension/skills/road_to_summer/output_contract.md`

Gateway enforcement:

- `road-to-summer/gateway/src/hermes/parseHermesResponse.ts`
- `road-to-summer/gateway/src/ui/validateAgentOutput.ts`
- `road-to-summer/gateway/src/ui/mapAgentOutputToUi.ts`

Frontend should consume mapped UI state. It should not parse long natural-language model output directly.

