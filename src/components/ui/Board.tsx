import type { ReactNode } from "react";
import { cn } from "./cn";

// El arrastre (contexto, zonas y elementos arrastrables) lo sigue gestionando la página.

type BoardProps = { children: ReactNode; label?: string };

export function Board({ children, label }: BoardProps) {
  return (
    <div
      role={label ? "region" : undefined}
      aria-label={label}
      className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:snap-none lg:px-0"
    >
      {children}
    </div>
  );
}

type BoardColumnProps = {
  title: string;
  /** Color guardado por el usuario para la etapa (dato): un punto junto al título. */
  accent?: string;
  /** Acción al pie de la columna (p. ej. «Agregar deal»), fuera de la zona de soltar. */
  footer?: ReactNode;
  /** Columna vacía: se muestra como una tira estrecha (sigue aceptando tarjetas) para no alargar el scroll horizontal. */
  collapsed?: boolean;
  children: ReactNode;
};

export function BoardColumn({ title, accent, footer, collapsed, children }: BoardColumnProps) {
  if (collapsed) {
    return (
      <section
        aria-label={`${title} (vacía)`}
        className="flex w-14 shrink-0 snap-start flex-col items-center overflow-hidden rounded-surface bg-surface-sidebar px-1 py-3"
      >
        {accent && <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />}
        <h2 className="mt-2 max-h-40 truncate text-sm font-semibold text-text-secondary [writing-mode:vertical-rl]" title={title}>{title}</h2>
        {/* La zona de soltar sigue montada: arrastrar una tarjeta aquí la mueve a la etapa. */}
        <div className="mt-2 flex min-h-24 w-full flex-1 flex-col">{children}</div>
        {footer && <div className="pt-2">{footer}</div>}
      </section>
    );
  }
  return (
    <section
      aria-label={title}
      className="flex w-[82%] shrink-0 snap-start flex-col rounded-surface bg-surface-sidebar p-3 sm:w-72 lg:w-auto lg:min-w-[240px] lg:flex-1 lg:basis-0"
    >
      <header className="flex items-baseline gap-2 px-1 pb-3">
        {accent && <span className="size-2.5 shrink-0 self-center rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />}
        <h2 className="min-w-0 truncate text-sm font-semibold text-text-primary">{title}</h2>
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
