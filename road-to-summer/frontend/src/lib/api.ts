import type { UiResponse } from "./types";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://127.0.0.1:8787";

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${GATEWAY_URL}${path}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export function sendChat(text: string, source: "text" | "quick_action" = "text") {
  return post<UiResponse>("/chat", { text, source });
}

export function transcribeVoice(audio: string) {
  return post<{ text: string; confidence: number; provider: string }>("/voice/transcribe", {
    audio,
    provider: "mock"
  });
}

export function assessMovement(exercise: string, media = "mock-frame") {
  return post<UiResponse & { assessment: unknown }>("/vision/assess", {
    exercise,
    media,
    provider: "mock"
  });
}

export function startSession() {
  return post("/session/start", { location: "公寓健身房" });
}

export function endSession() {
  return post<UiResponse>("/session/end", {});
}

export function getHistory() {
  return get("/history");
}

export function getMemory() {
  return get("/memory");
}

export function confirmMemory(id: string) {
  return post("/memory/confirm", { id });
}

