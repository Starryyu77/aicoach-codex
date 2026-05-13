import { confirmMemoryUpdate, getMockMemory } from "../storage/memoryStore.ts";
import type { GatewayContext } from "./types.ts";

export async function handleMemoryGet(context: GatewayContext) {
  return getMockMemory(context.stateRoot);
}

export async function handleMemoryConfirm(context: GatewayContext, request: { id: string }) {
  return confirmMemoryUpdate(request.id, context.stateRoot);
}

