"use client";

import type { ReactNode } from "react";
import type { AgentUiComponent, AgentUiDocument, PlanItem, PlanSection } from "../lib/types";
import { MarkdownBlock } from "./MarkdownBlock";

const ALLOWED_COMPONENTS = new Set([
  "surface",
  "section",
  "coach_message",
  "plan_summary",
  "plan_sections",
  "current_exercise",
  "patch_card",
  "training_card",
  "memory_updates",
  "action_row"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlanItem(item: PlanItem | string): item is PlanItem {
  return typeof item === "object" && item !== null && "exercise" in item;
}

function resolvePath(data: unknown, path?: unknown): unknown {
  if (typeof path !== "string" || !path.startsWith("/")) return undefined;
  return path
    .split("/")
    .filter(Boolean)
    .reduce((current: unknown, key) => {
      if (Array.isArray(current)) return current[Number(key)];
      if (isRecord(current)) return current[key];
      return undefined;
    }, data);
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function PlanSections({ sections }: { sections: PlanSection[] }) {
  return (
    <div className="grid gap-3">
      {sections.map((section) => (
        <div className="rounded-md border border-[#dfe6dc] bg-white" key={section.name}>
          <div className="border-b border-[#dfe6dc] px-3 py-2 text-sm font-semibold text-[#1f7a5a]">{section.name}</div>
          <div className="divide-y divide-[#e7eee5]">
            {section.items.map((item, index) => (
              <div className="grid gap-1 p-3 text-sm md:grid-cols-[1fr_0.9fr]" key={`${section.name}-${index}-${isPlanItem(item) ? item.exercise : item}`}>
                {isPlanItem(item) ? (
                  <>
                    <div>
                      <div className="font-medium">{item.exercise}</div>
                      <div className="mt-1 text-xs leading-5 text-[#536158]">{item.cue}</div>
                    </div>
                    <div className="text-xs leading-5 text-[#536158]">
                      <div>{item.sets} x {item.reps} · {item.intensity}</div>
                      <div>休息 {item.rest}</div>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2"><MarkdownBlock compact content={item} /></div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderComponent(
  component: AgentUiComponent,
  componentMap: Map<string, AgentUiComponent>,
  document: AgentUiDocument,
  onAction?: (action: string) => void
): ReactNode {
  if (!ALLOWED_COMPONENTS.has(component.type)) return null;
  const props = component.props || {};
  const value = resolvePath(document.data, props.path);

  if (component.type === "surface") {
    return (
      <section className="rounded-lg border border-[#dfe6dc] bg-white p-5 shadow-sm" data-agent-ui-version={document.version}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{text(props.title, "Agent UI")}</h2>
          <span className="rounded-md bg-[#eef2ec] px-2 py-1 font-mono text-[11px] text-[#536158]">{document.version}</span>
        </div>
        <div className="mt-4 grid gap-4">
          {(component.children || []).map((childId) => {
            const child = componentMap.get(childId);
            return child ? <div key={childId}>{renderComponent(child, componentMap, document, onAction)}</div> : null;
          })}
        </div>
      </section>
    );
  }

  if (component.type === "coach_message") {
    return (
      <div className="rounded-md bg-[#f7faf5] p-3 text-sm leading-6">
        <div className="mb-1 text-xs font-semibold text-[#536158]">教练输出</div>
        <MarkdownBlock compact content={text(value)} />
      </div>
    );
  }

  if (component.type === "plan_summary") {
    const plan = isRecord(value) ? value : {};
    return (
      <div className="grid gap-2 rounded-md border border-[#dfe6dc] bg-[#fbfcfa] p-3 text-sm">
        <div className="font-semibold">{text(plan.title, "训练计划")}</div>
        <div className="text-[#536158]">{text(plan.goal)} · {text(plan.duration)}</div>
        {text(plan.target_date) ? <div className="text-xs text-[#536158]">目标日期：{text(plan.date_label)} {text(plan.target_date)}</div> : null}
      </div>
    );
  }

  if (component.type === "plan_sections") {
    return <PlanSections sections={array(value) as PlanSection[]} />;
  }

  if (component.type === "current_exercise") {
    const session = isRecord(value) ? value : {};
    return (
      <div className="rounded-md border border-[#dfe6dc] bg-[#fff8ed] p-3 text-sm">
        <div className="text-xs font-semibold text-[#8a5b16]">当前动作状态</div>
        <div className="mt-1 font-medium">{text(session.current_exercise, "待开始")}</div>
        {text(session.progress) ? <div className="mt-1 text-xs leading-5 text-[#8a5b16]">{text(session.progress)}</div> : null}
      </div>
    );
  }

  if (component.type === "patch_card") {
    const patch = isRecord(value) ? value : {};
    return (
      <div className="rounded-md border border-[#dfe6dc] bg-white p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-[#eef2ec] px-2 py-1 font-mono text-xs">{text(patch.operation, "patch")}</span>
          <span className="font-medium">{text(patch.target_exercise, "当前动作")}</span>
        </div>
        {text(patch.reason) ? <div className="mt-2 text-xs leading-5 text-[#536158]">原因：{text(patch.reason)}</div> : null}
        {text(patch.next_instruction) ? <div className="mt-2 rounded-md bg-[#f7faf5] p-2 text-xs leading-5 text-[#314037]">{text(patch.next_instruction)}</div> : null}
      </div>
    );
  }

  if (component.type === "training_card") {
    const card = isRecord(value) ? value : {};
    return (
      <div className="rounded-md border border-[#dfe6dc] bg-white p-3 text-sm">
        <div className="font-semibold">{text(card.theme, "训练记录卡")}</div>
        <div className="mt-1 text-xs text-[#536158]">{text(card.date)} · {text(card.location)} · {text(card.duration)}</div>
        {Array.isArray(card.next_session_suggestions) ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-[#536158]">
            {card.next_session_suggestions.map((item) => <li key={String(item)}>{String(item)}</li>)}
          </ul>
        ) : null}
      </div>
    );
  }

  if (component.type === "memory_updates") {
    const updates = array(value);
    if (!updates.length) return null;
    return (
      <div className="rounded-md border border-[#f0d8a8] bg-[#fff8ed] p-3 text-sm text-[#8a5b16]">
        <div className="font-semibold">待确认记忆</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
          {updates.map((item, index) => <li key={index}>{isRecord(item) ? text(item.content, JSON.stringify(item)) : String(item)}</li>)}
        </ul>
      </div>
    );
  }

  if (component.type === "action_row") {
    const actions = array(value).length ? array(value).map(String) : array(props.actions).map(String);
    if (!actions.length) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button className="rounded-md bg-[#f4f7f2] px-3 py-2 text-sm hover:bg-[#e8f0e6]" key={action} type="button" onClick={() => onAction?.(action)}>
            {action}
          </button>
        ))}
      </div>
    );
  }

  return null;
}

export function AgentUiRenderer({ document, onAction }: { document?: AgentUiDocument; onAction?: (action: string) => void }) {
  if (!document) return null;
  const componentMap = new Map(document.components.map((component) => [component.id, component]));
  const root = componentMap.get(document.root);
  if (!root) return null;
  return renderComponent(root, componentMap, document, onAction);
}
