# Road to Summer Fitness Agent

本仓库当前先实现「运动健身 AI Agent / Skill / Workflow」的本地 Codex 原型，不做完整 App、教练工作台、SaaS 后台、CRM、排课、支付或会员系统。

## 运行

```bash
npm test
npm run cli -- "今天该练什么？"
npm run cli -- "高位下拉和绳索划船有人了。"
npm run cli -- "我感觉不到背阔肌发力。"
npm run gateway
```

## 当前能力

- 读取 Markdown / JSON 记忆文件。
- 清洗语音转文字后的短文本。
- 做健身术语纠错。
- 解析训练事件。
- 按训练前、训练中、训练后 workflow 输出结构化响应。
- 生成长期记忆候选，不自动把所有对话写入长期记忆。

## 关键边界

- 第一版只做单用户当前训练 session。
- 训练记录可以进入 `memory/training_logs.md`。
- 器械、场地、偏好、风险、观察等长期记忆需要走候选确认。

## Hermes 扩展工程

新增工程在 `road-to-summer/`：

```text
road-to-summer/
  hermes-extension/skills/road_to_summer/
  gateway/
  frontend/
  tools/pose-tool/
  docs/
```

当前真实实现：

- Road to Summer Hermes Skill Pack 文档和输出契约。
- Gateway HermesClient 抽象。
- Mock HermesClient，可返回 `training_plan`、`plan_patch`、`training_card`。
- Mock ASR：`POST /voice/transcribe`。
- Mock Vision/Pose：`POST /vision/assess`。
- 轻量文件状态：`current_session.json`、`current_plan.json`、`training_cards/*.json`、`mock_memory.json`。
- Training Cockpit / History / Memory 前端文件壳。
- 8 个 Hermes Gateway 场景测试。

当前 mock：

- Hermes Runtime / Memory / Sessions。
- ASR provider。
- Vision / Pose provider。
- 前端未绑定真实部署环境，只按 Gateway API 契约实现。

Gateway API:

```text
POST /chat
POST /voice/transcribe
POST /vision/assess
GET  /session/current
POST /session/start
POST /session/end
GET  /history
GET  /history/:id
GET  /memory
POST /memory/confirm
```

接真实 Hermes：

1. 替换 `road-to-summer/gateway/src/hermes/HermesClient.ts` 里的 `MockHermesClient` 调用逻辑。
2. 保留 `buildHermesMessage.ts`、`parseHermesResponse.ts`、`validateAgentOutput.ts` 和 `mapAgentOutputToUi.ts`。
3. 确保 Hermes 严格按 `road-to-summer/hermes-extension/skills/road_to_summer/output_contract.md` 输出 JSON。

替换 ASR：

- 在 `road-to-summer/gateway/src/asr/transcribeAudio.ts` 中接入 `whisper | doubao | openai | hermes voice` provider。

替换 Vision Tool：

- 在 `road-to-summer/gateway/src/vision/assessMovement.ts` 中接真实 pose / video provider。
- 保持返回 `movement_assessment` 结构。
