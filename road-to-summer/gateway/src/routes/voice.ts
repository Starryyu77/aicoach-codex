import { transcribeAudio } from "../asr/transcribeAudio.ts";
import type { TranscribeRequest } from "../asr/asrMock.ts";

export async function handleVoiceTranscribe(request: TranscribeRequest) {
  return transcribeAudio(request);
}

