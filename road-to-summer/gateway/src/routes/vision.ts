import { assessMovement, type VisionAssessRequest } from "../vision/assessMovement.ts";
import { buildHermesMessage } from "../hermes/buildHermesMessage.ts";
import { parseHermesResponse } from "../hermes/parseHermesResponse.ts";
import { mapAgentOutputToUi } from "../ui/mapAgentOutputToUi.ts";
import { getCurrentSession, saveCurrentSession } from "../storage/currentSessionStore.ts";
import type { GatewayContext } from "./types.ts";

export async function handleVisionAssess(context: GatewayContext, request: VisionAssessRequest) {
  const assessment = await assessMovement(request);
  const session = await getCurrentSession(context.stateRoot);
  const message = buildHermesMessage({
    source: "vision",
    rawText: `movement_assessment:${assessment.exercise}`,
    currentSession: session,
    movementAssessment: assessment,
    expectedType: "plan_patch"
  });
  const hermes = await context.hermesClient.sendMessage(message);
  const output = parseHermesResponse(hermes);
  const ui = mapAgentOutputToUi(output, session);
  if (ui.current_session) await saveCurrentSession(ui.current_session, context.stateRoot);
  return {
    assessment,
    hermes_output: output,
    ui
  };
}

