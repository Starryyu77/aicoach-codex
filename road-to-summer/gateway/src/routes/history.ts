import { deleteTrainingCard, getTrainingCard, listTrainingCards, updateTrainingCard } from "../storage/trainingCardStore.ts";
import type { GatewayContext } from "./types.ts";

export async function handleHistoryList(context: GatewayContext) {
  return listTrainingCards(context.stateRoot);
}

export async function handleHistoryDetail(context: GatewayContext, id: string) {
  return getTrainingCard(id, context.stateRoot);
}

export async function handleHistoryDelete(context: GatewayContext, id: string) {
  return deleteTrainingCard(id, context.stateRoot);
}

export async function handleHistoryUpdate(context: GatewayContext, id: string, request: Record<string, unknown>) {
  return updateTrainingCard(id, {
    date: typeof request.date === "string" ? request.date : undefined,
    timezone: typeof request.timezone === "string" ? request.timezone : undefined,
    location: typeof request.location === "string" ? request.location : undefined,
    duration: typeof request.duration === "string" ? request.duration : undefined,
    theme: typeof request.theme === "string" ? request.theme : undefined
  }, context.stateRoot);
}
