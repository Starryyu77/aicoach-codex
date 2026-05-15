"use client";

type PhoneQuickMenuProps = {
  actions: string[];
  onAction: (action: string) => void;
};

export function PhoneQuickMenu({ actions, onAction }: PhoneQuickMenuProps) {
  if (!actions.length) return null;

  return (
    <div className="rts-phone-quick-menu" role="menu" aria-label="快捷操作">
      {actions.map((action, index) => (
        <button key={`${action}-${index}`} role="menuitem" type="button" onClick={() => onAction(action)}>
          {action}
        </button>
      ))}
    </div>
  );
}
