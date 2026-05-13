import { buildHermesMessage } from "../hermes/buildHermesMessage.ts";
import { parseHermesResponse } from "../hermes/parseHermesResponse.ts";
import type { InputSource } from "../hermes/types.ts";
import { mapAgentOutputToUi } from "../ui/mapAgentOutputToUi.ts";
import { getCurrentSession, saveCurrentPlan, saveCurrentSession } from "../storage/currentSessionStore.ts";
import { listTrainingCards, saveTrainingCard } from "../storage/trainingCardStore.ts";
import { addPendingMemoryUpdates, getMockMemory } from "../storage/memoryStore.ts";
import type { GatewayContext } from "./types.ts";

export type ChatRequest = {
  text: string;
  source?: InputSource;
  quick_action?: string;
};

export async function handleChat(context: GatewayContext, request: ChatRequest) {
  const session = await getCurrentSession(context.stateRoot);
  const recentTrainingCards = await listTrainingCards(context.stateRoot);
  const memory = await getMockMemory(context.stateRoot);
  const rawText = request.text || request.quick_action || "";
  const message = buildHermesMessage({
    source: request.source || (request.quick_action ? "quick_action" : "text"),
    rawText,
    currentSession: session,
    recentTrainingCards,
    memorySummary: memory,
    expectedType: /练完|训练结束|总结/.test(rawText)
      ? "training_card"
      : /今天该练什么|今天训练|帮我安排/.test(rawText)
        ? "training_plan"
        : "plan_patch"
  });
  const hermes = await context.hermesClient.sendMessage(message);
  const output = parseHermesResponse(hermes);
  const ui = mapAgentOutputToUi(output, session);
  if (ui.current_session) await saveCurrentSession(ui.current_session, context.stateRoot);
  if (output.type === "training_plan") await saveCurrentPlan(output.plan_card, context.stateRoot);
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

