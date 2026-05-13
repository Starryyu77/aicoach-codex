"use client";

import { FormEvent, useState } from "react";
import { createProviderInstance } from "../../lib/api";
import type { ProviderConfig } from "../../lib/types";

export function HermesProviderForm({ onSaved }: { onSaved: (config: ProviderConfig) => void }) {
  const [type, setType] = useState("hermes-api-server");
  const [label, setLabel] = useState("Local Hermes API Server");
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1:8642/v1");
  const [model, setModel] = useState("hermes-agent");
  const [apiKeyRef, setApiKeyRef] = useState("HERMES_API_KEY");
  const [apiKey, setApiKey] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const config = await createProviderInstance("hermes", {
      type,
      label,
      baseUrl,
      model,
      apiKeyRef,
      apiKey,
      endpointMode: "chat_completions",
      timeoutMs: 30000
    });
    setApiKey("");
    onSaved(config);
  }

  return (
    <form className="grid gap-2 rounded-md bg-[#f4f7f2] p-3" onSubmit={submit}>
      <select className="rounded-md border border-[#d8e1d8] px-3 py-2 text-sm" value={type} onChange={(event) => setType(event.target.value)}>
        <option value="hermes-api-server">Hermes API Server</option>
        <option value="openai-compatible-hermes">OpenAI-compatible Hermes</option>
        <option value="mock">Mock Hermes</option>
      </select>
      <input className="rounded-md border border-[#d8e1d8] px-3 py-2 text-sm" placeholder="Label" value={label} onChange={(event) => setLabel(event.target.value)} />
      <input className="rounded-md border border-[#d8e1d8] px-3 py-2 text-sm" placeholder="Base URL" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
      <input className="rounded-md border border-[#d8e1d8] px-3 py-2 text-sm" placeholder="Model" value={model} onChange={(event) => setModel(event.target.value)} />
      <input className="rounded-md border border-[#d8e1d8] px-3 py-2 text-sm" placeholder="API key ref" value={apiKeyRef} onChange={(event) => setApiKeyRef(event.target.value)} />
      <input className="rounded-md border border-[#d8e1d8] px-3 py-2 text-sm" placeholder="API key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
      <button className="rounded-md bg-[#17201b] px-3 py-2 text-sm font-medium text-white" type="submit">
        新增 Hermes Provider
      </button>
    </form>
  );
}
