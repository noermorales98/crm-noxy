import type { ReactNode } from "react";
import { cn } from "./cn";

// El arrastre (contexto, zonas y elementos arrastrables) lo sigue gestionando la página.

type BoardProps = { children: ReactNode; label?: string };

export function Board({ children, label }: BoardProps) {
  return (
    <div
      role={label ? "region" : undefined}
      aria-label={label}
      className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:snap-none lg:auto-cols-[minmax(240px,1fr)] lg:grid-flow-col lg:px-0"
    >
      {children}
    </div>
  );
}

type BoardColumnProps = {
  title: string;
  count: number;
  sum?: string;
  /** Color guardado por el usuario para la etapa (dato): un punto junto al título. */
  accent?: string;
  /** Acción al pie de la columna (p. ej. «Agregar deal»), fuera de la zona de soltar. */
  footer?: ReactNode;
  children: ReactNode;
};

export function BoardColumn({ title, count, sum, accent, footer, children }: BoardColumnProps) {
  return (
    <section
      aria-label={title}
      className="flex w-[82%] shrink-0 snap-start flex-col rounded-surface bg-surface-sidebar p-3 sm:w-72 lg:w-auto"
    >
      <header className="flex items-baseline gap-2 px-1 pb-3">
        {accent && <span className="size-2.5 shrink-0 self-center rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />}
        <h2 className="min-w-0 truncate text-sm font-semibold text-text-primary">{title}</h2>
        <span className="text-xs tabular-nums text-text-secondary">{count}</span>
        {sum && <span className="ml-auto text-sm font-semibold tabular-nums text-text-primary">{sum}</span>}
      </header>
      {/* La página coloca aquí su zona de soltar; debe llevar su propio `min-h-24` para que una
          columna vacía siga aceptando tarjetas. */}
      <div className="flex min-h-24 flex-1 flex-col gap-2">{children}</div>
      {footer && <div className="pt-2">{footer}</div>}
    </section>
  );
}

type BoardCardProps = {
  children: ReactNode;
  /** La tarjeta en arrastre es la única superficie de contenido con sombra (overlay). */
  dragging?: boolean;
};

export function BoardCard({ children, dragging }: BoardCardProps) {
  return (
    <article
      className={cn(
        "crm-lift rounded-surface border border-line bg-surface-elevated p-3 hover:border-text-secondary/40",
        dragging && "shadow-[0_8px_8px_rgba(11,11,24,0.10)]",
      )}
    >
      {children}
    </article>
  );
}
