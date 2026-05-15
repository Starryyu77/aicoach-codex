"use client";

import { useRef, useState } from "react";
import { transcribeVoice } from "../../lib/api";

type VoiceState = "idle" | "recording" | "transcribing" | "error";

type PhoneVoiceButtonProps = {
  disabled?: boolean;
  onTranscript: (text: string) => void;
};

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function PhoneVoiceButton({ disabled, onTranscript }: PhoneVoiceButtonProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [message, setMessage] = useState("");

  async function startRecording() {
    if (disabled || voiceState === "transcribing") return;
    setMessage("");

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceState("error");
      setMessage("当前浏览器不支持录音。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const preferredTypes = ["audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        setVoiceState("transcribing");
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const audio = await blobToDataUrl(blob);
          const result = await transcribeVoice(audio, {
            fileName: "phone-training-voice.webm",
            mimeType: blob.type || "audio/webm"
          });
          onTranscript(result.text);
          setMessage(result.text ? "已转成文字" : "没有识别到文字");
          setVoiceState("idle");
        } catch (caught) {
          setVoiceState("error");
          setMessage(caught instanceof Error ? caught.message : String(caught));
        } finally {
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          recorderRef.current = null;
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setVoiceState("recording");
      setMessage("录音中");
    } catch (caught) {
      setVoiceState("error");
      setMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function stopRecording() {
    if (voiceState !== "recording") return;
    recorderRef.current?.stop();
  }

  const isRecording = voiceState === "recording";
  const isTranscribing = voiceState === "transcribing";
  const label = isRecording ? "停止录音" : isTranscribing ? "转写中" : "语音转文字";

  return (
    <div className="rts-phone-voice">
      <button
        className={[
          "rts-phone-voice-button",
          isRecording ? "rts-phone-voice-button--recording" : "",
          isTranscribing ? "rts-phone-voice-button--transcribing" : ""
        ].filter(Boolean).join(" ")}
        type="button"
        aria-label={label}
        disabled={disabled || isTranscribing}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? "停" : isTranscribing ? "..." : "语"}
      </button>
      {message ? <span className={voiceState === "error" ? "rts-phone-voice-status rts-phone-voice-status--error" : "rts-phone-voice-status"}>{message}</span> : null}
    </div>
  );
}
