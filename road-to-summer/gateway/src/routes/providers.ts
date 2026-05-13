import type { ProviderCategory, ProviderInstance } from "../providers/types.ts";
import { PROVIDER_PRESETS } from "../providers/presets.ts";
import type { GatewayContext } from "./types.ts";

export type ProviderInstanceRequest = ProviderInstance & {
  apiKey?: string;
  secretValues?: Record<string, string>;
};

const CATEGORIES = new Set(["hermes", "asr", "vision"]);

export function parseProviderCategory(value: string): ProviderCategory {
  if (!CATEGORIES.has(value)) throw new Error(`Unsupported provider category: ${value}`);
  return value as ProviderCategory;
}

function normalizeInstance(category: ProviderCategory, request: Partial<ProviderInstanceRequest>, id?: string): ProviderInstance {
  const type = request.type || "mock";
  return {
    id: id || request.id || `${category}-${type}-${Date.now()}`,
    type,
    label: request.label || `${category} ${type}`,
    baseUrl: request.baseUrl,
    model: request.model,
    apiKeyRef: request.apiKeyRef || "",
    timeoutMs: request.timeoutMs,
    endpointMode: request.endpointMode,
    extra: request.extra
  };
}

export async function handleProvidersGet(context: GatewayContext) {
  return context.providerRegistry.store.getPublicConfig();
}

export async function handleProviderPresetsGet() {
  return { presets: PROVIDER_PRESETS };
}

export async function handleProviderTest(context: GatewayContext, category: ProviderCategory, request: { id?: string } = {}) {
  if (!request.id) {
    const provider = await context.providerRegistry.getProvider(category);
    return provider.test();
  }
  const instance = (await context.providerRegistry.store.getConfig()).providers[category].instances.find((item) => item.id === request.id);
  if (!instance) throw new Error(`Unknown ${category} provider instance: ${request.id}`);
  if (category === "hermes") return context.providerRegistry.createHermesProvider(instance).test();
  if (category === "asr") return context.providerRegistry.createAsrProvider(instance).test();
  return context.providerRegistry.createVisionProvider(instance).test();
}

export async function handleProviderSetActive(context: GatewayContext, category: ProviderCategory, request: { id?: string }) {
  if (!request.id) throw new Error("Missing provider id.");
  await context.providerRegistry.store.setActive(category, request.id);
  return context.providerRegistry.store.getPublicConfig();
}

export async function handleProviderCreateInstance(context: GatewayContext, category: ProviderCategory, request: ProviderInstanceRequest) {
  await context.providerRegistry.store.upsertInstance(category, normalizeInstance(category, request), request.apiKey, request.secretValues);
  return context.providerRegistry.store.getPublicConfig();
}

export async function handleProviderUpdateInstance(
  context: GatewayContext,
  category: ProviderCategory,
  id: string,
  request: Partial<ProviderInstanceRequest>
) {
  const config = await context.providerRegistry.store.getConfig();
  const existing = config.providers[category].instances.find((item) => item.id === id);
  if (!existing) throw new Error(`Unknown ${category} provider instance: ${id}`);
  await context.providerRegistry.store.upsertInstance(
    category,
    normalizeInstance(category, { ...existing, ...request }, id),
    request.apiKey,
    request.secretValues
  );
  return context.providerRegistry.store.getPublicConfig();
}

export async function handleProviderDeleteInstance(context: GatewayContext, category: ProviderCategory, id: string) {
  await context.providerRegistry.store.deleteInstance(category, id);
  return context.providerRegistry.store.getPublicConfig();
}
