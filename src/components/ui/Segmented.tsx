"use client";

import { useEffect, useRef } from "react";
import { cn } from "./cn";

type SegmentedOption = { value: string; label: string };

type SegmentedProps = {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  /** Nombre accesible del grupo. */
  label: string;
};

export function Segmented({ options, value, onChange, label }: SegmentedProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  // En móvil la fila se desplaza: la opción elegida se acerca al centro para que no quede fuera de vista.
  useEffect(() => {
    const root = rootRef.current;
    const selected = root?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!root || !selected || root.scrollWidth <= root.clientWidth) return;
    root.scrollTo({ left: selected.offsetLeft - (root.clientWidth - selected.offsetWidth) / 2, behavior: "smooth" });
  }, [value]);
  return (
    // En móvil: etiquetas en una sola fila que se desliza con el dedo, sin barra visible; el borde derecho se difumina
    // y deja asomar la siguiente opción, así se entiende que hay más.
    <div
      ref={rootRef}
      role="group"
      aria-label={label}
      className="inline-flex max-w-full items-center gap-1.5 max-sm:flex max-sm:w-full max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pr-8 max-sm:[-ms-overflow-style:none] max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)] max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden sm:flex-wrap sm:gap-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "crm-press min-h-11 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm sm:px-4 outline-none focus-visible:ring-2 focus-visible:ring-focus lg:min-h-9",
              selected
                ? "border-line bg-nav-active font-semibold text-[var(--nav-active-ink)]"
                : "border-transparent font-medium text-text-secondary-strong hover:bg-nav-hover hover:text-text-primary max-sm:border-line max-sm:bg-surface-elevated",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
