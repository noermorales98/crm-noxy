"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiMagicIcon, ArrowLeft01Icon, Notion01Icon, NoteAddIcon, ReloadIcon } from "@hugeicons/core-free-icons";
import { Chip, type ChipTone } from "@/src/components/ui";
import { onAppointmentBusy, requestAppointmentAction, type AppointmentAction } from "@/src/lib/appointment-actions";

const STATUS_TONES: Record<string, ChipTone> = { CONFIRMED: "neutral", COMPLETED: "done", CANCELLED: "late" };
const STATUS_LABELS: Record<string, string> = { CONFIRMED: "Confirmada", COMPLETED: "Completada", CANCELLED: "Cancelada" };

const BASE =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50 motion-reduce:transition-none lg:min-h-9";
const PRIMARY = `${BASE} bg-action-primary text-action-primary-foreground hover:bg-action-secondary`;
const QUIET = `${BASE} text-text-secondary-strong hover:bg-nav-hover hover:text-text-primary`;

type Props = { title: string; status: string; subtitle: string };

/**
 * Barra de la cita: volver, título, estado y las acciones (nota, Notion, Granola, IA) con icono. Se queda arriba al desplazarse;
 * en móvil las acciones son solo iconos. Cada acción se la pide a su panel por el bus de acciones.
 */
export default function AppointmentNavbar({ title, status, subtitle }: Props) {
  const [busy, setBusy] = useState<Partial<Record<AppointmentAction, boolean>>>({});
  useEffect(() => onAppointmentBusy((action, value) => setBusy((b) => ({ ...b, [action]: value }))), []);

  const action = (key: AppointmentAction, label: string, icon: typeof NoteAddIcon, busyLabel: string, className: string) => (
    <button key={key} type="button" className={className} onClick={() => requestAppointmentAction(key)} disabled={Boolean(busy[key])} aria-label={busy[key] ? busyLabel : label} title={label}>
      <HugeiconsIcon icon={icon} size={16} aria-hidden="true" className={busy[key] ? "animate-spin motion-reduce:animate-none" : undefined} />
      <span className="max-sm:sr-only">{busy[key] ? busyLabel : label}</span>
    </button>
  );

  return (
    <header className="sticky top-0 z-10 -mx-4 border-b border-line bg-surface-app px-4 py-3 sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link href="/appointments" aria-label="Volver a las citas" className="flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary-strong outline-none hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus lg:size-9">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-text-primary">{title}</h1>
            <Chip tone={STATUS_TONES[status] ?? "neutral"}>{STATUS_LABELS[status] ?? status}</Chip>
          </div>
          <p className="truncate text-sm capitalize text-text-secondary">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action("write", "Nota", NoteAddIcon, "Nota", PRIMARY)}
          {action("notion", "Notion", Notion01Icon, "Notion", QUIET)}
          {action("sync", "Granola", ReloadIcon, "Sincronizando…", QUIET)}
          {action("generate", "Sugerir con IA", AiMagicIcon, "Leyendo…", QUIET)}
        </div>
      </div>
    </header>
  );
}
