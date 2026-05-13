"use client";

import { useRef, useState } from "react";
import { transcribeVoice } from "../lib/api";

export function VoiceInputButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setRecording] = useState(false);
  const [isTranscribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  async function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function startRecording() {
    setError("");
    setTranscript("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("当前浏览器不支持录音，可先使用文字输入。");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];
    const preferredTypes = ["audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/webm"];
    const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      setRecording(false);
      setTranscribing(true);
      try {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const audio = await blobToDataUrl(blob);
        const result = await transcribeVoice(audio, {
          fileName: "training-voice.webm",
          mimeType: blob.type || "audio/webm"
        });
        setTranscript(result.text);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setTranscribing(false);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  function confirmTranscript() {
    if (!transcript.trim()) return;
    onTranscript(transcript.trim());
    setTranscript("");
  }

  return (
    <div className="rounded-md border border-[#d8e1d8] p-3">
      <div className="flex items-center gap-2">
        <button
          className={isRecording ? "rounded-md bg-[#9b2f2f] px-4 py-2 text-sm font-medium text-white" : "rounded-md bg-[#1f7a5a] px-4 py-2 text-sm font-medium text-white"}
          onClick={isRecording ? stopRecording : startRecording}
          type="button"
        >
          {isRecording ? "停止录音" : "语音输入"}
        </button>
        {isTranscribing && <span className="text-xs text-[#536158]">转写中...</span>}
      </div>
      {transcript && (
        <div className="mt-3 rounded-md bg-[#f4f7f2] p-3">
          <div className="text-xs text-[#536158]">转写结果</div>
          <div className="mt-1 text-sm">{transcript}</div>
          <button className="mt-2 rounded-md bg-[#17201b] px-3 py-1.5 text-xs font-medium text-white" onClick={confirmTranscript} type="button">
            确认发送
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-[#9b2f2f]">{error}</p>}
    </div>
  );
}
