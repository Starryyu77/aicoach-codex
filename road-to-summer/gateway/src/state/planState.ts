import { createHash, randomUUID } from "node:crypto";
import type {
  AgentOutputEnvelope,
  CurrentSession,
  HermesOutput,
  InputSource,
  PlanCard,
  PlanItem,
  PlanPatchOutput,
  PlanSection,
  TimeContext,
  TrainingEvent,
  TrainingStateDelta,
  TrainingStateSnapshot
} from "../hermes/types.ts";

export const OUTPUT_SCHEMA_VERSION = "rts.agent_output.v1";
export const OUTPUT_CONTRACT_VERSION = "2026-05-15";

export type EventMetadata = {
  event: TrainingEvent;
  state_before: TrainingStateSnapshot;
};

function hash(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 10);
}

function compact(value?: string): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{Letter}\p{Number}_-]+/gu, "");
}

function isPlanItem(item: PlanItem | string): item is PlanItem {
  return typeof item === "object" && item !== null && "exercise" in item;
}

export function firstPlanItem(plan?: PlanCard | null): PlanItem | undefined {
  return plan?.sections.flatMap((section) => section.items).find(isPlanItem);
}

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function buildPlanId(plan: PlanCard): string {
  const basis = [plan.target_date, plan.title, plan.goal].filter(Boolean).join(":");
  return `plan-${hash(basis || "road-to-summer-plan")}`;
}

function sectionId(planId: string, section: PlanSection, sectionIndex: number): string {
  return section.section_id || `${planId}-sec-${sectionIndex + 1}-${hash(section.name || String(sectionIndex))}`;
}

function itemId(planId: string, section: PlanSection, sectionIndex: number, item: PlanItem, itemIndex: number): string {
  if (item.item_id) return item.item_id;
  const basis = [
    section.section_id || section.name || sectionIndex,
    item.exercise,
    item.role,
    item.movement_pattern,
    itemIndex
  ].join(":");
  return `${planId}-item-${hash(basis)}`;
}

export function ensurePlanState(plan: PlanCard, revision = plan.plan_revision || 1): PlanCard {
  const planId = plan.plan_id || buildPlanId(plan);
  const sections = plan.sections.map((section, sectionIndex) => {
    const nextSectionId = sectionId(planId, section, sectionIndex);
    return {
      ...section,
      section_id: nextSectionId,
      items: section.items.map((item, itemIndex) => {
        if (!isPlanItem(item)) return item;
        return {
          ...item,
          item_id: itemId(planId, { ...section, section_id: nextSectionId }, sectionIndex, item, itemIndex)
        };
      })
    };
  });
  return {
    ...plan,
    plan_id: planId,
    plan_revision: revision,
    sections
  };
}

export function snapshotTrainingState(
  session: CurrentSession,
  plan?: PlanCard | null,
  timestamp?: string
): TrainingStateSnapshot {
  const currentPlan = plan || session.plan_card;
  const firstItem = firstPlanItem(currentPlan);
  return {
    session_id: session.id,
    plan_id: currentPlan?.plan_id || session.plan_id,
    plan_revision: currentPlan?.plan_revision || session.plan_revision,
    current_item_id: session.current_item_id || firstItem?.item_id,
    current_exercise: session.current_exercise || firstItem?.exercise,
    current_set: session.current_set,
    session_phase: session.phase,
    target_date: session.target_date,
    timestamp
  };
}

export function buildEventMetadata(input: {
  source: InputSource;
  rawText: string;
  session: CurrentSession;
  plan?: PlanCard | null;
  timeContext: TimeContext;
  expectedType?: TrainingEvent["intent_hint"];
  eventId?: string;
  idempotencyKey?: string;
}): EventMetadata {
  const stateBefore = snapshotTrainingState(input.session, input.plan, input.timeContext.now_iso);
  const normalizedText = normalizeText(input.rawText);
  const eventId = input.eventId || `evt-${randomUUID()}`;
  return {
    state_before: stateBefore,
    event: {
      event_id: eventId,
      idempotency_key: input.idempotencyKey || eventId,
      source: input.source,
      raw_text: input.rawText,
      normalized_text: normalizedText,
      intent_hint: input.expectedType,
      target_date: input.timeContext.target_date,
      timestamp: input.timeContext.now_iso,
      state_before: stateBefore
    }
  };
}

export function findPlanItem(plan: PlanCard | undefined | null, itemId?: string, exercise?: string): PlanItem | undefined {
  if (!plan) return undefined;
  const items = plan.sections.flatMap((section) => section.items).filter(isPlanItem);
  if (itemId) {
    const byId = items.find((item) => item.item_id === itemId);
    if (byId) return byId;
  }
  const needle = compact(exercise);
  if (!needle) return undefined;
  return items.find((item) => {
    const candidate = compact(item.exercise);
    return candidate === needle || candidate.includes(needle) || needle.includes(candidate);
  });
}

export function resolvePatchTarget(
  patch: PlanPatchOutput["patch"],
  plan: PlanCard | undefined | null,
  session: CurrentSession
): PlanPatchOutput["patch"] {
  if (!plan) return patch;
  const currentItem = findPlanItem(plan, session.current_item_id, session.current_exercise);
  const target = findPlanItem(plan, patch.target_item_id, patch.target_exercise || patch.from) || currentItem;
  if (!target?.item_id) return patch;
  return {
    ...patch,
    target_item_id: patch.target_item_id || target.item_id,
    target_exercise: patch.target_exercise || target.exercise,
    applies_to_plan_id: patch.applies_to_plan_id ?? plan.plan_id,
    applies_to_revision: patch.applies_to_revision ?? plan.plan_revision
  };
}

export function buildStateDelta(output: HermesOutput): TrainingStateDelta {
  if (output.type !== "plan_patch") return { operations: [] };
  return {
    operations: [
      {
        type: output.patch.operation,
        target_item_id: output.patch.target_item_id,
        target_section_id: output.patch.target_section_id,
        from: output.patch.from,
        to: output.patch.to,
        reason: output.patch.reason
      }
    ]
  };
}

export function attachOutputEnvelope<T extends HermesOutput>(
  output: T,
  event: TrainingEvent,
  stateBefore: TrainingStateSnapshot,
  stateAfter?: TrainingStateSnapshot
): T {
  const envelope: AgentOutputEnvelope = {
    schema_version: OUTPUT_SCHEMA_VERSION,
    contract_version: OUTPUT_CONTRACT_VERSION,
    turn_id: output.turn_id || `turn-${randomUUID()}`,
    event_id: output.event_id || event.event_id,
    session_id: output.session_id || stateBefore.session_id,
    idempotency_key: output.idempotency_key || event.idempotency_key,
    state_before: output.state_before || stateBefore,
    state_delta: output.state_delta || buildStateDelta(output),
    state_after: stateAfter || output.state_after
  };
  return {
    ...output,
    ...envelope
  };
}

export function assertPatchRevisionMatches(plan: PlanCard | undefined | null, patch: PlanPatchOutput["patch"]): void {
  if (!plan || patch.applies_to_revision === undefined) return;
  if (patch.applies_to_plan_id && plan.plan_id && patch.applies_to_plan_id !== plan.plan_id) {
    throw new Error(`Stale plan patch: expected plan ${plan.plan_id}, got ${patch.applies_to_plan_id}`);
  }
  if (plan.plan_revision !== undefined && patch.applies_to_revision !== plan.plan_revision) {
    throw new Error(`Stale plan patch: expected revision ${plan.plan_revision}, got ${patch.applies_to_revision}`);
  }
}
