function renderExerciseList(title, items = []) {
  const rows = items.map((item) => {
    return `| ${item.exercise} | ${item.sets} | ${item.reps} | ${item.intensity} | ${item.rest} | ${item.notes} | ${item.substitutions?.join(" / ") || ""} |`;
  });
  return [
    `## ${title}`,
    "| 动作 | 组数 | 次数/时间 | 强度 | 休息 | 注意事项 | 替代动作 |",
    "|---|---:|---|---|---|---|---|",
    ...rows
  ].join("\n");
}

function renderPlan(response) {
  const plan = response.plan;
  return [
    "# 今日训练计划",
    `## 今日训练总览\n${plan.today_summary}`,
    `## 今日训练目标\n${plan.today_goal}`,
    `## 今日重点\n${plan.training_focus}`,
    renderExerciseList("热身模块", plan.warm_up),
    renderExerciseList("主训练模块", plan.main_training),
    renderExerciseList("辅助训练模块", plan.accessory_training),
    renderExerciseList("核心 / 心肺 / 拉伸模块", [...plan.core_or_cardio, ...plan.cool_down]),
    `## 注意事项\n${plan.risk_notes.join("\n")}`,
    `## 可替代动作\n${plan.substitutions.join("\n")}`,
    `## 为什么这样安排\n${plan.reasoning}`
  ].join("\n\n");
}

function renderMemoryUpdates(updates = []) {
  if (!updates.length) return "";
  return [
    "## 记忆更新候选",
    ...updates.map((update) => {
      return `- 目标文件：${update.target_file}\n  原因：${update.reason}\n  需要确认：${update.requires_confirmation ? "是" : "否"}\n  内容：\n\`\`\`json\n${update.content}\n\`\`\``;
    })
  ].join("\n");
}

export function renderResponseMarkdown(response) {
  if (response.kind === "training_plan") return renderPlan(response);

  if (response.kind === "session_adjustment" && response.replacement_options) {
    return [
      "## 事件判断",
      `${response.equipment.join("、")} 当前不可用 / 被占用。训练目标不变。`,
      "## 替代动作",
      ...response.replacement_options.map((item) => {
        return `- ${item.exercise}：${item.sets} 组 x ${item.reps}，${item.intensity}，休息 ${item.rest}。${item.reason}`;
      }),
      "## 本次训练记录更新",
      response.session_update
    ].join("\n\n");
  }

  if (response.kind === "equipment_status") {
    return [
      "## 器械状态",
      `${response.equipment.join("、")}：${response.status}`,
      "## 当前训练怎么处理",
      response.current_session_action,
      response.replacement_options?.length ? "## 替代动作\n" + response.replacement_options.map((item) => `- ${item.exercise}：${item.reason}`).join("\n") : "",
      renderMemoryUpdates(response.memory_updates)
    ].filter(Boolean).join("\n\n");
  }

  if (response.kind === "fatigue_decision") {
    return [
      "## 疲劳判断",
      response.response,
      "## 判断标准",
      ...response.decision_rules.map((rule) => `- ${rule}`)
    ].join("\n\n");
  }

  if (response.kind === "exercise_explanation") {
    return [
      `## ${response.exercise} 动作解释`,
      `专业解释：${response.technical_explanation}`,
      `通俗解释：${response.plain_language_explanation}`,
      `身体感受：${response.body_feel}`,
      `简单比喻：${response.analogy}`,
      `下一组调整：${response.next_set_adjustment}`,
      `如果还不对：${response.if_still_not_working}`
    ].join("\n\n");
  }

  if (response.kind === "training_log_card") {
    return [
      "## 本次训练记录卡",
      "```json",
      JSON.stringify(response.card, null, 2),
      "```",
      renderMemoryUpdates(response.memory_updates)
    ].join("\n");
  }

  return [
    response.response || "",
    renderMemoryUpdates(response.memory_updates)
  ].filter(Boolean).join("\n\n");
}

