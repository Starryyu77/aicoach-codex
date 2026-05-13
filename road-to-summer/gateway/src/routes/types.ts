import type { ProviderRegistry } from "../providers/ProviderRegistry.ts";

export type GatewayContext = {
  providerRegistry: ProviderRegistry;
  stateRoot?: string;
};
