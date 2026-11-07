"use client";

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
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full rounded-control bg-surface-sidebar p-0.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "crm-press min-h-11 whitespace-nowrap rounded-[8px] px-3 text-sm lg:min-h-10",
              selected ? "bg-surface-elevated font-semibold text-text-primary" : "font-medium text-text-secondary hover:text-text-primary",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
