import { cleanTranscript } from "../input/cleanTranscript.mjs";

export function transcribeStub(rawText, options = {}) {
  return {
    rawText,
    cleanedText: cleanTranscript(rawText),
    confidence: options.confidence ?? 0.99,
    segments: [
      {
        text: rawText,
        startMs: 0,
        endMs: Math.max(800, String(rawText).length * 120),
        confidence: options.confidence ?? 0.99
      }
    ]
  };
}

