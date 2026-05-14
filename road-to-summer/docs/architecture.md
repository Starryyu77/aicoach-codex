# Road to Summer Architecture

后续研发入口：

- 模块化研发模板：`road-to-summer/docs/modular_development_template.md`
- 前端规范：`road-to-summer/docs/frontend_spec.md`
- 输出协议索引：`road-to-summer/docs/output_contract.md`
- Agent UI Schema：`road-to-summer/docs/agent_ui_schema.md`
- Hermes 设置：`road-to-summer/docs/hermes_setup.md`

第一版架构：

```text
Mobile / Web Frontend
  -> Road to Summer UI Gateway
  -> Hermes API Server / Hermes Gateway
  -> Hermes Agent
  -> Road to Summer Skill Pack
  -> Hermes Memory / Sessions / Tools
```

## Hermes 负责

- Agent Runtime
- Memory
- Sessions
- Skills
- Tools
- 模型调用
- 长期记忆保存
- 训练相关 Skill 调用

## Road to Summer 负责

- 健身 Skill Pack
- Training Cockpit 前端
- 语音输入模块
- 摄像头 / 视频输入接口
- 训练计划卡片 UI
- 历史训练卡片 UI
- Hermes 输出格式约束
- Hermes 输入事件适配

## UI Gateway

UI Gateway 不是传统业务后端，不连接数据库。

它只负责：

- 接收文本输入。
- 接收语音输入并调用 ASR。
- 接收摄像头 / 视频输入并调用 Vision / Pose Tool。
- 构造 Hermes message。
- 调用 Hermes API。
- 校验 Hermes JSON。
- 映射成前端 UI 数据。
- 编译 A2UI-inspired `AgentUiDocument`，让前端按受控 JSON 渲染动态训练界面。
- 缓存轻量 UI 状态和训练卡片。
- 管理 provider 配置和 secret 引用。
- 暴露 provider presets，让前端可做一体化配置向导。

每个 Gateway 改动必须落在以下链路之一：

```text
route -> input normalize -> context builder -> provider/storage -> validation -> UI mapping -> file-backed state
```

如果变更跨越 Skill、Contract、Gateway 和 Frontend，请先按 `modular_development_template.md` 的分层模板拆分。

## Agent UI Layer

Road to Summer adopts an A2UI-inspired pattern:

```text
Hermes domain JSON
  -> Gateway validates and maps domain state
  -> Gateway builds AgentUiDocument
  -> Frontend AgentUiRenderer renders allowlisted components
```

Current policy:

- Hermes still returns domain JSON: `training_plan`, `plan_patch`, `training_card`, or `training_review`.
- Gateway compiles this domain JSON into `ui.agent_ui`.
- The frontend renders only local, trusted component types such as `plan_sections`, `patch_card`, `current_exercise`, and `action_row`.
- No arbitrary HTML, JavaScript, iframe, or model-generated code is executed.

This gives us dynamic UI without turning the project into a generic app builder.

## Time Context Layer

Gateway owns date normalization before calling Hermes:

```text
用户输入 / 前端选定日期
  -> buildTimeContext
  -> HermesMessage.time_context
  -> Skill Pack temporal rules
  -> training_plan.target_date / training_card.date
```

`time_context` includes:

- `timezone`
- `today`
- `target_date`
- `target_date_label`
- `target_offset_days`
- `temporal_intent`
- `mentioned_terms`

Rules:

- 明天 / 后天：默认生成未来 `training_plan`。
- 昨天 / 前天 / 两天前 + 补录 / 总结 / 练完：生成对应日期的 `training_card`。
- Gateway 在保存前补齐或修正 `plan_card.target_date` 与 `training_card.date`，避免真实 Hermes 把补录内容存到错误日期。

## Provider Layer

Gateway 通过 `ProviderRegistry` 获取 active provider，route 不直接 import mock：

```text
ProviderRegistry
  -> HermesProvider
     - mock
     - hermes-api-server
     - openai-compatible-hermes
  -> AsrProvider
     - mock
     - openai-whisper
     - groq-whisper
     - doubao-asr
     - local-whisper
  -> VisionProvider
     - mock
     - external-pose-http
```

配置文件：

- `.runtime/config.json`：只保存非敏感 provider 配置。
- `.runtime/secrets.env`：保存 API key，或从环境变量读取。

前端 Settings 页面只显示 `hasApiKey`，不读取或展示明文 API key。

## Setup Flow

第一版设置流程在 Road to Summer 项目内完成：

```text
Settings
  -> GET /providers/presets
  -> 用户选择 Hermes / ASR / Vision 模板
  -> 填 baseUrl / model / API key
  -> POST /providers/:category/instances
  -> PUT /providers/:category/active
  -> POST /providers/:category/test
```

用户不需要直接编辑 Hermes config；Gateway 只作为配置和调用适配层，不重写 Hermes Runtime。

允许的轻量文件：

- `current_session.json`
- `current_plan.json`
- `training_cards/*.json`
- `mock_memory.json`
- `.runtime/config.json`
- `.runtime/secrets.env`

## 禁止范围

- 数据库。
- 传统后端。
- SaaS。
- 教练工作台。
- CRM。
- 排课、支付、会员。
- 重写 Hermes Memory / Session / Agent Runtime。
