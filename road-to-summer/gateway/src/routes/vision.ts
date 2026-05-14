import { buildHermesMessage } from "../hermes/buildHermesMessage.ts";
import { parseHermesResponse } from "../hermes/parseHermesResponse.ts";
import { mapAgentOutputToUi } from "../ui/mapAgentOutputToUi.ts";
import { getCurrentPlan, getCurrentSession, saveCurrentPlan, saveCurrentSession } from "../storage/currentSessionStore.ts";
import { buildTimeContext } from "../time/timeContext.ts";
import type { VisionAssessInput } from "../providers/types.ts";
import type { GatewayContext } from "./types.ts";

export async function handleVisionAssess(context: GatewayContext, request: VisionAssessInput) {
  const visionProvider = await context.providerRegistry.getVisionProvider();
  const assessment = await visionProvider.assess(request);
  const session = await getCurrentSession(context.stateRoot);
  const currentPlan = await getCurrentPlan(context.stateRoot);
  const timeContext = buildTimeContext({
    rawText: `movement_assessment:${assessment.exercise}`,
    timezone: session.timezone,
    targetDate: session.target_date
  });
  const message = buildHermesMessage({
    source: "vision",
    rawText: `movement_assessment:${assessment.exercise}`,
    currentSession: session,
    movementAssessment: assessment,
    timeContext,
    expectedType: "plan_patch"
  });
  const hermesProvider = await context.providerRegistry.getHermesProvider();
  const hermes = await hermesProvider.sendMessage(message);
  const output = parseHermesResponse(hermes);
  const ui = mapAgentOutputToUi(output, session, currentPlan);
  if (ui.current_session) await saveCurrentSession(ui.current_session, context.stateRoot);
  if (ui.current_plan) await saveCurrentPlan(ui.current_plan, context.stateRoot);
  return {
    assessment,
    hermes_output: output,
    ui
  };
}
