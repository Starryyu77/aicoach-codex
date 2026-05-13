"use client";

import { useEffect, useState } from "react";
import { createProviderInstance, deleteProviderInstance, getProviderPresets, getProviders, setActiveProvider } from "../../lib/api";
import type { ProviderCategory, ProviderConfig, ProviderInstance, ProviderPreset } from "../../lib/types";
import { AsrProviderForm } from "./AsrProviderForm";
import { HermesProviderForm } from "./HermesProviderForm";
import { HermesRuntimeSettingsPanel } from "./HermesRuntimeSettingsPanel";
import { ProviderTestButton } from "./ProviderTestButton";
import { VisionProviderForm } from "./VisionProviderForm";

const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  hermes: "Hermes",
  asr: "ASR",
  vision: "Vision"
};

function ProviderForm({ category, onSaved }: { category: ProviderCategory; onSaved: (config: ProviderConfig) => void }) {
  if (category === "hermes") return <HermesProviderForm onSaved={onSaved} />;
  if (category === "asr") return <AsrProviderForm onSaved={onSaved} />;
  return <VisionProviderForm onSaved={onSaved} />;
}

function ProviderRow({
  category,
  instance,
  isActive,
  onUpdated
}: {
  category: ProviderCategory;
  instance: ProviderInstance;
  isActive: boolean;
  onUpdated: (config: ProviderConfig) => void;
}) {
  async function activate() {
    onUpdated(await setActiveProvider(category, instance.id));
  }

  async function remove() {
    onUpdated(await deleteProviderInstance(category, instance.id));
  }

  return (
    <div className="grid gap-3 rounded-md border border-[#e3e8df] bg-white p-3 md:grid-cols-[1fr_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{instance.label}</span>
          <span className="rounded bg-[#f4f7f2] px-2 py-0.5 text-xs text-[#536158]">{instance.type}</span>
          {isActive && <span className="rounded bg-[#e1f1e8] px-2 py-0.5 text-xs text-[#1f7a5a]">Active</span>}
          {instance.hasApiKey && <span className="rounded bg-[#eef0f4] px-2 py-0.5 text-xs text-[#536158]">hasApiKey</span>}
        </div>
        <div className="mt-2 grid gap-1 text-xs text-[#536158]">
          {instance.baseUrl && <div>baseUrl: {instance.baseUrl}</div>}
          {instance.model && <div>model: {instance.model}</div>}
          {instance.apiKeyRef && <div>apiKeyRef: {instance.apiKeyRef}</div>}
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <ProviderTestButton category={category} id={instance.id} />
        {!isActive && (
          <button className="rounded-md bg-[#1f7a5a] px-3 py-1.5 text-xs font-medium text-white" onClick={activate} type="button">
            设为 Active
          </button>
        )}
        {!isActive && (
          <button className="rounded-md border border-[#d8e1d8] px-3 py-1.5 text-xs font-medium" onClick={remove} type="button">
            删除
          </button>
        )}
      </div>
    </div>
  );
}

export function ProviderSettingsPanel() {
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [presets, setPresets] = useState<Record<ProviderCategory, ProviderPreset[]> | null>(null);
  const [error, setError] = useState("");
  const [presetKeys, setPresetKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    getProviders().then(setConfig).catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
    getProviderPresets().then((result) => setPresets(result.presets)).catch(() => undefined);
  }, []);

  async function applyPreset(category: ProviderCategory, preset: ProviderPreset) {
    const apiKey = presetKeys[`${category}:${preset.id}`] || "";
    const updated = await createProviderInstance(category, {
      ...preset,
      apiKey
    });
    setConfig(await setActiveProvider(category, preset.id).catch(() => updated));
    setPresetKeys((current) => ({ ...current, [`${category}:${preset.id}`]: "" }));
  }

  if (error) return <div className="rounded-lg bg-white p-5 text-sm text-[#9b2f2f] shadow-sm">{error}</div>;
  if (!config) return <div className="rounded-lg bg-white p-5 text-sm text-[#536158] shadow-sm">加载 Provider 配置...</div>;

  return (
    <div className="grid gap-5">
      <HermesRuntimeSettingsPanel />
      {(["hermes", "asr", "vision"] as ProviderCategory[]).map((category) => {
        const section = config.providers[category];
        return (
          <section className="rounded-lg bg-white p-5 shadow-sm" key={category}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{CATEGORY_LABELS[category]} Provider</h2>
                <p className="mt-1 text-sm text-[#536158]">Active: {section.active || "未设置"}</p>
              </div>
              <ProviderTestButton category={category} />
            </div>
            <div className="grid gap-3">
              {section.instances.map((instance) => (
                <ProviderRow
                  category={category}
                  instance={instance}
                  isActive={instance.id === section.active}
                  key={instance.id}
                  onUpdated={setConfig}
                />
              ))}
            </div>
            {presets?.[category]?.length ? (
              <div className="mt-4 grid gap-3">
                <h3 className="text-sm font-semibold">快速配置模板</h3>
                {presets[category].map((preset) => (
                  <div className="grid gap-2 rounded-md bg-[#f4f7f2] p-3 md:grid-cols-[1fr_260px_auto]" key={preset.id}>
                    <div>
                      <div className="font-medium">{preset.label}</div>
                      <div className="mt-1 text-xs text-[#536158]">{preset.description}</div>
                      <div className="mt-1 text-xs text-[#536158]">
                        {preset.baseUrl || "local"} {preset.model ? ` / ${preset.model}` : ""}
                      </div>
                    </div>
                    <input
                      className="rounded-md border border-[#d8e1d8] px-3 py-2 text-sm"
                      placeholder={preset.secretPlaceholder || preset.secretLabel || "API key"}
                      type="password"
                      value={presetKeys[`${category}:${preset.id}`] || ""}
                      onChange={(event) => setPresetKeys((current) => ({ ...current, [`${category}:${preset.id}`]: event.target.value }))}
                    />
                    <button className="rounded-md bg-[#17201b] px-3 py-2 text-sm font-medium text-white" onClick={() => applyPreset(category, preset)} type="button">
                      保存并启用
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-4">
              <ProviderForm category={category} onSaved={setConfig} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
