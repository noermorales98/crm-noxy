"use client";

import Link from "next/link";
import { useId, useRef, useState, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useDialog } from "@/src/components/ui/useDialog";

export type DetailField = { label: string; value: string | null | undefined };

/** Lo que se muestra al hacer clic en una fila del widget: un título y pares «dato: valor». */
export type RowDetail = {
  title: string;
  subtitle?: string;
  fields: DetailField[];
  /** Pantalla del CRM donde se trabaja este elemento. */
  href?: string;
  hrefLabel?: string;
  /** Enlace fuera del CRM (p. ej. el evento en Google Calendar). */
  external?: { href: string; label: string };
};

function DetailDialog({ detail, onClose }: { detail: RowDetail; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(ref, true, onClose);
  const fields = detail.fields.filter((f) => f.value && String(f.value).trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-surface-elevated">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h3 id={titleId} className="text-base font-bold text-text-primary">{detail.title}</h3>
            {detail.subtitle && <p className="mt-0.5 text-sm text-text-secondary">{detail.subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar detalle" className="flex size-8 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover hover:text-text-primary">
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>
        {fields.length > 0 && (
          <dl className="flex flex-col gap-3 px-5 py-4">
            {fields.map((f) => (
              <div key={f.label}>
                <dt className="text-xs font-semibold text-text-secondary">{f.label}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-text-primary">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {(detail.href || detail.external) && (
          <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
            {detail.href && (
              <Link href={detail.href} className="inline-flex min-h-10 items-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary">
                {detail.hrefLabel ?? "Abrir"}
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </Link>
            )}
            {detail.external && (
              <a href={detail.external.href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-control border border-line px-4 text-sm font-semibold text-text-primary hover:bg-surface-sidebar">
                {detail.external.label}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Envuelve una fila para que, al hacer clic (o con Enter), abra su detalle en un diálogo. */
export function DetailTrigger({ detail, children }: { detail: RowDetail; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-control px-2 py-1 text-left outline-none hover:bg-nav-hover focus-visible:ring-2 focus-visible:ring-focus"
      >
        {children}
      </button>
      {open && <DetailDialog detail={detail} onClose={() => setOpen(false)} />}
    </>
  );
}
