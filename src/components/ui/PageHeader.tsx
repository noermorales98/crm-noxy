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

export function PageHeader({ title, subtitle, actions, leading }: PageHeaderProps) {
  const header = useOptionalHeader();
  const badge = header?.config.titleBadge;
  const hasBadge = badge || badge === 0;
  const hasControls = Boolean(
    header?.config.sortOptions?.length || header?.config.filterGroups?.length || header?.config.addButton || header?.config.actions?.length,
  );
  return (
    <header className="flex flex-wrap items-end gap-x-6 gap-y-3 pb-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {header?.config.backHref && <BackLink />}
        {leading}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="min-w-0 truncate text-2xl font-semibold leading-tight tracking-[-0.02em] text-text-primary">{title}</h1>
            {hasBadge && (
              <span className="shrink-0 rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-semibold tabular-nums text-text-secondary">{badge}</span>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p>}
        </div>
      </div>
      {(actions || hasControls) && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto [&>*]:flex-none">
          {header ? <Controls actions={actions} /> : actions}
        </div>
      )}
    </header>
  );
}
