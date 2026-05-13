# Road to Summer Architecture

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
- 缓存轻量 UI 状态和训练卡片。

允许的轻量文件：

- `current_session.json`
- `current_plan.json`
- `training_cards/*.json`
- `mock_memory.json`

## 禁止范围

- 数据库。
- 传统后端。
- SaaS。
- 教练工作台。
- CRM。
- 排课、支付、会员。
- 重写 Hermes Memory / Session / Agent Runtime。

