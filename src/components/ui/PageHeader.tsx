"use client";

import type { ReactNode } from "react";
import PageControls, { BackLink } from "@/src/components/PageControls";
import { useOptionalHeader } from "@/src/context/HeaderContext";

type PageHeaderProps = {
  title: string;
  /** Línea de contexto: dónde está la persona y las cifras clave. */
  subtitle?: ReactNode;
  /** Como máximo una acción primaria; el resto, secundarias. */
  actions?: ReactNode;
  /** Elemento a la izquierda del título (p. ej. el avatar del Inicio). */
  leading?: ReactNode;
  /** Sin separación inferior en móvil (los dos dashboards); desde `sm` es igual que siempre. */
  denseOnMobile?: boolean;
};

/** Cuerpo del encabezado: lleva también volver, insignia y controles que la pantalla declara en HeaderContext. */
function Controls({ actions }: { actions?: ReactNode }) {
  return (
    <>
      <PageControls />
      {actions}
    </>
  );
}

export function PageHeader({ title, subtitle, actions, leading, denseOnMobile = false }: PageHeaderProps) {
  const header = useOptionalHeader();
  const badge = header?.config.titleBadge;
  const hasBadge = badge || badge === 0;
  const hasControls = Boolean(
    header?.config.sortOptions?.length || header?.config.filterGroups?.length || header?.config.addButton || header?.config.actions?.length,
  );
  return (
    // En móvil el título y los botones comparten fila (los botones a la derecha); solo bajan si no caben.
    <header className={`flex flex-wrap items-center gap-x-3 sm:items-end sm:gap-x-6 sm:gap-y-3 sm:pb-5 ${denseOnMobile ? "gap-y-0 pb-0" : "gap-y-2 pb-3"}`}>
      <div className="flex min-w-[9rem] flex-1 items-center gap-3">
        {header?.config.backHref && <BackLink />}
        {leading}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="min-w-0 truncate text-xl font-semibold sm:text-2xl leading-tight tracking-[-0.02em] text-text-primary">{title}</h1>
            {hasBadge && (
              <span className="shrink-0 rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-semibold tabular-nums text-text-secondary">{badge}</span>
            )}
          </div>
          {subtitle && <p className="mt-0.5 truncate text-sm text-text-secondary sm:whitespace-normal">{subtitle}</p>}
        </div>
      </div>
      {(actions || hasControls) && (
        <div className="crm-header-actions flex shrink-0 items-center gap-1.5 sm:flex-wrap sm:gap-2 [&>*]:flex-none">
          {header ? <Controls actions={actions} /> : actions}
        </div>
      )}
    </header>
  );
}
