# Road to Summer Fitness Agent

本仓库当前先实现「运动健身 AI Agent / Skill / Workflow」的本地 Codex 原型，不做完整 App、教练工作台、SaaS 后台、CRM、排课、支付或会员系统。

## Copyable Local Deployment Prompt

把下面这一段复制给另一个本地 coding agent，对方只需要向使用者索取 MiniMax API key 和豆包/火山 ASR API key：

```text
你要在本地部署 Starryyu77/aicoach-codex 的 Road to Summer 手机端训练 agent。目标是让所有运行都在本地 Gateway/Next.js 中完成，手机端只是 http://localhost:3000/phone 的前端控制面。

请执行：
1. Clone 并进入仓库：git clone https://github.com/Starryyu77/aicoach-codex.git && cd aicoach-codex && git checkout codex/phone
2. 确认 Node.js >= 25、npm >= 11，然后安装依赖：npm install && npm install --prefix road-to-summer/frontend
3. 启动 Gateway：npm run gateway，默认地址 http://127.0.0.1:8787
4. 启动前端：npm run dev --prefix road-to-summer/frontend，默认地址 http://localhost:3000
5. 打开 http://localhost:3000/settings，配置：
   - Hermes Runtime Model：MiniMax CN for Hermes，填入使用者提供的 MiniMax API key。
   - Hermes Provider：MiniMax CN Hermes Direct / minimax-cn-hermes，填入同一个 MiniMax API key，并设为 active。这个路径不需要额外启动本地 Hermes API Server。
   - ASR Provider：Doubao ASR Flash / doubao-asr-flash，填入使用者提供的豆包/火山 ASR API key，并设为 active。
   - Vision Provider 可以先保留 mock-vision。
6. 打开 http://localhost:3000/phone，点“新对话”，用文本输入生成训练计划，再测试语音转文字。

要求：
- 不要把 API key 写入 README、handoff、git commit 或聊天记录；只允许写入本机 .runtime/secrets.env 或通过 Settings 页面保存。
- 不要启用 mock Hermes 作为 /chat 成功路径；如果 MiniMax/Hermes 请求失败，应显示真实错误，不要生成本地 fallback 计划。
- 部署后至少运行 npm test、npm run build --prefix road-to-summer/frontend，并手动验证 /phone -> /history -> /phone、刷新、结束训练保存历史这几个流程。
```

完整交接版见 [`handoffs/outgoing/2026-05-15-local-deployment-agent-handoff.md`](handoffs/outgoing/2026-05-15-local-deployment-agent-handoff.md)。

## Quick Start

适合外部开发者第一次把项目跑起来。`/chat` 默认要求真实 Hermes Provider；不会用本地 Mock Hermes 冒充模型回复。

### 0. 环境要求

```bash
node --version
npm --version
```

要求：

```text
Node >= 25
npm >= 11
```

原因：Gateway 和测试直接运行部分 TypeScript 文件，需要当前 Node 的类型擦除能力。

### 1. 安装依赖

```bash
npm install
npm install --prefix road-to-summer/frontend
```

### 2. 先验证 CLI

```bash
npm run cli -- --help
npm run cli -- examples
npm run cli -- doctor
npm run cli -- "今天该练什么？"
```

### 3. 启动 Gateway

打开第一个终端：

```bash
npm run gateway
```

成功时会看到：

```text
Road to Summer Gateway listening on http://127.0.0.1:8787
```

如果 `8787` 已被占用，Gateway 会提示如何检查已有服务，以及如何换端口启动：

```bash
GATEWAY_PORT=8788 npm run gateway
```

### 4. 启动前端

打开第二个终端：

```bash
npm run dev --prefix road-to-summer/frontend
```

打开 Next.js 打印的地址，通常是：

```text
http://localhost:3000/training
```

如果 `3000` 被占用，Next.js 会自动给出新的端口。按终端里打印的 URL 打开。

### 5. 跑一键 DX smoke

打开第三个终端：

```bash
npm run dx:smoke
```

它会检查：

- Node 版本。
- Gateway 是否能访问。
- Frontend `/training` 是否能访问。
- Provider 配置是否能读取，且不会把明文 API key 暴露到前端。
- Real `/chat` 是否能通过 active Hermes Provider 返回结构化 JSON。
- Mock `/chat` 是否能生成结构化 `training_plan`。

如果前端不是 `http://localhost:3000/training`，可以指定：

```bash
FRONTEND_URL=http://localhost:3001/training npm run dx:smoke
```

如果 Gateway 改了端口，可以指定：

```bash
GATEWAY_URL=http://127.0.0.1:8788 npm run dx:smoke
```

### 6. 可选：切到真实 Hermes / ASR

打开：

```text
http://localhost:3000/settings
```

在 Settings 里配置：

- Hermes Runtime Model，例如 MiniMax CN。
- Hermes Provider，例如 Local Hermes API Server。
- ASR Provider，例如 Doubao ASR Flash。
- Vision Provider，第一版可以保持 mock。

API key 只提交给 Gateway，写入 `.runtime/secrets.env` 或环境变量。前端只显示 `hasApiKey`，不展示明文 key。

真实 Hermes 启动说明见：

```text
road-to-summer/docs/hermes_setup.md
```

## 常用命令

```bash
npm test
npm run dx:smoke
npm run cli -- --help
npm run cli -- examples
npm run cli -- doctor
npm run cli -- "今天该练什么？"
npm run cli -- "高位下拉和绳索划船有人了。"
npm run cli -- "我感觉不到背阔肌发力。"
npm run gateway
npm run dev --prefix road-to-summer/frontend
npm run build --prefix road-to-summer/frontend
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
- Hermes providers：Hermes API Server、OpenAI-compatible Hermes；训练 `/chat` 不允许使用 Mock Hermes。
- ASR providers：mock、OpenAI Whisper、Groq Whisper、Local Whisper、Doubao ASR Flash。
- Vision providers：mock、External Pose HTTP。
- 轻量文件状态：`current_session.json`、`current_plan.json`、`training_cards/*.json`、`mock_memory.json`。
- Training Cockpit / History / Memory / Settings 前端。
- 浏览器录音 -> `/voice/transcribe` -> 用户确认 -> `/chat`。
- Gateway 场景测试和 Provider 测试。

当前真实 / mock 边界：

- 默认 active Hermes provider 是 `local-hermes`；如果真实 Hermes 不可用，`/chat` 返回错误，不生成本地模板回复。
- 默认 active ASR provider 可为 mock 或真实 Doubao/OpenAI/Groq/Local Whisper，按 Settings 或 `.runtime/config.json` 切换。
- Vision / Pose provider 仍可使用 mock；动作评估后的教练回复仍通过真实 Hermes 生成。
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
