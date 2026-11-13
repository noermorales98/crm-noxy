"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon } from "@hugeicons/core-free-icons";
import { cn } from "./cn";
import { formatTimeLabel, parseTimeInput, timeSlots } from "./date-time-math";

type TimeFieldProps = {
  /** «HH:mm» o vacío. */
  value: string;
  onChange: (time: string) => void;
  /** Nombre accesible del campo. */
  label: string;
  placeholder?: string;
  /** Paso de la lista, en minutos (15 por defecto). */
  stepMinutes?: number;
  disabled?: boolean;
};

const SLOT =
  "flex h-8 min-h-0! min-w-0! items-center justify-center rounded-control text-xs tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus";

/**
 * Selector de hora propio. Se despliega dentro del formulario: una lista de horas en pasos de 15 minutos
 * y un campo para escribir una hora exacta («930», «3 pm», «15:45»). Esc cierra solo el selector.
 */
export function TimeField({ value, onChange, label, placeholder = "Elegir hora", stepMinutes = 15, disabled = false }: TimeFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [invalid, setInvalid] = useState(false);
  const slots = timeSlots(stepMinutes);
  const shown = formatTimeLabel(value);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Al abrir, la hora elegida (o las 9:00 si no hay) queda a la vista dentro de la lista, sin mover la página.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const target = list?.querySelector<HTMLElement>(`[data-time="${value || "09:00"}"]`) ?? list?.querySelector<HTMLElement>("[data-time]");
    if (list && target) list.scrollTop = target.offsetTop - list.clientHeight / 2 + target.clientHeight / 2;
  }, [open, value]);

  const choose = (time: string) => {
    onChange(time);
    setOpen(false);
  };
  const applyTyped = () => {
    const parsed = parseTimeInput(typed);
    if (!parsed) return setInvalid(true);
    setInvalid(false);
    setTyped("");
    choose(parsed);
  };

  return (
    <div
      ref={rootRef}
      className="flex flex-col"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>("[data-trigger]")?.focus();
      }}
    >
      <button
        type="button"
        data-trigger
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={shown ? `${label}: ${shown}` : label}
        className={cn(
          "flex h-11 min-h-0! w-full items-center justify-between gap-2 rounded-control border bg-surface-elevated px-3 text-left text-sm font-normal tabular-nums outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50",
          open ? "border-focus" : "border-border-subtle hover:border-text-secondary/40",
        )}
      >
        <span className={cn("truncate", shown ? "text-text-primary" : "text-text-secondary")}>{shown || placeholder}</span>
        <HugeiconsIcon icon={Clock01Icon} size={16} className="shrink-0 text-text-secondary" />
      </button>

      {open && (
        <div role="dialog" aria-label={`Hora: ${label}`} className="mt-2 rounded-surface border border-line bg-surface-elevated p-3">
          <label className="mb-2 flex flex-col gap-1 text-xs text-text-secondary">
            Escribir una hora
            <input
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value);
                setInvalid(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyTyped();
                }
              }}
              placeholder="10:30, 930 o 3 pm"
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? "time-field-error" : undefined}
              className={cn(
                "h-9 min-h-0! w-full rounded-control border bg-surface-elevated px-3 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-focus",
                invalid ? "border-danger" : "border-border-subtle",
              )}
            />
            {invalid && <span id="time-field-error" role="alert" className="text-danger">No entendí esa hora. Prueba con 10:30 o 3 pm.</span>}
          </label>
          <div ref={listRef} className="relative grid max-h-44 grid-cols-3 gap-1 overflow-y-auto pr-1" role="listbox" aria-label="Horas del día">
            {slots.map((time) => {
              const isSelected = time === value;
              return (
                <button
                  key={time}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-time={time}
                  onClick={() => choose(time)}
                  className={cn(SLOT, isSelected ? "bg-action-primary font-semibold text-action-primary-foreground" : "text-text-primary hover:bg-nav-hover")}
                >
                  {formatTimeLabel(time).replace(" a. m.", " am").replace(" p. m.", " pm")}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-end border-t border-line pt-2">
            <button type="button" onClick={() => setOpen(false)} className="inline-flex h-8 min-h-0! items-center rounded-control px-2 text-xs font-medium text-text-secondary hover:bg-nav-hover">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
