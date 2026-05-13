import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const ALLOWED_MEMORY_TARGETS = new Set([
  "user_profile.md",
  "training_rules.md",
  "equipment_memory.md",
  "location_memory.md",
  "training_logs.md",
  "preference_memory.md",
  "risk_memory.md",
  "exercise_cues.md",
  "observation_memory.md"
]);

function candidate(targetFile, content, reason, requiresConfirmation = true) {
  return {
    target_file: targetFile,
    content,
    reason,
    requires_confirmation: requiresConfirmation
  };
}

export function memoryCandidateFromEvent(event) {
  const text = event.clean_text;
  const equipment = event.entities.equipment?.join("、") || "";
  const location = event.entities.location || "当前场地";

  if (event.event_type === "equipment_status") {
    return candidate(
      "equipment_memory.md",
      JSON.stringify({
        equipment,
        location,
        status: event.entities.status,
        source: text
      }, null, 2),
      "器械状态属于稳定但可更新的信息，需要用于后续计划生成。"
    );
  }

  if (event.event_type === "crowd_observation") {
    return candidate(
      "observation_memory.md",
      JSON.stringify({
        type: "gym_crowd_observation",
        location,
        time: event.entities.time,
        observation: text,
        confidence: "observation_only",
        seen_count: 1
      }, null, 2),
      "人流量是观察信息，先记录为 observation，不能直接变成绝对规则。"
    );
  }

  if (event.event_type === "location_memory_update") {
    return candidate(
      "location_memory.md",
      JSON.stringify({
        location,
        constraint: text,
        usage: "生成计划时用于场地适配"
      }, null, 2),
      "这是场地空间或动作限制，后续计划应读取。"
    );
  }

  if (event.event_type === "preference_update") {
    return candidate(
      "preference_memory.md",
      JSON.stringify({
        disliked_items: event.entities.disliked_items,
        rule: "默认避免；如确有训练价值，先解释原因再安排",
        source: text
      }, null, 2),
      "这是明确偏好，应影响后续动作选择。"
    );
  }

  if (event.event_type === "pain_feedback") {
    return candidate(
      "risk_memory.md",
      JSON.stringify({
        body_parts: event.entities.body_parts,
        issue: text,
        current_status: "monitor",
        planning_rule: "计划时避免加重该不适，必要时降级或替换动作"
      }, null, 2),
      "疼痛或不适需要进入风险记忆候选。"
    );
  }

  return null;
}

export async function writeConfirmedMemory(rootDir, update) {
  if (!update || !ALLOWED_MEMORY_TARGETS.has(update.target_file)) {
    throw new Error(`Unsupported memory target: ${update?.target_file || "unknown"}`);
  }

  const filePath = path.join(rootDir, "memory", update.target_file);
  const existing = await readFile(filePath, "utf8").catch(() => "");
  const entry = `\n\n## Confirmed Update\n\n${update.content}\n\nReason: ${update.reason}\n`;
  await writeFile(filePath, `${existing}${entry}`, "utf8");
}

export async function appendTrainingLog(rootDir, card) {
  const filePath = path.join(rootDir, "memory", "training_logs.md");
  const title = card.training_theme || "Training Session";
  const entry = `\n\n## ${card.date || ""} - ${title}\n\n\`\`\`json\n${JSON.stringify(card, null, 2)}\n\`\`\`\n`;
  await appendFile(filePath, entry, "utf8");
}

