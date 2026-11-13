"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { DateField, TimeField, useDialog } from "@/src/components/ui";
import { useToast } from "@/src/context/ToastContext";
import { input as inputCls } from "@/src/lib/crm-ui";
import { utcToZonedParts } from "@/src/lib/manual-appointment";

export type AppointmentPrefill = {
  contactId?: string | null;
  dealId?: string | null;
  clientId?: string | null;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
};

export type CreatedAppointment = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  notes: string | null;
  title: string | null;
  appointmentType: { id: string; name: string; duration: number; color: string } | null;
  overlaps?: number;
};

export type EditableAppointment = {
  id: string;
  title: string | null;
  startTime: string;
  endTime: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  notes: string | null;
  appointmentType: { id: string } | null;
};

type AppointmentType = { id: string; name: string; duration: number; isActive: boolean };

// La hora se escribe y se lee en la zona del navegador: la misma en que la lista muestra las citas.
const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const LABEL = "flex flex-col gap-1.5 text-sm font-semibold text-text-primary";
// Fecha local de hoy (YYYY-MM-DD), no la de UTC.
const today = () => new Date().toLocaleDateString("en-CA");

/** Cita creada a mano, sin pasar por la disponibilidad. Se puede ligar a un contacto, un lead o un cliente. */
export function ManualAppointmentDialog({
  open,
  onClose,
  onCreated,
  prefill = {},
  appointment = null,
}: {
  open: boolean;
  onClose: () => void;
  /** Se llama al crear o al guardar los cambios de una cita. */
  onCreated: (appointment: CreatedAppointment) => void;
  prefill?: AppointmentPrefill;
  /** Si se da, el diálogo edita o reprograma esa cita en lugar de crear una. */
  appointment?: EditableAppointment | null;
}) {
  const editing = appointment !== null;
  const { addToast } = useToast();
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, open, onClose);
  const [types, setTypes] = useState<AppointmentType[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ typeId: "", title: "", date: today(), time: "10:00", duration: "", name: "", email: "", phone: "", notes: "" });

  // Al abrir: los datos de quien viene del contacto, lead o cliente, y los tipos de cita activos.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    if (appointment) {
      const start = new Date(appointment.startTime);
      const { date, time } = utcToZonedParts(start, browserTimezone());
      const minutes = Math.round((new Date(appointment.endTime).getTime() - start.getTime()) / 60000);
      setForm({
        typeId: appointment.appointmentType?.id ?? "",
        title: appointment.title ?? "",
        date,
        time,
        duration: String(minutes),
        // En una cita sin persona el título hacía de nombre: no se repite en el campo.
        name: appointment.guestName === appointment.title ? "" : appointment.guestName,
        email: appointment.guestEmail,
        phone: appointment.guestPhone ?? "",
        notes: appointment.notes ?? "",
      });
    } else {
      setForm((current) => ({
        ...current,
        date: today(),
        time: "10:00",
        notes: "",
        title: "",
        typeId: "",
        duration: "",
        name: prefill.guestName ?? "",
        email: prefill.guestEmail ?? "",
        phone: prefill.guestPhone ?? "",
      }));
    }
    fetch("/api/appointment-types")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: AppointmentType[]) => {
        if (cancelled) return;
        const active = list.filter((type) => type.isActive);
        setTypes(active);
      })
      .catch(() => !cancelled && setTypes([]));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment?.id]);

  if (!open) return null;
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const selected = types?.find((type) => type.id === form.typeId);
  const noType = form.typeId === "";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.date) return setError("Elige la fecha de la cita.");
    if (!form.time) return setError("Elige la hora de la cita.");
    setSaving(true);
    setError(null);
    try {
      const fields = {
        title: form.title,
        date: form.date,
        time: form.time,
        durationMinutes: form.duration ? Number(form.duration) : undefined,
        guestName: form.name,
        guestEmail: form.email,
        guestPhone: form.phone,
        notes: form.notes,
        timezone: browserTimezone(),
      };
      const res = editing
        ? await fetch(`/api/appointments/${appointment.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            // appointmentTypeId viaja siempre: null quita el tipo (horario apartado).
            body: JSON.stringify({ ...fields, appointmentTypeId: form.typeId || null }),
          })
        : await fetch("/api/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...fields,
              appointmentTypeId: form.typeId || undefined,
              contactId: prefill.contactId ?? undefined,
              dealId: prefill.dealId ?? undefined,
              clientId: prefill.clientId ?? undefined,
            }),
          });
      const data = (await res.json().catch(() => ({}))) as CreatedAppointment & { error?: string };
      if (!res.ok) return setError(data.error ?? (editing ? "No se pudieron guardar los cambios." : "No se pudo crear la cita."));
      const done = editing ? "Cita actualizada." : "Cita creada.";
      addToast(data.overlaps ? `${done} Se empalma con ${data.overlaps} cita${data.overlaps === 1 ? "" : "s"}.` : done, data.overlaps ? "info" : "success");
      onCreated(data);
      onClose();
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-obsidian/35 p-4 sm:items-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-appointment-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-surface border border-line bg-surface-elevated shadow-md"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 id="manual-appointment-title" className="text-base font-semibold text-text-primary">{editing ? "Editar cita" : "Nueva cita"}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex size-9 min-h-0! min-w-0! items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover">
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5">
            <label className={LABEL}>
              Tipo de agenda
              <select value={form.typeId} onChange={(event) => set("typeId", event.target.value)} className={`${inputCls} font-normal`}>
                <option value="">Sin tipo: apartar horario</option>
                {types?.map((type) => (
                  <option key={type.id} value={type.id}>{type.name} · {type.duration} min</option>
                ))}
              </select>
              <span className="text-xs font-normal text-text-secondary">
                {noType
                  ? "El horario queda apartado y aparece como no disponible en todos los tipos de cita."
                  : "Cuenta como ocupado en las agendas que comparten este horario."}
              </span>
            </label>

            <label className={LABEL}>
              Título{noType ? "" : " (opcional)"}
              <input
                required={noType}
                value={form.title}
                onChange={(event) => set("title", event.target.value)}
                placeholder={noType ? "Comida con proveedor, trámite, visita…" : selected?.name}
                className={`${inputCls} font-normal`}
              />
            </label>

            <div className="flex flex-col gap-4">
              <div className={LABEL}>
                <span>Fecha</span>
                <DateField value={form.date} onChange={(date) => set("date", date)} label="Fecha de la cita" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className={LABEL}>
                <span>Hora</span>
                <TimeField value={form.time} onChange={(time) => set("time", time)} label="Hora de la cita" />
              </div>
              <label className={LABEL}>
                Duración (min)
                <input
                  type="number"
                  min={5}
                  max={1440}
                  step={5}
                  value={form.duration}
                  onChange={(event) => set("duration", event.target.value)}
                  placeholder={selected ? String(selected.duration) : "60"}
                  className={`${inputCls} font-normal`}
                />
              </label>
            </div>

            <label className={LABEL}>
              Con quién{form.title.trim() ? " (opcional)" : ""}
              <input required={!form.title.trim()} value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Nombre de la persona" className={`${inputCls} font-normal`} />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={LABEL}>
                Correo (opcional)
                <input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} className={`${inputCls} font-normal`} />
              </label>
              <label className={LABEL}>
                Teléfono (opcional)
                <input value={form.phone} onChange={(event) => set("phone", event.target.value)} className={`${inputCls} font-normal`} />
              </label>
            </div>
            <label className={LABEL}>
              Descripción (opcional)
              <textarea rows={3} value={form.notes} onChange={(event) => set("notes", event.target.value)} className={`${inputCls} resize-none font-normal`} />
            </label>

            {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="inline-flex h-10 min-h-0! items-center rounded-control px-4 text-sm font-medium text-text-secondary hover:bg-nav-hover">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="crm-press inline-flex h-10 min-h-0! items-center rounded-control bg-action-primary px-5 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary disabled:opacity-50"
              >
                {saving ? (editing ? "Guardando…" : "Creando…") : editing ? "Guardar cambios" : "Crear cita"}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
