"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useDialog } from "@/src/components/ui";
import { input as inputCls } from "@/src/lib/crm-ui";

type Candidate = {
  id: string;
  title: string | null;
  startTime: string;
  endTime: string;
  status: string;
  guestName: string;
  contactId: string | null;
  dealId: string | null;
  appointmentType: { name: string; color: string } | null;
  deal: { id: string; title: string } | null;
  contact: { firstName: string; lastName: string | null } | null;
};

const when = (value: string) =>
  new Date(value).toLocaleString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Vincula una cita que ya existe a un lead o a un contacto (`target`). La cita no se duplica ni se borra. */
export function LinkAppointmentDialog({
  open,
  onClose,
  target,
  onLinked,
}: {
  open: boolean;
  onClose: () => void;
  target: { kind: "deal" | "contact"; id: string };
  /** Recibe la cita ya actualizada que devuelve la API. */
  onLinked: (appointment: any) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, open, onClose);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setError(null);
    setCandidates(null);
    let cancelled = false;
    fetch("/api/appointments")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("No se pudieron cargar las citas"))))
      .then((all: Candidate[]) => {
        if (cancelled) return;
        const already = (a: Candidate) => (target.kind === "deal" ? a.dealId === target.id : a.contactId === target.id);
        // Las más recientes primero; las canceladas no se ofrecen.
        setCandidates(all.filter((a) => !already(a) && a.status !== "CANCELLED").sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime)));
      })
      .catch((err) => {
        if (cancelled) return;
        setCandidates([]);
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [open, target.kind, target.id]);

  if (!open) return null;

  const link = async (appointment: Candidate) => {
    setBusy(appointment.id);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target.kind === "deal" ? { dealId: target.id } : { contactId: target.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo vincular");
      onLinked(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo vincular");
    } finally {
      setBusy(null);
    }
  };

  const needle = query.trim().toLowerCase();
  const shown = (candidates ?? []).filter(
    (a) => !needle || `${a.title ?? ""} ${a.appointmentType?.name ?? ""} ${a.guestName} ${a.deal?.title ?? ""}`.toLowerCase().includes(needle),
  );
  const noun = target.kind === "deal" ? "este lead" : "este contacto";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-obsidian/35 p-4 sm:items-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-appointment-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-surface border border-line bg-surface-elevated shadow-md"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 id="link-appointment-title" className="text-base font-semibold text-text-primary">Vincular cita</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex size-9 min-h-0! min-w-0! items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover">
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>
        <div className="p-4">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, persona o lead" className={inputCls} autoFocus />
        </div>
        {error && <p role="alert" className="mx-4 mb-2 text-sm text-danger">{error}</p>}
        <ul aria-label="Citas disponibles" className="min-h-0 flex-1 divide-y divide-line overflow-y-auto border-t border-line">
          {candidates === null ? (
            <li className="px-5 py-6 text-sm text-text-secondary">Cargando citas…</li>
          ) : shown.length === 0 ? (
            <li className="px-5 py-6 text-sm text-text-secondary">No hay citas para vincular.</li>
          ) : (
            shown.map((appointment) => (
              <li key={appointment.id}>
                <button type="button" disabled={busy === appointment.id} onClick={() => link(appointment)} className="flex min-h-14 w-full items-center gap-3 px-5 py-3 text-left hover:bg-nav-hover disabled:opacity-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text-primary">{appointment.title?.trim() || appointment.appointmentType?.name || "Cita"}</span>
                    <span className="block truncate text-xs text-text-secondary">
                      {when(appointment.startTime)} · {appointment.guestName}
                    </span>
                    {appointment.deal && <span className="block truncate text-xs text-text-secondary">Hoy en el lead: {appointment.deal.title}</span>}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="border-t border-line px-5 py-3 text-xs text-text-secondary">La cita se vincula a {noun}; no se duplica ni se borra.</p>
      </div>
    </div>
  );
}
