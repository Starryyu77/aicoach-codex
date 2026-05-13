"use client";

import { useEffect, useState } from "react";
import { getHermesRuntime, getHermesRuntimePresets, updateHermesRuntime } from "../../lib/api";
import type { HermesRuntimeConfig, HermesRuntimePreset } from "../../lib/types";

export function HermesRuntimeSettingsPanel() {
  const [config, setConfig] = useState<HermesRuntimeConfig | null>(null);
  const [presets, setPresets] = useState<HermesRuntimePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("minimax-global");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    getHermesRuntime().then((runtime) => {
      setConfig(runtime);
      if (runtime.activePresetId) setSelectedPresetId(runtime.activePresetId);
    }).catch((caught) => setStatus(caught instanceof Error ? caught.message : String(caught)));
    getHermesRuntimePresets().then((result) => setPresets(result.presets)).catch(() => undefined);
  }, []);

  async function savePreset() {
    const updated = await updateHermesRuntime({
      activePresetId: selectedPresetId,
      apiKey
    });
    setConfig(updated);
    setApiKey("");
    setStatus("已保存 Hermes Runtime 配置。");
  }

  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Hermes Runtime Model</h2>
        <p className="mt-1 text-sm text-[#536158]">
          这里配置 Hermes 自己调用的大模型供应商。Road to Summer Gateway 仍然只调用 Hermes API Server，不直接持有前端 Key。
        </p>
      </div>
      <div className="grid gap-3 rounded-md border border-[#e3e8df] bg-[#f8faf6] p-3">
        <div className="grid gap-1 text-sm text-[#536158]">
          <div>Active preset: {config?.activePresetId || "未设置"}</div>
          <div>Provider: {config?.provider || "未设置"}</div>
          <div>Model: {config?.model || "未设置"}</div>
          <div>Base URL: {config?.baseUrl || "未设置"}</div>
          <div>apiKeyRef: {config?.apiKeyRef || "未设置"} {config?.hasApiKey ? "(hasApiKey)" : ""}</div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_260px_auto]">
        <select
          className="rounded-md border border-[#d8e1d8] px-3 py-2 text-sm"
          value={selectedPresetId}
          onChange={(event) => setSelectedPresetId(event.target.value)}
        >
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>{preset.label}</option>
          ))}
        </select>
        <input
          className="rounded-md border border-[#d8e1d8] px-3 py-2 text-sm"
          placeholder={selectedPreset?.secretPlaceholder || "API key"}
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
        <button className="rounded-md bg-[#17201b] px-3 py-2 text-sm font-medium text-white" onClick={savePreset} type="button">
          保存 Runtime
        </button>
      </div>
      {selectedPreset && <p className="mt-2 text-xs text-[#536158]">{selectedPreset.description}</p>}
      {status && <p className="mt-3 text-sm text-[#1f7a5a]">{status}</p>}
    </section>
  );
}
