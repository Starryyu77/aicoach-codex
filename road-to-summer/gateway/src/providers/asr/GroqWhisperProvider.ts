import { OpenAIWhisperProvider } from "./OpenAIWhisperProvider.ts";

export class GroqWhisperProvider extends OpenAIWhisperProvider {
  protected endpoint() {
    return `${(this.instance.baseUrl || "https://api.groq.com/openai/v1").replace(/\/$/, "")}/audio/transcriptions`;
  }
}
