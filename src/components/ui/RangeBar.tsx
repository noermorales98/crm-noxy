"use client";

import { useRef, useState } from "react";
import { cn } from "./cn";
import { keyboardValue, valueFromPosition } from "./range-math";

type RangeBarProps = {
  value: number;
  onChange: (next: number) => void;
  /** Nombre accesible; el valor lo anuncia aria-valuenow. */
  label: string;
  min?: number;
  max?: number;
  step?: number;
  /** Texto que lee un lector de pantalla, p. ej. «50 %». */
  valueText?: string;
  disabled?: boolean;
};

/**
 * Control de rango propio (no el del navegador): pista fina, relleno en el color de acción y una perilla
 * que solo crece al pasar, enfocar o arrastrar. Puntero, táctil y teclado (flechas, Re Pág/Av Pág, Inicio, Fin).
 */
export function RangeBar({ value, onChange, label, min = 0, max = 100, step = 5, valueText, disabled = false }: RangeBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;

  const moveTo = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = valueFromPosition(clientX, rect, min, max, step);
    if (next !== value) onChange(next);
  };

  return (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      aria-disabled={disabled || undefined}
      onPointerDown={(event) => {
        if (disabled) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        moveTo(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragging) moveTo(event.clientX);
      }}
      onPointerUp={(event) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
        setDragging(false);
      }}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(event) => {
        if (disabled) return;
        const next = keyboardValue(event.key, value, min, max, step);
        if (next === null) return;
        event.preventDefault();
        if (next !== value) onChange(next);
      }}
      className={cn(
        "group/range relative h-6 w-full touch-none select-none px-[7px] outline-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      {/* La pista deja media perilla a cada lado para que no se salga en 0 % y 100 %. */}
      <div ref={trackRef} className="relative h-full">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-nav-active">
          <div className="h-full rounded-full bg-action-primary" style={{ width: `${percent}%` }} />
        </div>
        <span
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 size-3.5 rounded-full border-2 border-action-primary bg-surface-elevated shadow-sm transition-transform duration-150",
          "-translate-x-1/2 -translate-y-1/2 scale-75 group-hover/range:scale-100 group-focus-visible/range:scale-100 group-focus-visible/range:ring-2 group-focus-visible/range:ring-focus group-focus-visible/range:ring-offset-2 group-focus-visible/range:ring-offset-surface-elevated",
          dragging && "scale-110",
        )}
          style={{ left: `${percent}%` }}
        />
      </div>
    </div>
  );
}
