# Hermes Setup

当前仓库已拉取 NousResearch `hermes-agent` 到本地 `.runtime/upstream/hermes-agent` 作为参考源码。该目录被 `.gitignore` 忽略，不会混入 Road to Summer 仓库提交。

上游 Hermes API Server adapter 位于：

```text
.runtime/upstream/hermes-agent/gateway/platforms/api_server.py
```

已确认的真实 API 形态：

```text
GET  /health
GET  /v1/health
GET  /v1/models
GET  /v1/capabilities
POST /v1/chat/completions
POST /v1/responses
POST /v1/runs
GET  /v1/runs/{run_id}
GET  /v1/runs/{run_id}/events
POST /v1/runs/{run_id}/approval
POST /v1/runs/{run_id}/stop
```

本轮 Road to Summer 默认接 `POST /v1/chat/completions`，Provider 测试优先探测 `GET /v1/capabilities`，失败时可退到 `GET /v1/models`。

## Hermes 集成检查清单

需要在真实 Hermes 环境确认：

1. Hermes 是否可以本地部署。
2. Hermes 是否可以启用 Memory。
3. Hermes 是否可以启用 Sessions。
4. Hermes 是否可以安装自定义 Skill。
5. Hermes 是否可以通过 API Server 被调用。
6. Hermes 是否可以输出稳定 JSON。
7. Hermes 是否可以读取本地训练卡片文件。
8. Hermes 是否可以调用外部 Tool / MCP。
9. Hermes 是否已经支持 Voice Mode。
10. Hermes 是否已经支持 Vision / 图片 / 视频工具。

## 当前抽象

Gateway 使用 Provider 架构：

```ts
interface HermesProvider {
  sendMessage(input: HermesMessage): Promise<HermesResponse>
  test(): Promise<ProviderTestResult>
}
```

当前 Hermes provider：

```text
mock
hermes-api-server
openai-compatible-hermes
```

保留：

- `buildHermesMessage.ts`
- `parseHermesResponse.ts`
- `validateAgentOutput.ts`
- `mapAgentOutputToUi.ts`

## 启动 Hermes API Server

参考上游 CLI：

```bash
hermes setup
hermes gateway setup
hermes gateway run
```

在 Hermes gateway 中启用 API Server platform 后，默认地址是：

```text
http://127.0.0.1:8642/v1
```

如果设置了 API key，Road to Summer provider 需要配置同一个 key。Hermes API Server 支持：

- `Authorization: Bearer <key>`
- `X-Hermes-Session-Id`：会话连续性
- `X-Hermes-Session-Key`：长期 memory scope

Road to Summer 只在 provider 配置了 API key 时发送 session header，避免未开启 API key 的本地 Hermes 拒绝 session continuation header。

## Road to Summer 配置

配置方式一：前端 Settings 页面。推荐走这个方式，因为它会读取 Gateway 内置 provider presets。

```text
http://localhost:3000/settings
```

配置方式二：编辑 `.runtime/config.json` 并把 key 放在 `.runtime/secrets.env` 或环境变量。

示例：

```json
{
  "providers": {
    "hermes": {
      "active": "local-hermes",
      "instances": [
        {
          "id": "local-hermes",
          "type": "hermes-api-server",
          "label": "Local Hermes API Server",
          "baseUrl": "http://127.0.0.1:8642/v1",
          "model": "hermes-agent",
          "apiKeyRef": "HERMES_API_KEY",
          "endpointMode": "chat_completions"
        }
      ]
    }
  }
}
```

`.runtime/secrets.env`：

```text
HERMES_API_KEY="..."
```

## Hermes Runtime Model 配置

Gateway 的 `Hermes Provider` 只负责把 Road to Summer 消息发给 Hermes API Server；Hermes 自己调用哪个大模型，由 `Hermes Runtime Model` 配置负责。

本项目把这部分也纳入 Settings，不要求用户单独维护 Hermes 配置文件：

```text
GET /hermes-runtime
GET /hermes-runtime/presets
PUT /hermes-runtime
```

非敏感配置写入：

```text
.runtime/hermes-runtime.json
```

API key 和 Hermes 环境变量写入：

```text
.runtime/secrets.env
```

当前已支持 MiniMax preset：

```text
HERMES_INFERENCE_PROVIDER=minimax
HERMES_INFERENCE_MODEL=MiniMax-M2.7
MINIMAX_BASE_URL=https://api.minimax.io/anthropic
MINIMAX_API_KEY=<secret>
```

如果启动本地 Hermes API Server，需要让 Hermes 进程读取 `.runtime/secrets.env` 或等价环境变量；之后在 Settings 中把 `Hermes Provider` 从 `mock-hermes` 切到 `local-hermes`。

当前本机实测可用配置是 MiniMax CN Token Plan：

```text
HERMES_INFERENCE_PROVIDER=minimax-cn
HERMES_INFERENCE_MODEL=MiniMax-M2.7-highspeed
MINIMAX_CN_BASE_URL=https://api.minimaxi.com/anthropic
MINIMAX_CN_API_KEY=<secret>
```

原因：当前 Token Plan Key 来自 `platform.minimaxi.com`，使用 `https://api.minimaxi.com` 可返回 200；使用 global `https://api.minimax.io` 会返回 401。

Hermes API Server 启动命令：

```bash
set -a
. .runtime/secrets.env
set +a
API_SERVER_ENABLED=true \
API_SERVER_HOST=127.0.0.1 \
API_SERVER_PORT=8642 \
API_SERVER_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 \
uv run --project .runtime/upstream/hermes-agent hermes gateway run --accept-hooks
```

Road to Summer Gateway 当前应设置：

```text
Hermes Provider: local-hermes
baseUrl: http://127.0.0.1:8642/v1
timeoutMs: 180000
```

本地 Hermes 还需要能看到 Road to Summer skill pack：

```bash
rsync -av road-to-summer/hermes-extension/skills/road_to_summer/ ~/.hermes/skills/road_to_summer/
```

API Server adapter 依赖 `aiohttp`；如果上游 Hermes `.venv` 中缺失，执行：

```bash
uv pip install --python .runtime/upstream/hermes-agent/.venv/bin/python aiohttp==3.13.3
```

实测：

```text
GET /v1/capabilities -> 200
POST /chat "今天该练什么？" -> 200, training_plan, approximately 45s
```

## Voice Mode

如果 Hermes 原生支持 Voice Mode，可以用于快速验证端到端训练对话。

但手机 / Web 前端仍然需要独立语音按钮，因为：

- 训练中用户更适合按住说话。
- 前端需要显示转写结果。
- 用户可能需要确认或修改转写。
- ASR provider 需要可替换：mock、Whisper、豆包、OpenAI、Hermes 原生 Voice。

当前 Gateway ASR providers：

- `mock`
- `openai-whisper`
- `groq-whisper`
- `doubao-asr`：火山引擎大模型录音文件极速版识别 API。
- `local-whisper`

## Doubao ASR

Road to Summer 当前接入的是火山引擎“语音识别大模型 / 大模型录音文件极速版识别 API”。

默认 endpoint：

```text
https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash
```

默认 resource id：

```text
volc.bigasr.auc_turbo
```

鉴权：

- 新版控制台：API key 输入单个 `X-Api-Key`。
- 旧版控制台：API key 输入 `appKey:accessKey`，Gateway 会自动拆成 `X-Api-App-Key` 和 `X-Api-Access-Key`。

请求体使用 `audio.data` 传 base64 音频，返回 `result.text` 作为转写文本。

注意：官方极速版支持 WAV / MP3 / OGG OPUS。浏览器录音会优先尝试 `audio/ogg;codecs=opus`，不支持时退回 `audio/webm;codecs=opus`。如果账号或浏览器组合不接受 webm，需要后续在 Gateway 增加音频转码工具。

## Vision / Video

第一版不修改 Hermes Core。摄像头 / 视频输入先走外部 Vision / Pose Tool：

```text
Frontend CameraInputButton
  -> POST /vision/assess
  -> Vision/Pose Tool
  -> Hermes message
  -> plan_patch
```
