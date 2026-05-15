"use client";

import type { AgentUiDocument } from "../../lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

function actionLabel(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!isRecord(value)) return "";
  return text(value.label || value.action || value.next_instruction || value.title || value.text);
}

function quickActions(value: unknown): string[] {
  const seen = new Set<string>();
  return (Array.isArray(value) ? value : [])
    .map(actionLabel)
    .filter((action) => {
      if (!action || seen.has(action)) return false;
      seen.add(action);
      return true;
    });
}

function operationLabel(operation?: string) {
  const labels: Record<string, string> = {
    update_cue: "动作提示",
    adjust_load: "重量调整",
    replace_exercise: "替换动作",
    reduce_sets: "减少组数",
    add_set: "增加组数",
    extend_rest: "延长休息",
    end_session: "结束训练",
    continue_current: "继续当前动作"
  };
  return labels[operation || ""] || operation || "训练调整";
}

export function PhoneAgentSurface({
  document,
  onAction
}: {
  document: AgentUiDocument;
  onAction: (action: string) => void;
}) {
  const data = document.data as Record<string, unknown>;
  const patch = isRecord(data.patch) ? data.patch : undefined;
  const plan = isRecord(data.plan) ? data.plan : undefined;
  const card = isRecord(data.training_card) ? data.training_card : undefined;
  const session = isRecord(data.session) ? data.session : undefined;
  const actions = quickActions(data.quick_actions);

  return (
    <section className="rts-phone-agent-card" aria-label="Hermes 结构化回复">
      <div className="rts-phone-agent-card-head">
        <p>{patch ? "训练中调整" : card ? "训练记录" : "计划已更新"}</p>
        {patch ? <span>{operationLabel(text(patch.operation))}</span> : null}
      </div>

      {patch ? (
        <div className="rts-phone-agent-patch">
          <strong>{text(patch.target_exercise, text(session?.current_exercise, "当前动作"))}</strong>
          {text(patch.reason) ? <small>原因：{text(patch.reason)}</small> : null}
          {text(patch.next_instruction) ? <div>{text(patch.next_instruction)}</div> : null}
        </div>
      ) : null}

      {!patch && plan ? (
        <div className="rts-phone-agent-patch">
          <strong>{text(plan.title, "训练计划")}</strong>
          <small>{text(plan.duration, "时长待定")} · {text(plan.goal, "目标待定")}</small>
        </div>
      ) : null}

      {card ? (
        <div className="rts-phone-agent-patch">
          <strong>{text(card.theme, "训练记录已保存")}</strong>
          <small>{text(card.date)} · {text(card.duration)}</small>
        </div>
      ) : null}

      {text(session?.current_exercise) ? (
        <div className="rts-phone-agent-current">
          <span>当前动作</span>
          <strong>{text(session?.current_exercise)}</strong>
        </div>
      ) : null}

      {actions.length ? (
        <div className="rts-phone-agent-actions">
          {actions.map((action, index) => (
            <button key={`${action}-${index}`} type="button" onClick={() => onAction(action)}>
              {action}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
