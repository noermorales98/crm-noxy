"use client";

import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { cn } from "./cn";

type CheckRowProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
};

/** Fila con casilla (permisos, listas de opciones): casilla propia, sin borde, resalta al pasar y al marcar. */
export function CheckRow({ checked, onChange, label, description, disabled = false }: CheckRowProps) {
  return (
    <label
      data-check-ignore-tap
      className={cn(
        "group flex min-h-11 cursor-pointer items-start gap-3 rounded-control px-3 py-2.5 transition-colors hover:bg-nav-hover",
        checked && "bg-nav-hover/60",
        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only min-h-0! min-w-0!"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-focus peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-elevated",
          checked ? "border-action-primary bg-action-primary text-action-primary-foreground" : "border-text-secondary/40 bg-surface-elevated",
        )}
      >
        {checked && <HugeiconsIcon icon={Tick02Icon} size={11} strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text-primary">{label}</span>
        {description && <span className="block text-xs text-text-secondary">{description}</span>}
      </span>
    </label>
  );
}
