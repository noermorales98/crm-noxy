import { cn } from "./cn";

type SkeletonProps = {
  shape: "rows" | "stats" | "board";
  count?: number;
  /** Texto para lectores de pantalla. */
  label?: string;
};

// Sin fondo ni radio en la base: cada uso los declara una sola vez (cn no fusiona utilidades).
const pulse = "motion-safe:animate-pulse";

export function Skeleton({ shape, count = 4, label = "Cargando" }: SkeletonProps) {
  const items = Array.from({ length: Math.max(1, count) }, (_, index) => index);
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {shape === "stats" && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-surface border border-line bg-border-subtle lg:grid-cols-4">
          {items.slice(0, 4).map((index) => (
            <div key={index} className="bg-surface-elevated px-5 py-4">
              <div className={cn(pulse, "h-3 w-24 rounded-control bg-surface-sidebar")} />
              <div className={cn(pulse, "mt-3 h-7 w-32 rounded-control bg-surface-sidebar")} />
            </div>
          ))}
        </div>
      )}
      {shape === "rows" && (
        <ul className="divide-y divide-line" aria-hidden="true">
          {items.map((index) => (
            <li key={index} className="flex min-h-14 items-center gap-3 px-4 py-2 sm:px-5">
              <div className={cn(pulse, "size-8 rounded-full bg-surface-sidebar")} />
              <div className="flex-1">
                <div className={cn(pulse, "h-3 w-2/5 rounded-control bg-surface-sidebar")} />
                <div className={cn(pulse, "mt-2 h-3 w-1/4 rounded-control bg-surface-sidebar")} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {shape === "board" && (
        <div className="flex gap-4 overflow-hidden" aria-hidden="true">
          {items.slice(0, 4).map((index) => (
            <div key={index} className="flex w-72 shrink-0 flex-col gap-2 rounded-surface bg-surface-sidebar p-3">
              <div className={cn(pulse, "h-3 w-20 rounded-control bg-surface-elevated")} />
              <div className="h-20 rounded-surface bg-surface-elevated" />
              <div className="h-20 rounded-surface bg-surface-elevated" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
