"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, Calendar02Icon } from "@hugeicons/core-free-icons";
import { cn } from "./cn";
import { MONTHS_LONG, WEEKDAYS_FROM_MONDAY, addDays, addMonths, buildMonthGrid, formatDateLabel, isIsoDate } from "./date-time-math";

type DateFieldProps = {
  /** «YYYY-MM-DD» o vacío. */
  value: string;
  onChange: (date: string) => void;
  /** Nombre accesible del campo. */
  label: string;
  placeholder?: string;
  disabled?: boolean;
};

const todayIso = () => new Date().toLocaleDateString("en-CA");

const NAV =
  "flex size-8 min-h-0! min-w-0! items-center justify-center rounded-full text-text-secondary outline-none transition-colors hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus";

/**
 * Selector de fecha propio. El calendario se despliega dentro del formulario (no flota), así que no lo recorta
 * ningún contenedor con scroll. Teclado: flechas mueven el día, Re Pág/Av Pág el mes, Intro elige, Esc cierra.
 */
export function DateField({ value, onChange, label, placeholder = "Elegir fecha", disabled = false }: DateFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const today = todayIso();
  const selected = isIsoDate(value) ? value : "";
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(selected || today);
  const [view, setView] = useState(() => {
    const [year, month] = (selected || today).split("-").map(Number);
    return { year, month: month - 1 };
  });

  // Cierra al hacer clic fuera.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // El foco sigue al día activo mientras el calendario está abierto.
  useEffect(() => {
    if (open) gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [open, focused, view]);

  const show = (date: string) => {
    const [year, month] = date.split("-").map(Number);
    setFocused(date);
    setView({ year, month: month - 1 });
  };
  const openCalendar = () => {
    show(selected || today);
    setOpen(true);
  };
  const choose = (date: string) => {
    onChange(date);
    setOpen(false);
  };
  const moveMonth = (delta: number) => {
    const next = addMonths(view.year, view.month, delta);
    setView(next);
    const day = Number(focused.slice(8, 10));
    const lastDay = new Date(Date.UTC(next.year, next.month + 1, 0)).getUTCDate();
    setFocused(`${next.year}-${String(next.month + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`);
  };

  const onGridKey = (event: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in step) {
      event.preventDefault();
      show(addDays(focused, step[event.key]));
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      moveMonth(event.key === "PageUp" ? -1 : 1);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      show(addDays(focused, event.key === "Home" ? -((new Date(`${focused}T12:00:00Z`).getUTCDay() + 6) % 7) : 6 - ((new Date(`${focused}T12:00:00Z`).getUTCDay() + 6) % 7)));
    } else if (event.key === "Escape") {
      // Cierra solo el calendario: que el Esc no llegue al diálogo que lo contiene.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      rootRef.current?.querySelector<HTMLButtonElement>("[data-trigger]")?.focus();
    }
  };

  const cells = buildMonthGrid(view.year, view.month);

  return (
    <div ref={rootRef} className="flex flex-col">
      <button
        type="button"
        data-trigger
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openCalendar())}
        aria-expanded={open}
        aria-label={selected ? `${label}: ${formatDateLabel(selected)}` : label}
        className={cn(
          "flex h-11 min-h-0! w-full items-center justify-between gap-2 rounded-control border bg-surface-elevated px-3 text-left text-sm font-normal outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50",
          open ? "border-focus" : "border-border-subtle hover:border-text-secondary/40",
        )}
      >
        <span className={cn("truncate", selected ? "text-text-primary" : "text-text-secondary")}>{selected ? formatDateLabel(selected) : placeholder}</span>
        <HugeiconsIcon icon={Calendar02Icon} size={16} className="shrink-0 text-text-secondary" />
      </button>

      {open && (
        <div role="dialog" aria-label={`Calendario: ${label}`} className="mt-2 rounded-surface border border-line bg-surface-elevated p-3" onKeyDown={onGridKey}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className={NAV} onClick={() => moveMonth(-1)} aria-label="Mes anterior">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            </button>
            <p aria-live="polite" className="text-sm font-semibold text-text-primary">
              {MONTHS_LONG[view.month]} {view.year}
            </p>
            <button type="button" className={NAV} onClick={() => moveMonth(1)} aria-label="Mes siguiente">
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-text-secondary" aria-hidden="true">
            {WEEKDAYS_FROM_MONDAY.map((day) => (
              <span key={day} className="py-1">{day}</span>
            ))}
          </div>
          <div ref={gridRef} role="grid" aria-label={`${MONTHS_LONG[view.month]} ${view.year}`} className="grid grid-cols-7 gap-y-0.5">
            {cells.map((cell) => {
              const isSelected = cell.date === selected;
              const isToday = cell.date === today;
              return (
                <button
                  key={cell.date}
                  type="button"
                  role="gridcell"
                  data-date={cell.date}
                  tabIndex={cell.date === focused ? 0 : -1}
                  aria-selected={isSelected}
                  aria-label={formatDateLabel(cell.date)}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => choose(cell.date)}
                  className={cn(
                    "mx-auto flex size-9 min-h-0! min-w-0! items-center justify-center rounded-full text-sm tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                    isSelected
                      ? "bg-action-primary font-semibold text-action-primary-foreground"
                      : cell.inMonth
                        ? "text-text-primary hover:bg-nav-hover"
                        : "text-text-secondary/50 hover:bg-nav-hover",
                    isToday && !isSelected && "font-semibold ring-1 ring-inset ring-text-secondary/40",
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-line pt-2">
            <button type="button" onClick={() => choose(today)} className="inline-flex h-8 min-h-0! items-center rounded-control px-2 text-xs font-semibold text-text-primary hover:bg-nav-hover">
              Hoy
            </button>
            <button type="button" onClick={() => setOpen(false)} className="inline-flex h-8 min-h-0! items-center rounded-control px-2 text-xs font-medium text-text-secondary hover:bg-nav-hover">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
