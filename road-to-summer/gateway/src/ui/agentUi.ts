import type { CurrentSession, HermesOutput, PlanCard, PlanPatchOutput, TrainingCard } from "../hermes/types.ts";
import type { UiStatePatch } from "./mapAgentOutputToUi.ts";

export const AGENT_UI_VERSION = "rts-a2ui-0.1";

export type AgentUiComponentType =
  | "surface"
  | "section"
  | "coach_message"
  | "plan_summary"
  | "plan_sections"
  | "current_exercise"
  | "patch_card"
  | "training_card"
  | "memory_updates"
  | "action_row";

export type AgentUiComponent = {
  id: string;
  type: AgentUiComponentType;
  props?: Record<string, unknown>;
  children?: string[];
};

export type AgentUiDocument = {
  version: typeof AGENT_UI_VERSION;
  surface: "training_cockpit" | "history" | "memory";
  root: string;
  components: AgentUiComponent[];
  data: {
    chat_message: string;
    plan?: PlanCard;
    session?: CurrentSession;
    patch?: PlanPatchOutput["patch"];
    training_card?: TrainingCard;
    memory_updates?: unknown[];
    quick_actions?: string[];
  };
};

const ALLOWED_COMPONENTS = new Set<AgentUiComponentType>([
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

function component(
  id: string,
  type: AgentUiComponentType,
  props: Record<string, unknown> = {},
  children: string[] = []
): AgentUiComponent {
  return { id, type, props, children };
}

function buildTrainingPlanComponents(): AgentUiComponent[] {
  return [
    component("root", "surface", { title: "训练动态界面" }, ["coach", "summary", "current", "sections", "actions"]),
    component("coach", "coach_message", { path: "/chat_message" }),
    component("summary", "plan_summary", { path: "/plan" }),
    component("current", "current_exercise", { path: "/session" }),
    component("sections", "plan_sections", { path: "/plan/sections" }),
    component("actions", "action_row", { path: "/quick_actions" })
  ];
}

function buildPatchComponents(output: PlanPatchOutput): AgentUiComponent[] {
  const children = ["coach", "patch", "current", "actions"];
  if (output.memory_updates?.length) children.splice(3, 0, "memory");
  return [
    component("root", "surface", { title: "训练中调整" }, children),
    component("coach", "coach_message", { path: "/chat_message" }),
    component("patch", "patch_card", { path: "/patch" }),
    component("current", "current_exercise", { path: "/session" }),
    component("memory", "memory_updates", { path: "/memory_updates" }),
    component("actions", "action_row", { path: "/quick_actions" })
  ];
}

function buildTrainingCardComponents(output: Extract<HermesOutput, { type: "training_card" }>): AgentUiComponent[] {
  const children = ["coach", "card", "memory", "actions"];
  return [
    component("root", "surface", { title: "训练记录卡" }, children),
    component("coach", "coach_message", { path: "/chat_message" }),
    component("card", "training_card", { path: "/training_card" }),
    component("memory", "memory_updates", { path: "/memory_updates" }),
    component("actions", "action_row", { actions: ["查看历史", "确认记忆更新", "生成下次建议"] })
  ];
}

function buildReviewComponents(): AgentUiComponent[] {
  return [
    component("root", "surface", { title: "训练复盘" }, ["coach", "actions"]),
    component("coach", "coach_message", { path: "/chat_message" }),
    component("actions", "action_row", { path: "/quick_actions" })
  ];
}

export function buildAgentUiDocument(output: HermesOutput, ui: UiStatePatch): AgentUiDocument {
  let components: AgentUiComponent[];
  if (output.type === "training_plan") {
    components = buildTrainingPlanComponents();
  } else if (output.type === "plan_patch") {
    components = buildPatchComponents(output);
  } else if (output.type === "training_card") {
    components = buildTrainingCardComponents(output);
  } else {
    components = buildReviewComponents();
  }

  return {
    version: AGENT_UI_VERSION,
    surface: "training_cockpit",
    root: "root",
    components,
    data: {
      chat_message: ui.chat_message,
      plan: ui.current_plan,
      session: ui.current_session,
      patch: output.type === "plan_patch" ? output.patch : undefined,
      training_card: ui.training_card,
      memory_updates: ui.memory_updates,
      quick_actions: ui.quick_actions
    }
  };
}

export function validateAgentUiDocument(document: AgentUiDocument): { valid: boolean; error?: string } {
  if (document.version !== AGENT_UI_VERSION) return { valid: false, error: "unsupported agent_ui version" };
  if (!document.root) return { valid: false, error: "agent_ui.root missing" };
  if (!Array.isArray(document.components)) return { valid: false, error: "agent_ui.components missing" };
  const ids = new Set<string>();
  for (const item of document.components) {
    if (!item.id) return { valid: false, error: "agent_ui component missing id" };
    if (ids.has(item.id)) return { valid: false, error: `duplicate agent_ui component id ${item.id}` };
    ids.add(item.id);
    if (!ALLOWED_COMPONENTS.has(item.type)) return { valid: false, error: `unsupported agent_ui component ${item.type}` };
  }
  if (!ids.has(document.root)) return { valid: false, error: "agent_ui.root component not found" };
  for (const item of document.components) {
    for (const child of item.children || []) {
      if (!ids.has(child)) return { valid: false, error: `agent_ui child ${child} not found` };
    }
  }
  return { valid: true };
}
