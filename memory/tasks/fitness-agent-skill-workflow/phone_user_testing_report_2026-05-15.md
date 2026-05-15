# 测试报告 - Road to Summer Phone UI - 2026-05-15

## 概要

- 测试时长: 约 35 分钟
- 测试方式: Google Chrome + Computer Use，按真实用户方式操作 UI
- 测试环境: 本地开发环境 `http://localhost:3000/phone`
- Provider: 真实 `minimax-cn · MiniMax-M2.7-highspeed`
- 测试账号: 不涉及登录
- 发现问题总数: 5 个（P0: 2, P1: 2, P2: 1）

## 测试范围

- `/phone` 手机训练入口
- 新对话、刷新恢复
- 生成计划
- 文本聊天反馈，不测语音
- 肌群选择器
- 摄像头入口的无计划状态
- `/history -> /phone` 导航恢复
- 结束并保存训练
- 历史训练卡片保存

## 通过项

- `新对话 -> 刷新` 后没有恢复旧计划。
- 真实 Hermes 可以生成计划，没有走本地 fallback。
- `太轻了` 反馈后，当前动作从 `下肢恢复状态快速检查` 变为 `全身活动度循环`。
- `太轻了` 的当前动作变化刷新后保留。
- `/history -> /phone` 后聊天记录和当前 session 状态保留。
- `结束并保存` 后当前 plan dock 消失。
- 结束后刷新 `/phone` 没有恢复 ended plan dock。
- 历史页写入新训练卡 `road-to-summer/gateway/state/training_cards/card-1778836160289.json`。

## 问题列表

### [UT-001] 对话声称动作已替换，但当前计划没有更新

- **严重程度**: P0 致命
- **类别**: 业务逻辑
- **环境**: Chrome，本地 `http://localhost:3000/phone`
- **复现步骤**:
  1. 生成 `2026-05-15` 训练计划。
  2. 输入 `太轻了`，等待 Hermes 返回。
  3. 输入 `把当前动作换成台阶上步`，等待 Hermes 返回。
  4. 点击返回的 quick action `确认台阶上步`。
- **预期结果**: 当前计划 dock 的当前动作应变为 `台阶上步`，或者明确告诉用户替换未应用。
- **实际结果**: 聊天文案说 `当前全身活动度循环替换为台阶上步`，但结构化 UI 和当前计划 dock 仍显示 `全身活动度循环`。
- **证据**:
  - 训练中 UI: agent text 说已替换，dock 仍是 `全身活动度循环`。
  - 结束后的历史卡又包含 `台阶上步` 和 `replace_exercise`，说明 live current plan 和 final training card 状态不一致。
- **影响**: 用户会以为当前动作已经换了，但主 UI 仍指导旧动作，训练中执行状态不可信。
- **建议**: `plan_patch` 应用失败时不要渲染成功文案；成功时必须同步 `current_plan` / `plan_card` / dock 的 current item。

### [UT-002] ended 会话中用肌群选择生成新计划，会复活旧计划卡并产生状态撕裂

- **严重程度**: P0 致命
- **类别**: 业务逻辑
- **环境**: Chrome，本地 `http://localhost:3000/phone`
- **复现步骤**:
  1. 完成一次训练并点击 `结束并保存`。
  2. 刷新 `/phone`，确认没有当前 plan dock。
  3. 点击 `肌群选择`。
  4. 选择 `胸部` 并点击 `确认`。
  5. 等待 Hermes 返回。
- **预期结果**: 要么开启一个干净的新训练 session 并生成胸部计划，要么提示必须先点 `新对话`。
- **实际结果**:
  - 聊天中新增用户消息 `我想在 2026-05-15 训练：胸部...`。
  - Hermes 文案说 `已为 2026-05-15 生成胸部专项训练计划`。
  - 但结构化回复和 dock 显示旧的 `2026-05-15 恢复与功能维护`，当前动作仍是 `下肢恢复状态快速检查`。
  - 本地状态变为 `phase=warmup`，`current_session.current_plan=null`，但 `plan_card.title=2026-05-15 恢复与功能维护`，并重新写出 `current_plan.json` 旧计划。
- **证据**:
  - `road-to-summer/gateway/state/current_session.json`: `phase=warmup`, `current_plan=null`, `plan_card.title=2026-05-15 恢复与功能维护`。
  - `road-to-summer/gateway/state/current_plan.json`: `title=2026-05-15 恢复与功能维护`。
- **影响**: 结束后的会话可以被普通 UI 操作重新拉回半活跃状态，且用户看到的是胸部计划文案和恢复计划 dock 的混合状态。
- **建议**: ended session 后的任何生成入口都必须先 reset/new session，或后端拒绝在 ended session 上继续生成。

### [UT-003] 目标日期文案不一致

- **严重程度**: P1 严重
- **类别**: 业务逻辑 / 文案
- **环境**: Chrome，本地 `http://localhost:3000/phone`
- **复现步骤**:
  1. 新对话。
  2. 目标日期保持 `2026-05-15`。
  3. 点击 `生成计划`。
- **预期结果**: 用户文案、计划标题、dock 目标日期都应一致为 `2026-05-15`。
- **实际结果**: 用户消息是 `请按 2026-05-15 生成训练计划`，计划标题/dock 是 `2026-05-15`，但 agent 文案说 `已为 2026-05-16 生成训练计划`。
- **影响**: 用户无法判断实际计划日期，尤其训练历史和跨天恢复建议会被混淆。
- **建议**: route 层对 provider display text 做目标日期一致性校验，或在 prompt/contract 中禁止 provider 自行偏移日期。

### [UT-004] 无当前计划时摄像头入口仍直接显示“打开摄像头”

- **严重程度**: P1 严重
- **类别**: 业务逻辑 / 隐私边界
- **环境**: Chrome，本地 `http://localhost:3000/phone`
- **复现步骤**:
  1. 结束训练并刷新 `/phone`。
  2. 当前 UI 显示 `等待计划`。
  3. 点击 `摄像头`。
- **预期结果**: 明确提示 `先生成或恢复一个训练计划`，不要引导用户打开摄像头。
- **实际结果**: 页面直接展开 `摄像头输入` 面板，并显示 `打开摄像头` 按钮。
- **影响**: 用户可能在没有动作目标时授权摄像头；系统也缺少“当前要评估哪个动作”的上下文。
- **建议**: 无 active current item 时隐藏摄像头启动按钮，只显示解释性提示。

### [UT-005] 历史卡合并同日旧训练与当前训练，产品边界不清晰

- **严重程度**: P2 一般
- **类别**: 业务逻辑 / 信息架构
- **环境**: Chrome，本地 `http://localhost:3000/history`
- **复现步骤**:
  1. 生成并结束 `恢复与功能维护` 训练。
  2. 进入 `/history`。
- **预期结果**: 若只保存当前 phone session，训练卡应只包含当前恢复训练；若设计为同日汇总，应在 UI 标明“今日汇总卡”。
- **实际结果**: 新卡标题为 `上肢拉力·核心稳定·心肺激活 + 恢复与功能维护`，实际完成中同时包含早些时候的上肢训练和本次恢复训练。
- **影响**: 用户难以区分“本次训练记录”和“同日汇总记录”，后续修改/删除也会更危险。
- **建议**: 分离 `session card` 与 `daily summary card`，或者在保存前给用户确认。

## 未覆盖范围

- 未实际打开摄像头权限。
- 未测试语音转文字。
- 未测试两个 Chrome 标签页并发操作。
- 未测试移动真实设备或 Chrome DevTools 375x667 视口。
- 未测试断网/慢网。
- 未读取浏览器 console 日志；本轮主要基于 UI 和本地 state 文件验证。

## 整体评估

当前实现的 happy path 已经能跑通，但还不适合合并为稳定版本。最大风险不是 UI 细节，而是 session 状态机：ended session、plan_card、current_plan、chat text、history card 之间会出现明显不一致。

建议优先修复顺序：

1. `UT-002`: ended session 不允许继续生成并复活旧 plan。
2. `UT-001`: plan replacement 必须同步 live current plan，否则不要声称成功。
3. `UT-003`: target date 一致性。
4. `UT-004`: camera no-plan 边界。
5. `UT-005`: 历史卡是否合并同日训练需要产品决策。
