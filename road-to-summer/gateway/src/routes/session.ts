import { handleChat } from "./chat.ts";
import type { GatewayContext } from "./types.ts";
import { getCurrentSession, startSession } from "../storage/currentSessionStore.ts";

export async function handleGetCurrentSession(context: GatewayContext) {
  return getCurrentSession(context.stateRoot);
}

export async function handleStartSession(context: GatewayContext, request: Record<string, unknown> = {}) {
  return startSession(request as any, context.stateRoot);
}

export async function handleEndSession(context: GatewayContext) {
  return handleChat(context, {
    text: "今天练完了，帮我总结一下。",
    source: "system"
  });
}

