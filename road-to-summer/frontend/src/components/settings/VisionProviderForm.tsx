"use client";

import { FormEvent, useState } from "react";
import { createProviderInstance } from "../../lib/api";
import type { ProviderConfig } from "../../lib/types";

export function VisionProviderForm({ onSaved }: { onSaved: (config: ProviderConfig) => void }) {
  const [type, setType] = useState("external-pose-http");
  const [label, setLabel] = useState("External Pose HTTP");
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1:8788/assess");
  const [apiKeyRef, setApiKeyRef] = useState("POSE_TOOL_API_KEY");
  const [apiKey, setApiKey] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const config = await createProviderInstance("vision", {
      type,
      label,
      baseUrl,
      apiKeyRef,
      apiKey,
      timeoutMs: 30000
    });
    setApiKey("");
    onSaved(config);
  }

  return (
    <form className="grid gap-2 rounded-md bg-[#f4f7f2] p-3" onSubmit={submit}>
      <select className="rounded-md border border-[#d8e1d8] px-3 py-2 text-sm" value={type} onChange={(event) => setType(event.target.value)}>
        <option value="external-pose-http">External Pose HTTP</option>
        <option value="mock">Mock Vision</option>
      </select>
      <input className="rounded-md border border-[#d8e1d8] px-3 py-2 text-sm" placeholder="Label" value={label} onChange={(event) => setLabel(event.target.value)} />
      <input className="rounded-md border border-[#d8e1d8] px-3 py-2 text-sm" placeholder="Base URL" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
      <input className="rounded-md border border-[#d8e1d8] px-3 py-2 text-sm" placeholder="API key ref" value={apiKeyRef} onChange={(event) => setApiKeyRef(event.target.value)} />
      <input className="rounded-md border border-[#d8e1d8] px-3 py-2 text-sm" placeholder="API key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
      <button className="rounded-md bg-[#17201b] px-3 py-2 text-sm font-medium text-white" type="submit">
        新增 Vision Provider
      </button>
    </form>
  );
}
