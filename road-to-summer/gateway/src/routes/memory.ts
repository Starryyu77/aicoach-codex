import { confirmMemoryUpdate, getMockMemory } from "../storage/memoryStore.ts";
import { getMemoryDisplay, refreshMemoryDisplay } from "../storage/memoryDisplayStore.ts";
import type { GatewayContext } from "./types.ts";

export async function handleMemoryGet(context: GatewayContext) {
  const [memory, display] = await Promise.all([
    getMockMemory(context.stateRoot),
    getMemoryDisplay(context.stateRoot)
  ]);
  return {
    ...memory,
    display
  };
}

export async function handleMemoryConfirm(context: GatewayContext, request: { id: string }) {
  const memory = await confirmMemoryUpdate(request.id, context.stateRoot);
  const display = await refreshMemoryDisplay("memory_confirm", context.stateRoot);
  return {
    ...memory,
    display
  };
}

export async function handleMemoryRefresh(context: GatewayContext, request: Record<string, unknown> = {}) {
  const reason = typeof request.reason === "string" ? request.reason : "manual";
  const [memory, display] = await Promise.all([
    getMockMemory(context.stateRoot),
    refreshMemoryDisplay(reason, context.stateRoot)
  ]);
  return {
    ...memory,
    display
  };
}
