import { deleteTrainingCard, getTrainingCard, listTrainingCards } from "../storage/trainingCardStore.ts";
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
