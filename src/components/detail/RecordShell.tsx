"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { useHeader } from "@/src/context/HeaderContext";
import { PageHeader, StatStrip, type StatItem } from "@/src/components/ui";

type QuickAction = { href: string; label: string; icon: typeof ArrowLeft01Icon; external?: boolean };

type RecordShellProps = {
  backHref: string;
  /** Ruta bajo el botón de volver, p. ej. «Contactos». */
  crumb: string;
  title: string;
  subtitle?: ReactNode;
  leading?: ReactNode;
  /** Chips de estado junto al título. */
  badges?: ReactNode;
  quickActions?: QuickAction[];
  stats?: StatItem[];
  main: ReactNode;
  side: ReactNode;
};

const QUICK =
  "inline-flex size-9 min-h-0! min-w-0! shrink-0 items-center justify-center rounded-full border border-transparent text-text-secondary outline-none transition-colors hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus";

/** Estructura común de una ficha de CRM: volver, identidad, cifras y dos columnas (contenido y propiedades). */
export function RecordShell({ backHref, crumb, title, subtitle, leading, badges, quickActions = [], stats, main, side }: RecordShellProps) {
  const { setConfig, resetState } = useHeader();
  useEffect(() => {
    resetState();
    setConfig({ title, pageHeader: true });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  return (
    <main className="crm-mobile-bottom-clearance flex-1 overflow-y-auto bg-surface-app">
      <div className="border-b border-line bg-surface-elevated">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-2 pt-4 sm:px-6">
          <Link href={backHref} aria-label={`Volver a ${crumb}`} className={QUICK}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </Link>
          <nav aria-label="Ruta" className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-text-secondary">
            <Link href={backHref} className="hover:text-text-primary">{crumb}</Link>
            <span aria-hidden="true">/</span>
            <span className="truncate">{title}</span>
          </nav>
          {quickActions.length > 0 && (
            <div className="flex items-center gap-1.5">
              {quickActions.map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className={QUICK}
                  title={action.label}
                  aria-label={action.label}
                  {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  <HugeiconsIcon icon={action.icon} size={16} />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="px-4 pb-4 pt-2 sm:px-6">
          <PageHeader title={title} subtitle={subtitle} leading={leading} actions={badges} />
        </div>
      </div>

      <div className="mx-auto grid max-w-[1200px] gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {stats && stats.length > 0 && <StatStrip items={stats} />}
          {main}
        </div>
        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">{side}</aside>
      </div>
    </main>
  );
}

/** Panel de propiedades: una fila por dato, etiqueta a la izquierda y valor a la derecha. */
export function PropertiesCard({ title = "Propiedades", rows }: { title?: string; rows: { label: string; value: ReactNode }[] }) {
  return (
    <section aria-label={title} className="rounded-surface border border-line bg-surface-elevated">
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text-primary">{title}</h2>
      <dl className="divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="flex min-h-11 items-center justify-between gap-3 px-4 py-1.5">
            <dt className="w-28 shrink-0 text-xs text-text-secondary">{row.label}</dt>
            <dd className="flex min-w-0 flex-1 items-center justify-end text-right text-sm text-text-primary">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
