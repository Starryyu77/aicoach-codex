# Hermes Setup

当前仓库没有绑定真实 Hermes Runtime。第一版通过 `MockHermesClient` 跑通 Gateway 和 Frontend。

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

Gateway 使用：

```ts
interface HermesClient {
  sendMessage(input: HermesMessage): Promise<HermesResponse>
}
```

真实 Hermes 接入时替换：

```text
road-to-summer/gateway/src/hermes/HermesClient.ts
```

保留：

- `buildHermesMessage.ts`
- `parseHermesResponse.ts`
- `validateAgentOutput.ts`
- `mapAgentOutputToUi.ts`

## Voice Mode

如果 Hermes 原生支持 Voice Mode，可以用于快速验证端到端训练对话。

但手机 / Web 前端仍然需要独立语音按钮，因为：

- 训练中用户更适合按住说话。
- 前端需要显示转写结果。
- 用户可能需要确认或修改转写。
- ASR provider 需要可替换：mock、Whisper、豆包、OpenAI、Hermes 原生 Voice。

## Vision / Video

第一版不修改 Hermes Core。摄像头 / 视频输入先走外部 Vision / Pose Tool：

```text
Frontend CameraInputButton
  -> POST /vision/assess
  -> Vision/Pose Tool
  -> Hermes message
  -> plan_patch
```

