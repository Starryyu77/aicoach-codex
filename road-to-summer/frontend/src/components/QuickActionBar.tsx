"use client";

export function QuickActionBar({ actions, onAction }: { actions: string[]; onAction: (action: string) => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button className="rounded-md bg-[#f4f7f2] px-3 py-2 text-sm hover:bg-[#e8f0e6]" key={action} onClick={() => onAction(action)}>
          {action}
        </button>
      ))}
    </div>
  );
}

