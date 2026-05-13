export type AsrProvider = "mock" | "whisper" | "doubao" | "openai";

export type TranscribeRequest = {
  audio: string;
  provider?: AsrProvider;
};

export type TranscribeResponse = {
  text: string;
  confidence: number;
  provider: AsrProvider;
  raw: Record<string, unknown>;
};

export async function asrMock(request: TranscribeRequest): Promise<TranscribeResponse> {
  return {
    text: request.audio || "高位下拉有人了",
    confidence: 0.9,
    provider: "mock",
    raw: {
      note: "Mock ASR treats request.audio as transcript text when no real provider is configured."
    }
  };
}

