"use client";

export function CameraInputButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="rounded-md border border-[#d8e1d8] px-4 py-3 text-sm font-medium" onClick={onClick}>
      打开摄像头
    </button>
  );
}

