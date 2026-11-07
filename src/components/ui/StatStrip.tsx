import type { ReactNode } from "react";
import { Chip } from "./Chip";
import { cn } from "./cn";

export type StatItem = {
  label: string;
  value: ReactNode;
  delta?: string;
  tone?: "up" | "down";
  /** Aviso urgente junto a la cifra (Lima). */
  flag?: string;
};

type StatStripProps = { items: StatItem[] };

export function StatStrip({ items }: StatStripProps) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-surface border border-line bg-surface-elevated lg:grid-cols-4">
      {items.map(({ label, value, delta, tone, flag }, index) => (
        <div
          key={`${index}-${label}`}
          className={cn(
            "min-w-0 border-line px-4 py-4 sm:px-5",
            // Rejilla de 2 columnas (< lg) y de 4 (lg): divisores entre celdas para cualquier número de cifras.
            index % 2 === 1 && "border-l",
            index >= 2 && "border-t",
            index % 4 === 0 ? "lg:border-l-0" : "lg:border-l",
            index < 4 && "lg:border-t-0",
          )}
        >
          <dt className="truncate text-xs font-semibold text-text-secondary">{label}</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xl font-semibold leading-tight tracking-[-0.02em] tabular-nums text-text-primary sm:text-2xl lg:text-[28px]">
            <span className="min-w-0 truncate">{value}</span>
            {delta && (
              <span
                className={cn(
                  "text-xs font-semibold tracking-normal",
                  tone === "down" ? "text-danger" : tone === "up" ? "text-success" : "text-text-secondary",
                )}
              >
                {delta}
              </span>
            )}
            {flag && <Chip tone="hot">{flag}</Chip>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
