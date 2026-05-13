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
- Gateway Provider 架构：Hermes / ASR / Vision 都可配置 active provider。
- Provider presets：Settings 页面提供常见 Hermes、OpenAI Whisper、Groq Whisper、Doubao ASR、External Pose HTTP 快速配置模板。
- Hermes providers：mock、Hermes API Server、OpenAI-compatible Hermes。
- ASR providers：mock、OpenAI Whisper、Groq Whisper、Local Whisper、Doubao ASR Flash。
- Vision providers：mock、External Pose HTTP。
- 轻量文件状态：`current_session.json`、`current_plan.json`、`training_cards/*.json`、`mock_memory.json`。
- Training Cockpit / History / Memory / Settings 前端。
- 浏览器录音 -> `/voice/transcribe` -> 用户确认 -> `/chat`。
- Gateway 场景测试和 Provider 测试。

当前 mock：

- 默认 active Hermes provider 仍是 mock，真实 Hermes 可通过 Settings 或 `.runtime/config.json` 切换。
- 默认 active ASR provider 仍是 mock，OpenAI Whisper 已有真实 HTTP 实现。
- Vision / Pose provider。
- Doubao ASR 已按火山引擎大模型录音文件极速版接口接入；新版控制台填单个 API Key，旧版可填 `appKey:accessKey`。

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
GET  /providers
GET  /providers/presets
POST /providers/:category/test
PUT  /providers/:category/active
POST /providers/:category/instances
PUT  /providers/:category/instances/:id
DELETE /providers/:category/instances/:id
```

接真实 Hermes API Server：

1. 启动 Hermes API Server，使其暴露 `http://127.0.0.1:8642/v1`。
2. 在 `http://localhost:3000/settings` 新增或启用 `hermes-api-server` provider。
3. 如 Hermes 设置了 API Server key，把 key 写入 Settings 表单；Gateway 会存到 `.runtime/secrets.env`，前端不会保存明文。
4. `/chat` 会经过 `buildHermesMessage.ts`、`parseHermesResponse.ts`、`validateAgentOutput.ts` 和 `mapAgentOutputToUi.ts`，不会把 Hermes 原始文本直接交给前端。

接 OpenAI Whisper：

1. 在 Settings 新增或启用 `openai-whisper` ASR provider。
2. `baseUrl = https://api.openai.com/v1`，`model = whisper-1`，`apiKeyRef = OPENAI_API_KEY`。
3. 填入 API key 后，Gateway 写入 `.runtime/secrets.env`。
4. 前端录音只发音频，不持有 API key。

接豆包语音：

1. 在 Settings 里使用 `Doubao ASR Flash` 模板。
2. 新版控制台：API key 输入单个 `X-Api-Key`。
3. 旧版控制台：API key 输入 `appKey:accessKey`。
4. 默认 endpoint：`https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash`。
5. 默认 resource id：`volc.bigasr.auc_turbo`。

替换 Vision Tool：

- 在 Settings 新增或启用 `external-pose-http` provider。
- 保持返回 `movement_assessment` 结构。
