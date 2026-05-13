import {
  getPublicHermesRuntimeConfig,
  HERMES_RUNTIME_PRESETS,
  updateHermesRuntimeConfig,
  type HermesRuntimeUpdateRequest
} from "../config/hermesRuntimeConfig.ts";
import type { GatewayContext } from "./types.ts";

function runtimeRootOf(context?: GatewayContext) {
  return context?.providerRegistry.store.runtimeRoot;
}

export async function handleHermesRuntimeGet(context?: GatewayContext) {
  return getPublicHermesRuntimeConfig(runtimeRootOf(context));
}

export async function handleHermesRuntimePresetsGet() {
  return { presets: HERMES_RUNTIME_PRESETS };
}

export async function handleHermesRuntimeUpdate(context: GatewayContext | undefined, request: HermesRuntimeUpdateRequest) {
  const runtimeRoot = runtimeRootOf(context);
  await updateHermesRuntimeConfig(request, runtimeRoot);
  return getPublicHermesRuntimeConfig(runtimeRoot);
}
