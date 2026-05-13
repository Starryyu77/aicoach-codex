import type { HermesClient } from "../hermes/HermesClient.ts";

export type GatewayContext = {
  hermesClient: HermesClient;
  stateRoot?: string;
};

