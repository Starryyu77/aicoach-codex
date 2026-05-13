import type { TranscribeAudioInput } from "../providers/types.ts";
import type { GatewayContext } from "./types.ts";

export async function handleVoiceTranscribe(context: GatewayContext, request: TranscribeAudioInput) {
  const asrProvider = await context.providerRegistry.getAsrProvider();
  return asrProvider.transcribe(request);
}
