import type { HermesMessage, HermesResponse } from "./types.ts";

export interface HermesClient {
  sendMessage(input: HermesMessage): Promise<HermesResponse>;
}
