import type { ProviderCategory, ProviderConfig, ProviderInstance, PublicProviderConfig } from "./types.ts";
import { loadConfig } from "../config/loadConfig.ts";
import { saveConfig } from "../config/saveConfig.ts";
import { getSecret, setSecret } from "../config/secrets.ts";

function sanitizeRef(ref?: string) {
  return ref || "";
}

export class ProviderConfigStore {
  readonly runtimeRoot?: string;

  constructor(runtimeRoot?: string) {
    this.runtimeRoot = runtimeRoot;
  }

  async getConfig(): Promise<ProviderConfig> {
    return loadConfig(this.runtimeRoot);
  }

  async save(config: ProviderConfig): Promise<ProviderConfig> {
    return saveConfig(config, this.runtimeRoot);
  }

  async getPublicConfig(): Promise<PublicProviderConfig> {
    const config = await this.getConfig();
    const categories: ProviderCategory[] = ["hermes", "asr", "vision"];
    const providers: PublicProviderConfig["providers"] = {} as PublicProviderConfig["providers"];

    for (const category of categories) {
      providers[category] = {
        active: config.providers[category].active,
        instances: await Promise.all(config.providers[category].instances.map(async (instance) => ({
          ...instance,
          apiKeyRef: instance.apiKeyRef,
          hasApiKey: Boolean(await getSecret(instance.apiKeyRef, this.runtimeRoot))
        })))
      };
    }

    return { providers };
  }

  async getActiveInstance(category: ProviderCategory): Promise<ProviderInstance> {
    const config = await this.getConfig();
    const section = config.providers[category];
    const instance = section.instances.find((item) => item.id === section.active);
    if (!instance) throw new Error(`No active ${category} provider found for id ${section.active}`);
    return instance;
  }

  async setActive(category: ProviderCategory, id: string): Promise<ProviderConfig> {
    const config = await this.getConfig();
    if (!config.providers[category].instances.some((item) => item.id === id)) {
      throw new Error(`Unknown ${category} provider instance: ${id}`);
    }
    config.providers[category].active = id;
    return this.save(config);
  }

  async upsertInstance(
    category: ProviderCategory,
    instance: ProviderInstance,
    apiKey?: string,
    secretValues: Record<string, string> = {}
  ): Promise<ProviderConfig> {
    const config = await this.getConfig();
    const current = config.providers[category].instances;
    const normalized = {
      ...instance,
      id: instance.id || `${instance.type}-${Date.now()}`,
      apiKeyRef: sanitizeRef(instance.apiKeyRef)
    };
    const index = current.findIndex((item) => item.id === normalized.id);
    if (index >= 0) current[index] = normalized;
    else current.push(normalized);
    if (apiKey && normalized.apiKeyRef) {
      await setSecret(normalized.apiKeyRef, apiKey, this.runtimeRoot);
    }
    for (const [key, value] of Object.entries(secretValues)) {
      if (key && value) await setSecret(key, value, this.runtimeRoot);
    }
    return this.save(config);
  }

  async deleteInstance(category: ProviderCategory, id: string): Promise<ProviderConfig> {
    const config = await this.getConfig();
    const section = config.providers[category];
    section.instances = section.instances.filter((item) => item.id !== id);
    if (section.active === id) {
      section.active = section.instances[0]?.id || "";
    }
    return this.save(config);
  }
}
