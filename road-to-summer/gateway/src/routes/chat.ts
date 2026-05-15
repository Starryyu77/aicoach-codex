import { buildHermesMessage } from "../hermes/buildHermesMessage.ts";
import { parseHermesResponse } from "../hermes/parseHermesResponse.ts";
import type { HermesMessage, HermesOutput, InputSource } from "../hermes/types.ts";
import { mapAgentOutputToUi } from "../ui/mapAgentOutputToUi.ts";
import { buildAgentUiDocument, validateAgentUiDocument } from "../ui/agentUi.ts";
import { getCurrentPlan, getCurrentSession, saveCurrentPlan, saveCurrentSession } from "../storage/currentSessionStore.ts";
import { listTrainingCards, saveTrainingCard } from "../storage/trainingCardStore.ts";
import { addPendingMemoryUpdates, getMockMemory } from "../storage/memoryStore.ts";
import { buildTimeContext, type TimeContext } from "../time/timeContext.ts";
import type { GatewayContext } from "./types.ts";
import {
  assertPatchRevisionMatches,
  attachOutputEnvelope,
  buildEventMetadata,
  ensurePlanState,
  findPlanItem,
  firstPlanItem,
  resolvePatchTarget,
  snapshotTrainingState
} from "../state/planState.ts";

export type ChatRequest = {
  text: string;
  source?: InputSource;
  quick_action?: string;
  target_date?: string;
  timezone?: string;
  event_id?: string;
  idempotency_key?: string;
};

function expectedOutputType(rawText: string, timeContext: TimeContext): "training_plan" | "plan_patch" | "training_card" | "training_review" {
  if (/(复盘|回顾|分析|看看).*(训练|记录)|(?:前几天|这几天|最近|某一天|5月\d{1,2}日|20\d{2}-\d{1,2}-\d{1,2}).*(训练|记录).*(复盘|总结|回顾|分析)/.test(rawText)) {
    return "training_review";
  }
  if (timeContext.temporal_intent === "backfill_training_log") return "training_card";
  if (/练完|训练结束|总结/.test(rawText)) return "training_card";
  if (
    timeContext.temporal_intent === "future_planning" ||
    /该练什么|训练计划|帮我安排|安排.*训练|练什么|今天想练|想练(?:胸|背|腿|肩|下肢|上肢)|今天.*练(?:胸|背|腿|肩|下肢|上肢)/.test(rawText)
  ) {
    return "training_plan";
  }
  return "plan_patch";
}

async function getHermesOutput(context: GatewayContext, message: HermesMessage): Promise<{ output: HermesOutput }> {
  const hermesProvider = await context.providerRegistry.getHermesProvider();
  if (hermesProvider.instance.type === "mock") {
    throw new Error("Active Hermes provider is mock. Configure a real Hermes provider before using /chat.");
  }
  const hermes = await hermesProvider.sendMessage(message);
  return { output: parseHermesResponse(hermes) };
}

export async function handleChat(context: GatewayContext, request: ChatRequest) {
  const session = await getCurrentSession(context.stateRoot);
  const storedPlan = await getCurrentPlan(context.stateRoot);
  const currentPlan = storedPlan
    ? ensurePlanState(storedPlan)
    : session.plan_card
      ? ensurePlanState(session.plan_card)
      : null;
  const recentTrainingCards = await listTrainingCards(context.stateRoot);
  const memory = await getMockMemory(context.stateRoot);
  const rawText = request.text || request.quick_action || "";
  const source = request.source || (request.quick_action ? "quick_action" : "text");
  const timeContext = buildTimeContext({
    rawText,
    timezone: request.timezone || session.timezone,
    targetDate: request.target_date || session.target_date
  });
  const currentItem = findPlanItem(currentPlan, session.current_item_id, session.current_exercise) || firstPlanItem(currentPlan);
  const sessionWithTime = {
    ...session,
    timezone: timeContext.timezone,
    session_date: session.session_date || timeContext.target_date,
    target_date: timeContext.target_date,
    target_date_label: timeContext.target_date_label,
    plan_id: currentPlan?.plan_id || session.plan_id,
    plan_revision: currentPlan?.plan_revision || session.plan_revision,
    current_item_id: session.current_item_id || currentItem?.item_id,
    current_exercise: session.current_exercise || currentItem?.exercise,
    plan_card: currentPlan || session.plan_card,
    updated_at: timeContext.now_iso
  };
  const expectedType = expectedOutputType(rawText, timeContext);
  const eventMeta = buildEventMetadata({
    source,
    rawText,
    session: sessionWithTime,
    plan: currentPlan,
    timeContext,
    expectedType,
    eventId: request.event_id,
    idempotencyKey: request.idempotency_key
  });
  const message = buildHermesMessage({
    source,
    rawText,
    currentSession: sessionWithTime,
    recentTrainingCards,
    memorySummary: memory,
    timeContext,
    expectedType,
    event: eventMeta.event,
    stateBefore: eventMeta.state_before
  });
  const result = await getHermesOutput(context, message);
  let output: HermesOutput = result.output;
  if (output.type === "training_plan") {
    output.plan_card = {
      ...ensurePlanState(output.plan_card),
      target_date: timeContext.target_date,
      date_label: timeContext.target_date_label,
      timezone: timeContext.timezone
    };
  }
  if (output.type === "plan_patch") {
    output.patch = resolvePatchTarget(output.patch, currentPlan, sessionWithTime);
    assertPatchRevisionMatches(currentPlan, output.patch);
  }
  if (output.type === "training_card") {
    output.training_card = {
      ...output.training_card,
      date: timeContext.target_date,
      timezone: timeContext.timezone,
      date_label: timeContext.target_date_label,
      completed_at: timeContext.now_iso
    };
  }
  const ui = mapAgentOutputToUi(output, sessionWithTime, currentPlan);
  const stateAfter = snapshotTrainingState(ui.current_session || sessionWithTime, ui.current_plan || currentPlan, timeContext.now_iso);
  output = attachOutputEnvelope(output, eventMeta.event, eventMeta.state_before, stateAfter);
  if (ui.current_session) {
    ui.current_session = {
      ...ui.current_session,
      recent_event_ids: Array.from(new Set([...(ui.current_session.recent_event_ids || []), eventMeta.event.event_id])).slice(-50)
    };
  }
  ui.agent_ui = buildAgentUiDocument(output, ui);
  const agentUiValidation = validateAgentUiDocument(ui.agent_ui);
  if (!agentUiValidation.valid) {
    throw new Error(`Invalid agent_ui: ${agentUiValidation.error}`);
  }
  if (ui.current_session) await saveCurrentSession(ui.current_session, context.stateRoot);
  if (ui.current_plan) await saveCurrentPlan(ui.current_plan, context.stateRoot);
  if (output.type === "training_card") {
    ui.training_card = await saveTrainingCard(output.training_card, context.stateRoot);
  }
  const updates = "memory_updates" in output ? output.memory_updates || [] : [];
  if (updates.length) await addPendingMemoryUpdates(updates, context.stateRoot);
  return {
    hermes_output: output,
    ui
  };
}
