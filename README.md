# Road to Summer Fitness Agent

本仓库当前先实现「运动健身 AI Agent / Skill / Workflow」的本地 Codex 原型，不做完整 App、教练工作台、SaaS 后台、CRM、排课、支付或会员系统。

## 运行

```bash
npm test
npm run cli -- "今天该练什么？"
npm run cli -- "高位下拉和绳索划船有人了。"
npm run cli -- "我感觉不到背阔肌发力。"
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

