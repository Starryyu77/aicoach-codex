import { asrMock, type TranscribeRequest, type TranscribeResponse } from "./asrMock.ts";

export async function transcribeAudio(request: TranscribeRequest): Promise<TranscribeResponse> {
  if (!request.provider || request.provider === "mock") {
    return asrMock(request);
  }
  throw new Error(`ASR provider ${request.provider} is not wired yet. Use provider=mock for v1.`);
}

