"use client";

export function CameraInputButton({ disabled = false, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <button
      className="rounded-md border border-[#d8e1d8] px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
    >
      打开摄像头
    </button>
  );
}
