import { handleChat } from "./chat.ts";
import type { GatewayContext } from "./types.ts";
import { getStorePaths } from "../storage/fileStore.ts";
import { getCurrentPlan, getCurrentSession, resetSession, startSession } from "../storage/currentSessionStore.ts";
import { buildTimeContext } from "../time/timeContext.ts";

export async function handleGetCurrentSession(context: GatewayContext) {
  const session = await getCurrentSession(context.stateRoot);
  const isEnded = session.phase === "ended";
  const currentPlan = isEnded ? null : await getCurrentPlan(context.stateRoot);
  const visibleSession = isEnded
    ? { ...session, plan_card: undefined, current_exercise: undefined }
    : session;
  const paths = getStorePaths(context.stateRoot);
  const timeContext = buildTimeContext({
    timezone: visibleSession.timezone,
    targetDate: visibleSession.target_date || visibleSession.session_date
  });
  return {
    ...visibleSession,
    time_context: timeContext,
    current_plan: currentPlan,
    storage: {
      state_root: paths.stateRoot,
      current_session: paths.sessionFile,
      current_plan: paths.currentPlanFile,
      training_cards_dir: paths.trainingCardsDir
    }
  };
}

export async function handleStartSession(context: GatewayContext, request: Record<string, unknown> = {}) {
  return startSession(request as any, context.stateRoot);
}

export async function handleResetSession(context: GatewayContext, request: Record<string, unknown> = {}) {
  const session = await resetSession(request as any, context.stateRoot);
  const paths = getStorePaths(context.stateRoot);
  const timeContext = buildTimeContext({
    timezone: session.timezone,
    targetDate: session.target_date || session.session_date
  });
  return {
    ...session,
    time_context: timeContext,
    current_plan: null,
    storage: {
      state_root: paths.stateRoot,
      current_session: paths.sessionFile,
      current_plan: paths.currentPlanFile,
      training_cards_dir: paths.trainingCardsDir
    }
  };
}

export async function handleEndSession(context: GatewayContext, request: Record<string, unknown> = {}) {
  const session = await getCurrentSession(context.stateRoot);
  const targetDate = typeof request.target_date === "string" ? request.target_date : session.target_date;
  const timezone = typeof request.timezone === "string" ? request.timezone : session.timezone;
  return handleChat(context, {
    text: targetDate ? `${targetDate} 训练结束，帮我总结一下。` : "训练结束，帮我总结一下。",
    display_text: "结束训练",
    source: "system",
    target_date: targetDate,
    timezone
  });
}
