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
    <div role="group" aria-label={label} className="inline-flex max-w-full flex-wrap items-center gap-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "crm-press min-h-11 whitespace-nowrap rounded-full border px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus lg:min-h-9",
              selected
                ? "border-line bg-nav-active font-semibold text-[var(--nav-active-ink)]"
                : "border-transparent font-medium text-text-secondary-strong hover:bg-nav-hover hover:text-text-primary",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
