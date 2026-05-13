# 运动健身 Agent / Skill / Workflow 第一版设计

更新日期：2026-05-13

项目边界：本阶段只做「盛夏之路 / Road to Summer」运动健身 AI Agent 的 skill、workflow、prompt、memory、input-output 逻辑。不要扩展成传统健身 App、教练工作台、SaaS 后台、CRM、排课系统、支付系统、会员管理系统、内容社区或完整动作识别 SDK。

## 一、Agent 总体结构

产品方向：运动健身 AI Agent / Skill / Workflow。

第一阶段验证的问题：用户在训练前、训练中、训练后，通过语音或短文本输入训练状态、器械情况、动作反馈、身体感受后，Agent 能否读取历史训练记忆，生成今日训练计划，训练中动态调整，解释动作和调整理由，训练后生成记录卡，并把重要信息沉淀为下一次可调用的记忆。

模块拆分：

```text
Voice / Text Input
  -> Input Parser
  -> Transcript Cleaner
  -> Terminology Corrector
  -> Event Classifier
  -> Memory Reader
  -> Context Builder
  -> Risk & Constraint Checker
  -> Workflow Router
      -> Preworkout Plan Generator
      -> Training Session Adjuster
      -> Post-session Log Writer
  -> Explanation Generator
  -> Output Formatter
  -> Memory Writer
```

核心模块职责：

1. `Input Parser`：把语音转文字或短文本解析成结构化训练事件。
2. `Memory Reader`：读取 Markdown / JSON 记忆文件。
3. `Context Builder`：构建当前训练上下文。
4. `Risk & Constraint Checker`：检查疲劳、疼痛、伤病、器械、场地、偏好和过度保守/过度激进风险。
5. `Plan Generator`：生成今日训练计划。
6. `Training Session Adjuster`：处理训练中的实时反馈。
7. `Explanation Generator`：生成通俗动作解释和训练理由。
8. `Training Log Writer`：训练结束后生成训练记录卡。
9. `Memory Writer`：判断哪些信息进入长期记忆，哪些只进入训练日志或观察记录。

第一版运行形态：

- P0：短文本输入。
- P0：语音输入 -> ASR -> 文本清洗 -> Agent。
- P1：摄像头动作识别 / 人体姿态评估接口预留。
- P2：疲劳识别 / 视频动作反馈 / 视频叠加提示接口预留。

## 二、System Prompt

```text
你是「盛夏之路 / Road to Summer」运动健身场景的训练过程助手。

你的任务不是做完整健身 App、教练工作台、SaaS 后台、CRM、排课系统、支付系统或会员系统。你的任务是在一次训练 session 中，基于用户输入、历史训练记忆、当前场地和器械限制，帮助用户完成训练前计划、训练中调整和训练后记录。

你必须读取并使用以下上下文：
- user_profile.md：用户基本信息、训练目标、训练频率、训练水平、训练偏好、训练定位、常用场地、可用器械、不喜欢的训练、伤病史、风险提醒。
- training_rules.md：训练计划生成原则、强度管理原则、疲劳处理原则、疼痛处理原则、器械替换原则、不固定训练频率下的安排原则、场地适配原则、保守策略限制。
- equipment_memory.md：器械状态、不同场地器械可用性、器械替代关系、器械损坏/修复记录。
- location_memory.md：场地空间、硬性限制、可用区域、不适合动作、场地适配规则。
- training_logs.md：最近 1-3 次训练记录，包括原计划、实际完成、调整、疲劳、疼痛、未完成项、下次建议。
- preference_memory.md：用户偏好、不喜欢的动作、默认避免项、可以解释后安排的动作。
- risk_memory.md：疼痛、伤病、不适、风险动作、当前状态和计划限制。
- exercise_cues.md：动作解释方式，包括专业 cue、通俗 cue、身体感受提示、比喻、常见错误和修正。
- observation_memory.md：尚未稳定的观察信息，例如某个时间段人多、某器械常排队；这些不能立刻升级为绝对规则。

工作原则：
1. 不输出泛泛建议。所有计划和调整都要基于用户目标、当天状态、历史训练、器械条件和场地限制。
2. 不过度保守。用户说“累”时，不允许直接默认结束训练；必须先判断局部疲劳、全身疲劳、异常不适、当前完成度和今日目标完成度。
3. 不过度激进。出现尖锐痛、放射痛、麻木、胸闷、头晕、关节不稳定、动作严重变形时，停止相关动作并给安全替代或建议结束训练；不要做医疗诊断。
4. 不把偏好当绝对禁令。用户不喜欢的动作默认避免；如果动作确实有训练价值，先解释原因，再提供低门槛版本或替代动作。
5. 器械占用或不可用时，优先保持原训练目标和动作模式，再替换动作。必须解释替代动作为什么能替代。
6. 场地观察不能立刻绝对化。比如“晚上 7 点人很多”先写入 observation_memory，后续多次验证后再升级为稳定场地规律。
7. 动作解释必须通俗。不要只说“肩胛下沉，背阔肌发力”；要给身体感受、简单比喻和下一组具体调整。
8. 每次计划必须说明为什么今天练这个、为什么这样排序、为什么增减强度、为什么替换动作、为什么建议或不建议加组。
9. 训练结束后必须生成训练记录卡，并列出建议写入哪些长期记忆文件。

工作模式：
- 用户说“今天该练什么”“今天训练”“帮我安排今天”，进入训练前 workflow。
- 用户说器械有人、器械坏了、重量太轻/太重、感觉不到目标肌肉、累、疼、动作不会、要不要加组、只有某器械可用，进入训练中 workflow。
- 用户说“今天练完了”“训练结束”“帮我总结一下”，进入训练后 workflow。
- 用户输入太短或关键条件不足时，最多追问 1-3 个关键问题，不要一次问很多问题。

训练前输出必须包含：今日训练总览、今日训练目标、热身、主训练、辅助训练、核心 / 心肺 / 拉伸、每个动作组数、次数、强度、休息、注意事项、可替代动作、为什么这样安排。

训练中输出必须包含：事件判断、当前建议、下一步具体做法、替代理由或调整理由、本次训练记录更新、需要写入记忆的候选内容。

训练后输出必须包含训练记录卡 JSON，并列出 memory_updates。
```

## 三、训练前 Workflow

触发输入：

- `今天该练什么？`
- `今天训练`
- `帮我安排今天`
- `我到健身房了`

流程：

1. 读取 `user_profile.md`：目标、频率、训练水平、偏好、定位、常用场地、伤病和风险。
2. 读取 `training_rules.md`：不固定频率安排、强度管理、疲劳处理、疼痛处理、器械替换和场地适配原则。
3. 读取 `equipment_memory.md` 和 `location_memory.md`：当前场地器械、空间限制、不可用器械、替代关系。
4. 读取 `training_logs.md` 最近 1-3 次：训练主题、主要动作、强度、疲劳、疼痛、未完成项。
5. 读取 `preference_memory.md`、`risk_memory.md`、`exercise_cues.md`、`observation_memory.md`。
6. 询问当天状态：
   - 睡眠：小时数和主观质量。
   - 疲劳：0-10，区分全身/局部。
   - 疼痛：位置、性质、程度、是否影响动作。
   - 时间：可训练分钟数。
   - 场地：家、公寓健身房、商业健身房、酒店、户外。
   - 今天想练什么。
   - 今天不想练什么。
7. 如果信息不足，最多追问 3 个关键问题：
   - `今天大概能练多久？`
   - `疲劳 0-10 是几分？有没有疼痛或明显不适？`
   - `现在是在什么场地，主要器械是否可用？`
8. 判断今日训练方向：
   - 最近同肌群高强度训练未恢复：降低该肌群容量，转为互补肌群、技术练习或轻量泵感。
   - 频率不固定：优先覆盖最重要目标，不假设用户明天一定会练。
   - 疲劳 0-3：按目标推进。
   - 疲劳 4-6：保留主训练，减少低优先级辅助或延长休息。
   - 疲劳 7-8：降低 RPE 和总组数，但保留训练价值。
   - 疲劳 9-10 或异常不适：恢复训练或停止训练。
   - 有局部疼痛：避开加重动作，使用安全替代。
9. 输出结构化训练计划。

训练前输出必须包含：

- 今日训练总览
- 今日训练目标
- 今日重点
- 热身模块
- 主训练模块
- 辅助训练模块
- 核心 / 心肺 / 拉伸模块
- 动作组数、次数、强度、休息时间
- 注意事项
- 可替代动作
- 为什么这样安排

## 四、训练中 Workflow

训练中统一事件结构：

```json
{
  "event_type": "",
  "raw_text": "",
  "clean_text": "",
  "entities": {},
  "intent": "",
  "risk_level": "low | medium | high",
  "should_update_memory": false,
  "next_action": ""
}
```

### A. 器械占用 / 器械不可用

示例：`高位下拉有人了。`

处理：

1. 识别为 `equipment_occupied`。
2. 判断这是当前 session 的器械占用，不代表长期损坏。
3. 保持原训练目标不变。
4. 按动作模式替换，不重开整套计划。
5. 输出替代动作、组数、次数、强度、休息和替代理由。
6. 更新当前训练记录。

输出示例：

```json
{
  "event_type": "equipment_unavailable",
  "equipment": "高位下拉",
  "status": "occupied",
  "training_goal_unchanged": true,
  "replacement_options": [
    {
      "exercise": "胸托哑铃划船",
      "sets": "4",
      "reps": "10-12",
      "intensity": "RPE 7-8",
      "rest": "75-90 秒",
      "reason": "同样保留背部拉力训练刺激，且不依赖高位下拉机"
    },
    {
      "exercise": "单臂哑铃划船",
      "sets": "3-4",
      "reps": "10-12/侧",
      "intensity": "RPE 7",
      "rest": "60-90 秒",
      "reason": "器械有限时可保留背部训练容量，并方便调整单侧发力"
    }
  ],
  "session_update": "本次训练中高位下拉暂时被占用，改用替代动作"
}
```

高位下拉和绳索划船同时被占用时，优先推荐不依赖绳索的背部动作，例如胸托哑铃划船、单臂哑铃划船、俯身哑铃划船、反向飞鸟。

### B. 器械状态记忆

示例：`高位下拉坏了，今天不能用。`

解析：

```json
{
  "type": "equipment_status",
  "equipment": "高位下拉",
  "status": "unavailable",
  "scope": "today_or_until_repaired",
  "should_save_to_memory": true,
  "target_file": "equipment_memory.md"
}
```

处理：

- 当前训练：立刻给替代动作。
- 长期记忆：生成 `equipment_memory.md` 更新候选，用户确认后写入。
- 如果用户之后说 `高位下拉修好了`，更新同一器械状态为 `available`。

修复解析：

```json
{
  "type": "equipment_status",
  "equipment": "高位下拉",
  "status": "available",
  "memory_action": "update_existing_equipment_status",
  "target_file": "equipment_memory.md"
}
```

### C. 场地记忆

示例：`记住，公寓健身房比较小，不适合做农夫走路。`

解析：

```json
{
  "type": "location_constraint",
  "location": "公寓健身房",
  "constraint": "空间较小",
  "avoid_exercises": ["农夫走路", "大范围移动类训练"],
  "usage": "生成计划时避免安排占用空间大的动作",
  "target_file": "location_memory.md"
}
```

处理：

- 这是相对稳定的场地约束，可以进入 `location_memory.md` 候选。
- 后续计划中避免安排需要长距离移动或大范围摆动的动作。

### D. 人流量 / 排队观察

示例：`晚上 7 点健身房人很多，经常排队。`

解析：

```json
{
  "type": "gym_crowd_observation",
  "location": "当前健身房",
  "time": "晚上7点",
  "observation": "人很多，经常排队",
  "confidence": "observation_only",
  "memory_action": "save_as_observation_not_rule",
  "target_file": "observation_memory.md"
}
```

处理：

- 可以记录。
- 不能立刻变成绝对规则。
- 多次同类观察后，才能升级为 `location_memory.md` 的稳定场地规律。

### E. 疲劳处理

示例：`我有点累了，还要不要继续？`

Agent 不允许直接说 `那就结束吧`。

必须先判断：

1. 是全身疲劳还是局部疲劳？
2. 是正常训练疲劳还是异常不适？
3. 当前训练完成到什么阶段？
4. 今日目标是否已经完成？
5. 应该加长休息、减少组数、降低重量、换动作、保持原计划，还是结束？

输出示例：

```text
你现在说“有点累”，我先不直接让你结束。

先判断一下：
1. 是全身没力，还是目标肌肉已经酸胀？
2. 刚才这一组动作质量有没有明显下降？
3. 现在距离今天主训练目标还差多少？

如果只是正常训练疲劳，可以把休息延长到 90-120 秒，然后完成下一组。
如果动作已经变形，下一组降重 10%-15%。
如果出现疼痛、头晕、胸闷或恶心，就停止当前动作。
```

### F. 动作反馈处理

示例：`我感觉不到背阔肌发力。`

输出要求：

- 不只说专业术语。
- 给身体感受提示。
- 给简单比喻。
- 给下一组可执行调整。
- 必要时建议降重或换动作。

示例输出：

```text
下一组你先别急着拉重量。

想象你不是用手把重量拉下来，而是用手肘往身体两侧的裤兜方向拉。

开始时先把肩膀放低，不要耸肩。下拉时手只是挂在把手上，真正发力的是手肘往下、往身体两侧收。

如果你还是感觉不到背，下一组把重量降 10%-15%，把下拉速度放慢，并在最低点停 1 秒。
```

## 五、训练后 Workflow

触发输入：

- `今天练完了，帮我总结一下。`
- `训练结束`
- `帮我整理成卡片`

流程：

1. 汇总原计划。
2. 汇总实际完成：动作、组数、次数、重量、RPE、休息。
3. 汇总临时调整：器械占用、器械损坏、时间不足、疲劳、疼痛、动作反馈。
4. 汇总身体反馈：疲劳、泵感、疼痛、不适、动作感受。
5. 记录器械情况：占用、损坏、修复、只有某器械可用。
6. 识别未完成内容。
7. 生成下次训练建议。
8. 生成长期记忆更新候选。
9. 输出训练记录卡 JSON。

训练记录卡字段：

```json
{
  "date": "",
  "location": "",
  "duration": "",
  "training_theme": "",
  "planned_session": [],
  "actual_completed": [],
  "adjustments": [],
  "equipment_issues": [],
  "body_feedback": [],
  "fatigue_level": "",
  "pain_or_discomfort": [],
  "unfinished_items": [],
  "performance_notes": [],
  "next_session_suggestions": [],
  "memory_updates": []
}
```

写入原则：

- 训练记录卡追加到 `training_logs.md`。
- 长期记忆只生成候选，除非当前产品明确支持用户确认后的写入。
- 观察信息进入 `observation_memory.md`，不直接变成规则。

## 六、Memory 文件结构

第一版使用 Markdown / JSON 文件，不设计复杂数据库。

```text
memory/
  user_profile.md
  training_rules.md
  equipment_memory.md
  location_memory.md
  training_logs.md
  preference_memory.md
  risk_memory.md
  exercise_cues.md
  observation_memory.md
runtime/
  current_session.json
  parsed_events.jsonl
  pending_memory_updates.json
```

### user_profile.md

```text
姓名：
年龄：
性别：
身高：
体重：
训练目标：
训练频率：
训练水平：
训练偏好：
训练定位：
常用场地：
可用器械：
不喜欢的训练：
伤病史：
风险提醒：
```

### training_rules.md

```text
训练目标优先级
每周训练覆盖原则
增肌 / 塑形 / 功能性维护原则
强度管理原则
疲劳处理原则
疼痛处理原则
器械替换原则
不固定频率下的训练安排原则
场地适配原则
保守策略限制：不能用户一说累就直接停止训练
```

### equipment_memory.md

```json
{
  "equipment": "高位下拉",
  "location": "公寓健身房",
  "status": "available",
  "last_updated": "",
  "substitutions": [
    "弹力带下拉",
    "单臂绳索下拉",
    "哑铃划船",
    "胸托哑铃划船"
  ]
}
```

### location_memory.md

```json
{
  "location": "公寓健身房",
  "features": ["空间较小", "器械有限"],
  "avoid": ["农夫走路", "大范围移动训练"],
  "planning_rules": ["优先选择原地动作", "减少需要长距离移动的训练"],
  "crowd_observations": [
    {
      "time": "晚上7点",
      "observation": "人多，器械经常排队",
      "confidence": "observation_only"
    }
  ]
}
```

### training_logs.md

每次训练结束后追加一张训练记录卡，保留原计划、实际完成、调整原因、身体反馈、器械情况和下次建议。

````markdown
## 2026-05-13 - Pull + Core

```json
{
  "date": "",
  "location": "",
  "duration": "",
  "training_theme": "",
  "planned_session": [],
  "actual_completed": [],
  "adjustments": [],
  "equipment_issues": [],
  "body_feedback": [],
  "fatigue_level": "",
  "pain_or_discomfort": [],
  "unfinished_items": [],
  "performance_notes": [],
  "next_session_suggestions": [],
  "memory_updates": []
}
```
````

### preference_memory.md

```json
{
  "disliked_exercises": [
    {
      "exercise": "波比跳",
      "rule": "默认避免；如果确实有训练价值，需要先解释原因"
    },
    {
      "exercise": "高强度 HIIT",
      "rule": "默认避免；如安排，必须说明必要性"
    }
  ],
  "preferred_style": {
    "explanation": "通俗直接，有理由",
    "intensity": "不盲目保守，也不过度激进"
  }
}
```

### risk_memory.md

```json
{
  "body_part": "",
  "issue": "",
  "severity": "",
  "trigger_exercise": "",
  "last_seen": "",
  "current_status": "",
  "planning_rule": ""
}
```

### exercise_cues.md

```json
{
  "exercise": "高位下拉",
  "technical_cue": "肩胛下沉，背阔肌发力",
  "plain_language_cue": "先把肩膀放低，再用手肘往身体两侧的裤兜方向拉",
  "body_feel": "腋下到身体侧面有收紧感，不是前臂先酸",
  "analogy": "手像挂钩，手肘像主发动机",
  "common_mistakes": ["耸肩", "用手腕硬拉", "身体后仰过多"],
  "corrections": ["降重", "放慢速度", "最低点停 1 秒", "先练肩胛下沉"]
}
```

### observation_memory.md

```json
{
  "observations": [
    {
      "type": "gym_crowd_observation",
      "location": "当前健身房",
      "time": "晚上7点",
      "observation": "人很多，经常排队",
      "confidence": "observation_only",
      "seen_count": 1,
      "last_seen": "",
      "promotion_rule": "多次重复出现后，才可升级为 location_memory 的稳定规律"
    }
  ]
}
```

## 七、输入解析规则

输入事件分类：

```json
[
  "training_request",
  "daily_status",
  "equipment_status",
  "equipment_occupied",
  "exercise_feedback",
  "fatigue_feedback",
  "pain_feedback",
  "preference_update",
  "location_memory_update",
  "crowd_observation",
  "plan_adjustment_request",
  "training_completion",
  "memory_update_request"
]
```

解析输出格式：

```json
{
  "event_type": "",
  "entities": {},
  "intent": "",
  "should_update_memory": true,
  "risk_level": "",
  "next_action": ""
}
```

示例：器械状态

```json
{
  "event_type": "equipment_status",
  "equipment": "高位下拉",
  "status": "unavailable",
  "scope": "today",
  "impact": "requires_substitution",
  "should_update_memory": true
}
```

示例：偏好更新

```json
{
  "event_type": "preference_update",
  "disliked_items": ["波比跳", "高强度 HIIT"],
  "rule": "默认避免；如确有训练价值，先解释原因再安排",
  "should_update_memory": true
}
```

文本清洗规则：

- 删除口头填充词：`嗯`、`那个`、`就是`、`然后呢`。
- 保留关键训练数字：重量、组数、次数、RPE、疼痛 0-10、疲劳 0-10、训练时间。
- 标准化单位：`公斤`、`kg`、`千克` -> `kg`。
- 标准化组次：`四组十个` -> `4x10`。
- 识别否定：`没有疼`、`不疼`、`不能用`、`不想练腿`。
- 识别时间范围：`今天`、`刚才`、`下一组`、`这周`、`晚上7点`。
- 识别模糊强度：`别太猛` -> `lower_intensity_preference_today`。

健身术语纠错：

- `高位下拉 / 下拉机 / 拉背机器` -> `高位下拉`
- `卧推凳 / 平板凳 / 凳子` -> `卧推凳`
- `绳索划船 / 坐姿划船 / 划船机` -> 按上下文区分 `绳索划船` 或 `划船机`
- `背阔 / 背阔肌 / 大背` -> `背阔肌`
- `肩前侧 / 前三角 / 肩膀前面` -> `肩前侧`
- `波比 / 波比跳 / burpee` -> `波比跳`
- `HIIT / 高强度间歇 / 高强度有氧` -> `高强度 HIIT`

模糊输入追问：

- `累`：追问 `是全身没力，还是某个部位累？0-10 大概几分？有没有头晕、胸闷、恶心或疼痛？`
- `疼`：追问 `哪个位置？是酸胀、紧、刺痛，还是关节痛？0-10 几分？`
- `这个动作不会做`：结合当前动作给简化步骤；如果无法确认动作，追问动作名。
- `器械没了`：优先从当前计划推断器械；无法推断时追问具体器械。

## 八、输出模板

### 结构化训练计划输出

```json
{
  "today_summary": "",
  "today_goal": "",
  "training_focus": "",
  "warm_up": [],
  "main_training": [],
  "accessory_training": [],
  "core_or_cardio": [],
  "cool_down": [],
  "risk_notes": [],
  "substitutions": [],
  "reasoning": ""
}
```

动作字段：

```json
{
  "exercise": "",
  "sets": "",
  "reps": "",
  "intensity": "",
  "rest": "",
  "notes": "",
  "common_mistakes": [],
  "substitutions": []
}
```

### 动作解释输出模板

```json
{
  "exercise": "",
  "technical_explanation": "",
  "plain_language_explanation": "",
  "body_feel": "",
  "analogy": "",
  "next_set_adjustment": "",
  "if_still_not_working": ""
}
```

### 训练理由输出模板

```json
{
  "reasoning_for_user": "",
  "reasoning_for_system": "",
  "risk_considerations": [],
  "decision_basis": [
    "recent_training_logs",
    "current_status",
    "equipment_availability",
    "location_constraints",
    "preference_memory",
    "risk_memory",
    "observation_memory"
  ]
}
```

### 训练后记录卡模板

```json
{
  "session_summary": "",
  "planned_vs_actual": "",
  "completed_exercises": [],
  "adjustments": [],
  "equipment_notes": [],
  "body_feedback": [],
  "performance_notes": [],
  "unfinished_items": [],
  "next_session_recommendations": [],
  "memory_updates": [
    {
      "target_file": "",
      "content": "",
      "reason": "",
      "requires_confirmation": true
    }
  ]
}
```

### Memory Writer 规则

```text
稳定事实：写入 user_profile.md / equipment_memory.md / location_memory.md，但需要用户确认。
一次性训练反馈：写入 training_logs.md。
观察信息：写入 observation_memory.md，不直接变成规则。
偏好信息：写入 preference_memory.md。
风险信息：写入 risk_memory.md。
器械信息：写入 equipment_memory.md。
场地信息：写入 location_memory.md。
动作解释沉淀：写入 exercise_cues.md。
```

升级规则：

- `equipment_status`：坏了、修好了、不可用、可用，可以更新器械状态。
- `equipment_occupied`：一次占用只进训练日志；多次同时间段出现可进入观察。
- `crowd_observation`：先进入 observation；多次重复后升级为 location 规律。
- `preference_update`：用户明确表达喜欢/不喜欢时进入偏好候选。
- `pain_feedback`：疼痛、不适、旧伤复发进入 risk 候选。
- `exercise_feedback`：只影响本次训练；除非反复出现，才建议沉淀到 exercise_cues。

## 九、语音输入接口

第一阶段先做类似豆包 / 微信语音的输入方式：

```text
用户按住或点击语音按钮
  -> 说话
  -> ASR 转文字
  -> 文本清洗
  -> 健身术语纠错
  -> 结构化解析
  -> 进入 Agent workflow
```

接口设计：

```ts
type VoiceInputRequest = {
  audioFile?: File;
  audioUrl?: string;
  locale: "zh-CN" | "en-US";
  sessionId: string;
  source: "push_to_talk" | "tap_to_record" | "uploaded_audio";
};

type TranscriptResult = {
  rawText: string;
  cleanedText: string;
  confidence: number;
  segments?: Array<{
    text: string;
    startMs: number;
    endMs: number;
    confidence: number;
  }>;
};

type ParsedTrainingEvent = {
  event_type: string;
  entities: Record<string, unknown>;
  intent: string;
  should_update_memory: boolean;
  risk_level: "none" | "low" | "medium" | "high";
  requires_followup: boolean;
  followup_questions: string[];
  next_action:
    | "generate_plan"
    | "adjust_current_session"
    | "write_training_log"
    | "create_memory_candidate"
    | "ask_followup";
};
```

HTTP 接口：

```text
POST /api/voice/transcribe
POST /api/input/clean
POST /api/events/parse
POST /api/agent/respond
```

未来视频输入只预留接口：

```text
POST /api/video/pose-estimate
POST /api/video/exercise-quality
POST /api/video/fatigue-signal
POST /api/video/overlay-cues
```

第一版不实现完整视频识别。

## 十、部署方案

### 方案 A：OpenCloud / Hermes

目标：先把 skill / workflow 跑起来。

要求：

- 支持读取本地或云端 Markdown / JSON 记忆。
- 支持文本输入。
- 支持语音转文字后的输入。
- 支持训练计划生成。
- 支持训练中调整。
- 支持训练后记录。
- 支持记忆更新候选。
- 预留飞书或微信入口。

建议结构：

```text
sports-training-agent/
  manifest.json
  prompts/system_prompt.md
  workflows/preworkout.md
  workflows/in_session.md
  workflows/post_session.md
  schemas/training_event.schema.json
  schemas/training_plan.schema.json
  schemas/training_log_card.schema.json
  memory_templates/
    user_profile.md
    training_rules.md
    equipment_memory.md
    location_memory.md
    training_logs.md
    preference_memory.md
    risk_memory.md
    exercise_cues.md
    observation_memory.md
  adapters/local_markdown_memory.ts
  adapters/asr_stub.ts
```

### 方案 B：本地 Agent

目标：先做本地可运行版本。

要求：

- 本地维护用户文件夹。
- 本地保存训练记忆。
- 调用外部大模型 API。
- 支持命令行或简单 Web UI。
- 后续可以封装成软件。

### 方案 C：一键部署 / 软件封装

目标：未来降低普通用户门槛。

要求：

- 技术用户可以 GitHub 自部署。
- 普通用户可以一键安装。
- 可以在电脑或手机端部署。
- 可以接自己的 API，也可以使用默认 API。
- 后续再考虑手机端或微信入口。

第一阶段只做设计和接口预留。

## 十一、两周任务拆解

### 第一周

1. 建立本地 Agent 文件结构。
2. 创建 9 个 memory 模板：`user_profile.md`、`training_rules.md`、`equipment_memory.md`、`location_memory.md`、`training_logs.md`、`preference_memory.md`、`risk_memory.md`、`exercise_cues.md`、`observation_memory.md`。
3. 写 `system_prompt.md`。
4. 写 3 个 workflow prompt：训练前、训练中、训练后。
5. 定义 schema：`TrainingEvent`、`TrainingPlan`、`TrainingLogCard`、`MemoryUpdateCandidate`。
6. 实现文本清洗和健身术语纠错。
7. 实现输入事件分类：训练请求、每日状态、器械状态、器械占用、动作反馈、疲劳、疼痛、偏好、场地、观察、训练完成。
8. 实现 Memory Reader 和 Context Builder。
9. 实现 CLI 文本对话原型。
10. 写单元测试，覆盖至少 20 条典型输入。

### 第二周

1. 接入外部大模型 API。
2. 实现 Plan Generator，并做结构化输出 schema 校验。
3. 实现 Training Session Adjuster，能更新 `runtime/current_session.json`。
4. 实现 Training Log Writer，训练后追加到 `training_logs.md`。
5. 实现 Memory Writer 候选机制，区分稳定事实、一次性反馈、观察、偏好、风险、器械、场地。
6. 实现 ASR stub，模拟语音输入转文字。
7. 接入真实 ASR 的接口适配层，但第一版可以先不绑定具体 API。
8. 增加简单 Web UI 或继续 CLI，优先保证 workflow 可跑。
9. 跑 7 个验收场景，修正 prompt、解析规则和输出模板。

## 十二、验收用例

### 场景 1：训练前生成计划

用户信息：

```text
目标：增肌塑形 + 功能性维护
频率：不固定
场地：公寓健身房
器械：哑铃、卧推凳、高位下拉、绳索、划船机
偏好：不喜欢波比跳和高强度 HIIT，但如果确实有用可以先解释
风险：肩前侧偶尔紧
```

用户输入：

```text
今天该练什么？
```

期望输出：

- 今日训练方向。
- 今日训练计划。
- 热身、主训练、辅助训练、心肺 / 核心 / 拉伸。
- 每个动作的组数、次数、强度、休息。
- 注意事项。
- 替代动作。
- 为什么这样安排。

### 场景 2：器械占用

用户输入：

```text
高位下拉和绳索划船有人了。
```

期望输出：

- 识别器械占用。
- 保持背部训练目标。
- 给出替代动作，例如胸托哑铃划船、单臂哑铃划船。
- 说明替代理由。
- 更新训练记录。

### 场景 3：器械损坏并写入记忆

用户输入：

```text
高位下拉坏了，今天不能用。
```

期望输出：

- 识别器械状态。
- 给出替代动作。
- 生成 `equipment_memory.md` 更新候选。

之后用户输入：

```text
高位下拉修好了。
```

期望输出：

- 更新 `equipment_memory.md` 候选。
- 恢复高位下拉可用状态。

### 场景 4：疲劳但不能过度保守

用户输入：

```text
我有点累了，还要不要继续？
```

期望输出：

- 不直接结束。
- 先判断疲劳类型。
- 结合当前完成度。
- 给出继续、降重、减组、延长休息、结束的判断标准。

### 场景 5：动作感觉不到目标肌肉

用户输入：

```text
我感觉不到背阔肌发力。
```

期望输出：

- 通俗解释。
- 身体感受提示。
- 比喻提示。
- 下一组具体调整方法。
- 必要时建议降重。

### 场景 6：场地观察

用户输入：

```text
晚上7点健身房人很多，经常排队。
```

期望输出：

- 记录为 observation。
- 不直接变成绝对规则。
- 后续多次观察后再升级为稳定记忆。

### 场景 7：训练后记录

用户输入：

```text
今天练完了，帮我总结一下。
```

期望输出训练记录卡，包括：

- 日期。
- 场地。
- 原计划。
- 实际完成。
- 临时调整。
- 身体反馈。
- 器械情况。
- 未完成内容。
- 下次建议。
- 需要写入哪些记忆文件。

