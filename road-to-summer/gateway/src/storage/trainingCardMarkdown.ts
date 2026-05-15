import type { TrainingCard } from "../hermes/types.ts";
import { replaceRelativeDateLabels } from "../time/absoluteDateText.ts";

function text(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function exerciseLine(value: unknown, baseDate?: string): string {
  if (typeof value !== "object" || value === null) return replaceRelativeDateLabels(text(value), baseDate);
  const item = value as Record<string, unknown>;
  const name = replaceRelativeDateLabels(text(item.exercise || item.name || item.operation || item.target_exercise || "项目"), baseDate);
  const details = [
    item.status ? `状态：${replaceRelativeDateLabels(text(item.status), baseDate)}` : "",
    item.sets ? `组数：${replaceRelativeDateLabels(text(item.sets), baseDate)}` : "",
    item.reps ? `次数：${replaceRelativeDateLabels(text(item.reps), baseDate)}` : "",
    item.intensity ? `强度：${replaceRelativeDateLabels(text(item.intensity), baseDate)}` : "",
    item.rest ? `休息：${replaceRelativeDateLabels(text(item.rest), baseDate)}` : "",
    item.from || item.to ? `调整：${replaceRelativeDateLabels(text(item.from), baseDate)} -> ${replaceRelativeDateLabels(text(item.to), baseDate)}` : "",
    item.reason ? `原因：${replaceRelativeDateLabels(text(item.reason), baseDate)}` : "",
    item.note ? `备注：${replaceRelativeDateLabels(text(item.note), baseDate)}` : ""
  ].filter(Boolean);
  return details.length ? `**${name}**：${details.join("；")}` : `**${name}**`;
}

function listSection(title: string, values: unknown[] = [], baseDate?: string): string {
  if (!values.length) return `## ${title}\n\n- 无`;
  return [`## ${title}`, "", ...values.map((value) => `- ${exerciseLine(value, baseDate)}`)].join("\n");
}

export function createTrainingCardMarkdown(card: TrainingCard): string {
  return [
    `# ${card.theme || "训练记录"}`,
    "",
    `- 日期：${card.date || ""}`,
    card.timezone ? `- 时区：${card.timezone}` : "",
    card.completed_at ? `- 生成时间：${card.completed_at}` : "",
    `- 场地：${card.location || ""}`,
    `- 时长：${card.duration || "未记录"}`,
    "",
    listSection("原计划", card.planned, card.date),
    "",
    listSection("实际完成", card.actual_completed, card.date),
    "",
    listSection("临时调整", card.adjustments, card.date),
    "",
    listSection("身体反馈", card.body_feedback, card.date),
    "",
    listSection("疲劳反馈", card.fatigue_notes, card.date),
    "",
    listSection("疼痛 / 不适", card.pain_or_discomfort, card.date),
    "",
    listSection("器械情况", card.equipment_notes, card.date),
    "",
    listSection("未完成内容", card.unfinished_items, card.date),
    "",
    listSection("下次建议", card.next_session_suggestions, card.date)
  ].join("\n").trimEnd() + "\n";
}
