"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { cn } from "./cn";

export type ActionMenuItem = {
  key: string;
  label: string;
  icon?: typeof MoreHorizontalIcon;
  onSelect: () => void;
  /** Acción destructiva: va en rojo y separada del resto. */
  tone?: "danger";
  disabled?: boolean;
};

type ActionMenuProps = {
  /** Nombre accesible del botón, p. ej. «Acciones de la cita». */
  label: string;
  items: ActionMenuItem[];
};

/**
 * Menú de acciones de una fila: un solo botón «⋯» que despliega las acciones. Las destructivas van al final,
 * separadas y en rojo, para no tocarlas por error. Flechas, Inicio/Fin, Esc y clic fuera funcionan como en un menú nativo.
 */
export function ActionMenu({ label, items }: ActionMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [upward, setUpward] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Al abrir, el foco entra en la primera acción disponible.
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [open]);

  const toggle = () => {
    if (!open) {
      const rect = rootRef.current?.getBoundingClientRect();
      // Si abajo no cabe el menú (≈ 44 px por acción), se abre hacia arriba.
      setUpward(rect ? window.innerHeight - rect.bottom < items.length * 44 + 24 : false);
    }
    setOpen((value) => !value);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const enabled = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])];
    const index = enabled.findIndex((element) => element === document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      enabled[(index + 1) % enabled.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      enabled[(index - 1 + enabled.length) % enabled.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      enabled[event.key === "Home" ? 0 : enabled.length - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      rootRef.current?.querySelector<HTMLButtonElement>("[data-trigger]")?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const firstDanger = items.findIndex((item) => item.tone === "danger");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-trigger
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={cn(
          "flex size-9 min-h-0! min-w-0! items-center justify-center rounded-full text-text-secondary outline-none transition-colors",
          "hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus",
          open && "bg-nav-hover text-text-primary",
        )}
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} size={18} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          className={cn(
            "crm-floating-menu absolute right-0 z-30 w-52 rounded-surface border border-line bg-surface-elevated p-1",
            upward ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {items.map((item, index) => (
            <div key={item.key}>
              {index === firstDanger && index > 0 && <div role="separator" className="my-1 border-t border-line" />}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex h-9 min-h-0! w-full min-w-0! items-center gap-2.5 rounded-control px-2.5 text-left text-sm outline-none transition-colors disabled:opacity-40",
                  item.tone === "danger"
                    ? "text-danger hover:bg-danger-soft focus-visible:bg-danger-soft"
                    : "text-text-primary hover:bg-nav-hover focus-visible:bg-nav-hover",
                )}
              >
                {item.icon && <HugeiconsIcon icon={item.icon} size={16} className="shrink-0" />}
                <span className="truncate">{item.label}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
