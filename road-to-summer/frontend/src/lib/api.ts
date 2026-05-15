import type {
  HermesRuntimeConfig,
  HermesRuntimePreset,
  ProviderCategory,
  ProviderConfig,
  ProviderInstance,
  ProviderPreset,
  ProviderTestResult,
  SessionSnapshot,
  TrainingCard,
  UiResponse
} from "./types";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://127.0.0.1:8787";

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `${response.status} ${response.statusText}`;
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.error === "string") return parsed.error;
    if (parsed?.error) return JSON.stringify(parsed.error);
  } catch {
    // Keep the original server text when it is not JSON.
  }
  return text;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${GATEWAY_URL}${path}`);
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<T>;
}

export function sendChat(
  text: string,
  source: "text" | "voice" | "quick_action" = "text",
  meta: { targetDate?: string; timezone?: string } = {}
) {
  return post<UiResponse>("/chat", {
    text,
    source,
    target_date: meta.targetDate,
    timezone: meta.timezone
  });
}

export function transcribeVoice(audio: string, meta: { fileName?: string; mimeType?: string } = {}) {
  return post<{ text: string; confidence?: number; provider: string; durationMs?: number }>("/voice/transcribe", {
    audio,
    fileName: meta.fileName,
    mimeType: meta.mimeType
  });
}

export function assessMovement(exercise: string, media = "mock-frame") {
  return post<UiResponse & { assessment: unknown }>("/vision/assess", {
    exercise,
    media,
    provider: "mock"
  });
}

export function startSession(meta: { targetDate?: string; timezone?: string } = {}) {
  return post("/session/start", {
    location: "公寓健身房",
    target_date: meta.targetDate,
    timezone: meta.timezone
  });
}

export function resetSession(meta: { targetDate?: string; timezone?: string } = {}) {
  return post<SessionSnapshot>("/session/reset", {
    location: "公寓健身房",
    target_date: meta.targetDate,
    timezone: meta.timezone
  });
}

export function getCurrentSession() {
  return get<SessionSnapshot>("/session/current");
}

export function endSession(meta: { targetDate?: string; timezone?: string } = {}) {
  return post<UiResponse>("/session/end", {
    target_date: meta.targetDate,
    timezone: meta.timezone
  });
}

export function getHistory() {
  return get("/history");
}

export function deleteHistoryCard(id: string) {
  return del<{ deleted: boolean; id: string; removed_paths: string[] }>(`/history/${id}`);
}

export function updateHistoryCard(id: string, patch: Partial<Pick<TrainingCard, "date" | "timezone" | "location" | "duration" | "theme">>) {
  return put<TrainingCard>(`/history/${id}`, patch);
}

export function getMemory() {
  return get("/memory");
}

export function refreshMemory(reason = "manual") {
  return post("/memory/refresh", { reason });
}

export function refreshMemoryOnLeave(reason = "page_leave") {
  const body = JSON.stringify({ reason });
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const sent = navigator.sendBeacon(`${GATEWAY_URL}/memory/refresh`, new Blob([body], { type: "text/plain;charset=UTF-8" }));
    if (sent) return;
  }
  if (typeof fetch !== "undefined") {
    fetch(`${GATEWAY_URL}/memory/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true
    }).catch(() => undefined);
  }
}

export function confirmMemory(id: string) {
  return post("/memory/confirm", { id });
}

export function getProviders() {
  return get<ProviderConfig>("/providers");
}

export function getProviderPresets() {
  return get<{ presets: Record<ProviderCategory, ProviderPreset[]> }>("/providers/presets");
}

export function testProvider(category: ProviderCategory, id?: string) {
  return post<ProviderTestResult>(`/providers/${category}/test`, { id });
}

export function setActiveProvider(category: ProviderCategory, id: string) {
  return put<ProviderConfig>(`/providers/${category}/active`, { id });
}

export function createProviderInstance(category: ProviderCategory, instance: Partial<ProviderInstance> & { apiKey?: string }) {
  return post<ProviderConfig>(`/providers/${category}/instances`, instance);
}

export function updateProviderInstance(category: ProviderCategory, id: string, instance: Partial<ProviderInstance> & { apiKey?: string }) {
  return put<ProviderConfig>(`/providers/${category}/instances/${id}`, instance);
}

export function deleteProviderInstance(category: ProviderCategory, id: string) {
  return del<ProviderConfig>(`/providers/${category}/instances/${id}`);
}

export function getHermesRuntime() {
  return get<HermesRuntimeConfig>("/hermes-runtime");
}

export function getHermesRuntimePresets() {
  return get<{ presets: HermesRuntimePreset[] }>("/hermes-runtime/presets");
}

export function updateHermesRuntime(config: Partial<HermesRuntimeConfig> & { apiKey?: string }) {
  return put<HermesRuntimeConfig>("/hermes-runtime", config);
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<T>;
}

async function del<T>(path: string): Promise<T> {
  const response = await fetch(`${GATEWAY_URL}${path}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<T>;
}
