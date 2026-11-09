"use client";

import { cn } from "./cn";

type SwitchProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Nombre accesible del interruptor (el estado lo anuncia aria-checked). */
  label: string;
  disabled?: boolean;
};

/** Interruptor de activar/desactivar: pista fina, perilla blanca y un solo color de acento. */
export function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      data-check-ignore-tap
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 min-h-0! min-w-0! shrink-0 items-center rounded-full outline-none transition-colors duration-200",
        "before:absolute before:-inset-x-1 before:-inset-y-3 before:content-['']",
        "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated",
        "disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-action-primary" : "bg-nav-active",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none size-4 rounded-full bg-surface-elevated shadow-sm transition-transform duration-200",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
