# Modular Development Template

本文档定义 Road to Summer / Hermes Fitness Agent Extension 后续研发的分层模板。目标不是把项目变成传统 App 或 SaaS，而是让每次改动都能落在清晰层级里：Skill、Output Contract、Gateway、Provider、Memory 展示、Frontend、测试与运行。

## 1. 分层总览

```text
L0 Product Boundary
  -> L1 Hermes Skill Pack
  -> L2 Output Contract
  -> L3 UI Gateway Adapter
  -> L4 File-backed UI State
  -> L5 Frontend Experience
  -> L6 Provider Integrations
  -> L7 Tests / Docs / Runtime Ops
```

职责边界：

- `L0 Product Boundary`：定义只做健身 Agent 扩展，不做数据库、SaaS、教练工作台、CRM、排课、支付、会员。
- `L1 Hermes Skill Pack`：定义训练领域身份、工作流、训练规则、风险规则、记忆策略。
- `L2 Output Contract`：定义 Hermes 必须返回的 UI 可消费 JSON。
- `L3 UI Gateway Adapter`：构造 Hermes 输入、解析/修复/校验输出、更新轻量 UI 状态。
- `L4 File-backed UI State`：保存当前训练、当前计划、历史训练卡片、展示层缓存。
- `L5 Frontend Experience`：训练驾驶舱、历史记录、Memory 展示、Settings。
- `L6 Provider Integrations`：Hermes、ASR、Vision provider，可配置、可替换。
- `L7 Tests / Docs / Runtime Ops`：测试用例、运行说明、真实集成记录、项目记忆。

## 2. 目录归属

```text
road-to-summer/
  hermes-extension/skills/road_to_summer/   # L1 + L2 source of truth
  gateway/src/hermes/                       # L3 Hermes message and response path
  gateway/src/routes/                       # L3 API boundary
  gateway/src/storage/                      # L4 file-backed state, not database
  gateway/src/training/                     # L3/L4 training-specific guards and normalization
  gateway/src/providers/                    # L6 configurable provider layer
  frontend/src/app/                         # L5 route entrypoints
  frontend/src/components/                  # L5 reusable UI modules
  frontend/src/lib/                         # L5 API client and shared types
  docs/                                     # L7 architecture, setup, contracts, test reports
tests/                                      # L7 Gateway and integration contract tests
memory/tasks/fitness-agent-skill-workflow/  # project task memory
```

不要把同一个改动散落成隐式逻辑。每次变更先判断它属于哪一层，再决定最小改动面。

## 3. 新增 Skill Workflow 模板

适用场景：

- 新增一种用户意图，例如训练复盘、补录、恢复训练建议、竞品讨论。
- 改变训练计划生成逻辑。
- 改变训练中动态调整规则。
- 改变训练后记录或记忆更新语义。

标准改动顺序：

1. 在 `SKILL.md` 增加 workflow 入口、输入、输出和分类例子。
2. 在 `workflow.md` 写清事件识别、上下文读取、决策步骤和输出类型。
3. 在 `training_rules.md` 写领域规则，避免把训练逻辑藏在 Gateway 里。
4. 在 `risk_policy.md` 或 `memory_policy.md` 更新风险和记忆边界。
5. 在 `output_contract.md` 增加或修改 JSON schema。
6. 在 Gateway 校验、映射、状态更新路径中支持新输出。
7. 在 Frontend 增加对应显示组件或状态说明。
8. 在 `tests/hermesGateway.test.mjs` 或新增测试里覆盖场景。
9. 在 `memory/tasks/fitness-agent-skill-workflow/` 记录项目决策。

验收清单：

- Hermes 仍然只能输出合法 JSON，不把大段自然语言直接交给前端。
- 新 workflow 不会绕过 `time_context`、recent cards、preference/risk memory。
- 输出类型能被 Gateway 校验并映射。
- 前端能显示“为什么这么做”和“数据保存在哪里”。
- 没有新增数据库或 Hermes Runtime 重写。

## 4. 新增前端模块模板

前端不是普通聊天页，而是训练驾驶舱。新增组件时先选择组件类型：

```text
Display Component
  只接收 props，负责展示结构化数据，不直接请求 API。

Controller Component
  管理页面级状态、调用 API、处理 hydrate / refresh / save。

Input Component
  处理用户输入，如文本、语音、摄像头、快捷按钮。

Card Component
  展示训练计划、当前动作、训练记录、Memory snapshot 等领域对象。

Settings Component
  展示 provider 配置状态，提交配置变更，但不展示明文 API key。
```

推荐 props 结构：

```ts
type ModuleStatus = "idle" | "loading" | "ready" | "error";

type ModuleAction<T = unknown> = {
  type: string;
  payload?: T;
};

type DisplayModuleProps<T> = {
  data: T | null;
  status?: ModuleStatus;
  emptyState?: string;
  storagePath?: string;
  onAction?: (action: ModuleAction) => void;
};
```

前端设计规则：

- 默认走工作台式训练驾驶舱：信息密度高、清晰、克制，不做营销页。
- 页面需要显示状态来源：计划生成依据、最近训练来源、保存路径、更新时间。
- 卡片可以分块，但不要卡片套卡片。
- 训练计划和训练卡片必须支持 Markdown 或结构化分块展示。
- 关键页面必须有返回路径，不依赖浏览器返回键。
- 页面刷新后必须从 Gateway hydrate，不让当前训练状态凭空消失。
- 任何 API key 只允许通过 Settings 提交给 Gateway，不允许在前端展示明文。

## 5. 新增 Gateway Feature 模板

适用场景：

- 新增一个 route。
- 新增训练状态保存逻辑。
- 新增历史记录编辑/删除/导出。
- 新增 Memory 展示层整理逻辑。

标准链路：

```text
route
  -> input normalize
  -> context builder
  -> provider or storage call
  -> output validation
  -> UI mapping
  -> file-backed state update
  -> response
```

必须检查：

- route 不直接 import mock provider，统一走 `ProviderRegistry`。
- Gateway 可以修复和校验 Hermes 输出，但不能替 Hermes 做完整 Agent Runtime。
- 状态文件只作为 UI cache，不作为业务数据库。
- 写入长期 Memory 前需要用户确认，除非只是训练卡片或展示层缓存。
- 任何新增字段都要同步 `frontend/src/lib/types.ts`。

## 6. 新增 Memory Feature 模板

Memory 分三层，不要混在一起：

```text
Training Card
  单次训练事实，保存 JSON + Markdown。

Pending Memory Update
  Hermes 或 Gateway 提出的长期记忆候选，等待用户确认。

Memory Display Snapshot
  给前端展示的整理结果，可自动刷新，但不等于长期记忆写入。
```

写入规则：

- 稳定偏好、长期目标、场地限制、风险和反复反馈可以进入长期 Memory 候选。
- 当天器械占用、当天疲劳、一次性动作感受写入训练卡片。
- “晚上 7 点人很多”这类信息先写 observation，不直接升级为规则。
- 用户明确纠正偏好时，要生成可确认的结构化更新，并能替换旧的矛盾偏好。

## 7. 新增 Provider 模板

每个 provider 必须支持：

```ts
type ProviderInstanceConfig = {
  id: string;
  type: string;
  label: string;
  baseUrl?: string;
  model?: string;
  apiKeyRef?: string;
  timeoutMs?: number;
};
```

新增 provider 步骤：

1. 在 `gateway/src/providers/<category>/` 新建 provider class。
2. 在 `ProviderRegistry` 注册 type。
3. 在 provider presets 中增加推荐配置。
4. 在 Settings 表单支持必要字段。
5. 测试 `POST /providers/:category/test`。
6. 确认响应不包含明文 API key。

Provider 边界：

- Hermes provider 只负责调用 Hermes 或兼容 API，不实现训练逻辑。
- ASR provider 只返回转写文本和基础元数据，不直接改训练计划。
- Vision provider 只返回结构化动作评估，不直接替换 Hermes 判断。

## 8. 新增 Output Type 模板

新增输出类型时必须同时改：

```text
road-to-summer/hermes-extension/skills/road_to_summer/output_contract.md
road-to-summer/gateway/src/ui/validateAgentOutput.ts
road-to-summer/gateway/src/ui/mapAgentOutputToUi.ts
road-to-summer/frontend/src/lib/types.ts
对应前端组件
tests/
```

输出类型设计要求：

- `type` 必须稳定。
- 顶层必须有 `chat_message`，但业务数据不能只放在 `chat_message`。
- 计划、补丁、训练卡、复盘等领域数据必须结构化。
- 需要保存的内容必须明确保存目标和确认要求。

## 9. 研发链路

后续每个需求按这个流程推进：

```text
1. classify
   判断需求属于 Skill / Contract / Gateway / Frontend / Provider / Memory / Ops。

2. design slice
   写清本次只改哪一层，是否需要跨层同步。

3. implement
   按模板改最小文件集合。

4. verify
   跑测试、构建、必要的真实 Hermes smoke test 和浏览器检查。

5. document
   更新 docs 和项目 memory，避免结论只留在对话。

6. handoff
   给出 changed files、verification、mock/real boundary、next step。
```

需求分类参考：

```text
计划生成不合理
  -> Skill rules + Gateway quality guard + output display basis

前端看不懂为什么生成
  -> Output Contract + Gateway mapping + Frontend display

页面刷新状态丢失
  -> File-backed UI State + Frontend hydrate

ASR / Hermes / Vision 更换供应商
  -> Provider layer + Settings + route tests

历史记录日期错误
  -> Time Context + Training Card store + History UI

Memory 没有更新
  -> Memory policy + pending updates + confirmation flow + display snapshot
```

## 10. 验证链路

常规验证：

```bash
npm test
npm run build --prefix road-to-summer/frontend
git diff --check
```

真实链路验证：

```text
1. 启动 Hermes API Server。
2. 启动 Road to Summer Gateway。
3. 启动 Frontend。
4. Settings 确认 Hermes / ASR / Vision active provider。
5. /training 发起明确日期的计划生成。
6. 触发器械占用、疲劳、动作 cue、训练结束。
7. /history 检查 JSON + Markdown 训练卡。
8. /memory 检查 pending updates 和 display snapshot。
```

每次跨层改动至少保留一条测试用例，避免只靠手工试。

## 11. 禁止模式

- 不要新增数据库来解决展示或状态问题。
- 不要把 Gateway 做成传统业务后端。
- 不要让前端直接调用用户模型 API key。
- 不要让 Hermes 原始文本直接进入 UI。
- 不要把临时 observation 自动升级为稳定规则。
- 不要在用户没有明确开始训练时自动生成计划。
- 不要生成没有 recent-training basis 的计划。
- 不要把竞品分析混进训练计划主链路；需要时做独立 Skill workflow。

## 12. 推荐重组方向

下一轮重构可以按以下切片推进：

```text
frontend/src/components/training/
  TrainingCockpit.tsx
  CurrentPlanCard.tsx
  CurrentExerciseCard.tsx
  ChatPanel.tsx
  QuickActionBar.tsx

frontend/src/components/history/
  TrainingHistoryList.tsx
  TrainingCardView.tsx
  TrainingCardEditor.tsx

frontend/src/components/memory/
  MemoryPanel.tsx
  MemorySnapshotSection.tsx
  PendingMemoryUpdates.tsx

frontend/src/components/settings/
  ProviderSettingsPanel.tsx
  HermesRuntimePanel.tsx

gateway/src/training/
  timeContext.ts
  planQuality.ts
  trainingCardMarkdown.ts

gateway/src/memory/
  memoryDisplayPolicy.ts
  memoryMutationPolicy.ts
```

先做目录重组时不要顺手改业务逻辑；先移动并保持测试通过，再做功能改造。
