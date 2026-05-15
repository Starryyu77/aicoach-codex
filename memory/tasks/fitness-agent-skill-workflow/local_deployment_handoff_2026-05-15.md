# Local Deployment Handoff Note

Date: 2026-05-15  
Branch: `codex/phone`

Created a local deployment handoff for other agents deploying the phone training interface.

Artifacts:

- `README.md`: added `Copyable Local Deployment Prompt`.
- `handoffs/outgoing/2026-05-15-local-deployment-agent-handoff.md`: full deployment handoff.

Deployment intent:

- Local Gateway and Next.js remain the runtime.
- `/phone` is only the mobile front-end control surface.
- Other users should only need to provide MiniMax API key and Doubao/Volcengine ASR API key.
- Recommended low-friction path is `minimax-cn-hermes` plus `doubao-asr-flash`; no separate local Hermes API Server is required for basic deployment.
