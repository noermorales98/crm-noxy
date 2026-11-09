"use client";

import PageControls, { BackLink, useHasPageControls } from "@/src/components/PageControls";
import { useHeader } from "@/src/context/HeaderContext";

/**
 * Fila de página para las pantallas sin PageHeader (editores, calendarios, detalle): su título, el
 * botón de volver y los controles declarados. No es una barra global: vive dentro de la hoja, en la
 * parte alta del contenido. Si la pantalla pinta PageHeader (`pageHeader: true`), no aparece: PageHeader
 * lleva los mismos controles y el único h1.
 */
export default function PageBar() {
  const { config } = useHeader();
  const hasControls = useHasPageControls();
  if (config.pageHeader) return null;
  const hasTitle = Boolean(config.title) || config.title === 0;
  if (!hasTitle && !config.backHref && !hasControls) return null;
  const badge = config.titleBadge || config.titleBadge === 0 ? config.titleBadge : null;
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-2 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <BackLink />
        {typeof config.title === "string" ? (
          <h1 className="truncate text-base font-semibold text-text-primary sm:text-lg">{config.title}</h1>
        ) : config.title ? (
          <div className="flex min-w-0 items-center">{config.title}</div>
        ) : null}
        {badge !== null && (
          <span className="shrink-0 rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-semibold tabular-nums text-text-secondary">{badge}</span>
        )}
      </div>
      <PageControls />
    </div>
  );
}
