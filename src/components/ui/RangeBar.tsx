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
  /** Texto que lee un lector de pantalla, p. ej. «50 por ciento». */
  valueText?: string;
  disabled?: boolean;
};

/**
 * Medidor por tramos (no el rango del navegador): una fila de segmentos finos que se llenan hasta el valor.
 * Sin perilla ni pista: tocar o arrastrar sobre un tramo fija el valor; al pasar el cursor se ve el valor que se fijaría.
 * Puntero, táctil y teclado (flechas, Re Pág/Av Pág, Inicio, Fin).
 */
export function RangeBar({ value, onChange, label, min = 0, max = 100, step = 10, valueText, disabled = false }: RangeBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const segments = Math.max(1, Math.round((max - min) / step));
  const shown = hover ?? value;
  const filled = Math.round(((shown - min) / (max - min)) * segments);
  const committed = Math.round(((value - min) / (max - min)) * segments);

  const valueAt = (clientX: number): number | null => {
    const rect = trackRef.current?.getBoundingClientRect();
    return rect ? valueFromPosition(clientX, rect, min, max, step) : null;
  };
  const commit = (clientX: number) => {
    const next = valueAt(clientX);
    if (next !== null && next !== value) onChange(next);
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
        commit(event.clientX);
      }}
      onPointerMove={(event) => {
        if (disabled) return;
        if (dragging) commit(event.clientX);
        else setHover(valueAt(event.clientX));
      }}
      onPointerLeave={() => setHover(null)}
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
        "group/range flex h-6 w-full touch-none select-none items-center rounded-control outline-none focus-visible:ring-2 focus-visible:ring-focus",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      <div ref={trackRef} className="flex h-2 w-full gap-[3px]" aria-hidden="true">
        {Array.from({ length: segments }, (_, index) => {
          const isFilled = index < filled;
          const isPreview = hover !== null && !dragging && isFilled && index >= committed;
          return (
            <span
              key={index}
              className={cn(
                "h-full flex-1 rounded-full transition-colors duration-150",
                isFilled ? (isPreview ? "bg-action-primary/35" : "bg-action-primary") : "bg-nav-active",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
