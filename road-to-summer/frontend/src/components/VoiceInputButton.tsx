"use client";

import { transcribeVoice } from "../lib/api";

export function VoiceInputButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  async function runMockVoice() {
    const result = await transcribeVoice("高位下拉有人了");
    onTranscript(result.text);
  }

  return (
    <button className="rounded-md border border-[#d8e1d8] px-4 py-3 text-sm font-medium" onClick={runMockVoice}>
      语音输入
    </button>
  );
}

