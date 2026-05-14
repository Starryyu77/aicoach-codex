# Frontend Spec

前端后续重组和新增模块时，优先参考：

```text
road-to-summer/docs/modular_development_template.md
```

## Routes

- `/training`: Training Cockpit
- `/history`: Training card history
- `/memory`: Hermes Memory / mock memory display
- `/settings`: Provider and Hermes Runtime settings

## Component Layers

组件按职责拆分，不要把 API、状态保存、展示和输入混在一个组件里：

```text
Controller Component
  页面级状态、hydrate、API 调用、保存/刷新动作。

Display Component
  只接收 props，渲染结构化数据，不直接请求 API。

Input Component
  文本、语音、摄像头、快捷按钮等输入。

Card Component
  训练计划、当前动作、训练记录、Memory snapshot 等领域对象。

Agent UI Component
  只渲染 Gateway 返回的受控 `AgentUiDocument`，不执行模型生成代码。

Settings Component
  Provider 配置状态和测试，不展示明文 API key。
```

推荐 props:

```ts
type DisplayModuleProps<T> = {
  data: T | null;
  status?: "idle" | "loading" | "ready" | "error";
  emptyState?: string;
  storagePath?: string;
  onAction?: (action: { type: string; payload?: unknown }) => void;
};
```

## Training Cockpit

Top:

- 今日训练主题。
- 当前训练目标。
- 当前训练进度。
- 风险提醒。

Middle:

- 当前计划卡片。
- 当前动作卡片。
- 当前动作组数 / 次数 / 强度 / 休息。
- 动作 cue。
- 替代动作。

Lower:

- 对话区。
- 用户输入。
- AI 回复。
- 训练调整记录。
- Agent UI Surface：根据 `ui.agent_ui` 渲染 Hermes 当前输出对应的计划、patch、按钮、训练卡或记忆提醒。

Bottom:

- 语音按钮。
- 文字输入。
- 摄像头按钮。
- 快捷操作按钮。

Quick actions:

- 完成本组
- 太轻了
- 太重了
- 感觉不到目标肌肉
- 有点累
- 有点疼
- 器械被占用
- 换动作
- 打开摄像头
- 结束训练

## Design Rules

- 这是训练驾驶舱，不是普通聊天页，也不是营销首页。
- 动态 UI 必须走 `AgentUiRenderer` + 组件白名单，不允许把模型生成的 HTML / JS 直接插到页面。
- 计划卡必须显示生成依据：目标日期、最近训练来源、风险提醒、质量检查。
- 历史训练卡必须显示保存位置，并支持查看 Markdown / JSON 结构。
- Memory 页面展示的是整理后的 snapshot，不等于自动写入长期 Memory。
- 页面刷新后必须从 `/session/current` hydrate。
- 页面必须有返回路径，不能依赖浏览器返回键。
- API key 只能提交到 Gateway，前端只显示 `hasApiKey`。
- 卡片可以分块，但不要做卡片套卡片。
