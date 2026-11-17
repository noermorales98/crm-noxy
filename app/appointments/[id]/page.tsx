"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppointmentMeetingPanel } from "@/src/components/AppointmentMeetingPanel";
import { AppointmentSuggestions } from "@/src/components/AppointmentSuggestions";
import KbMarkdown from "@/src/components/kb/KbMarkdown";
import { Chip, EmptyState, ErrorState, Skeleton, type ChipTone } from "@/src/components/ui";
import { useHeader } from "@/src/context/HeaderContext";

type Detail = {
  id: string;
  title: string | null;
  startTime: string;
  endTime: string;
  status: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  notes: string | null;
  appointmentType: { name: string; location: string | null } | null;
  contact: { id: string; firstName: string; lastName: string | null; email: string | null } | null;
  deal: { id: string; title: string } | null;
};

const STATUS_TONES: Record<string, ChipTone> = { CONFIRMED: "neutral", COMPLETED: "done", CANCELLED: "late" };
const STATUS_LABELS: Record<string, string> = { CONFIRMED: "Confirmada", COMPLETED: "Completada", CANCELLED: "Cancelada" };

const day = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const clock = (iso: string) => new Date(iso).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });

/** Página de una cita: datos, sugerencias de la IA y notas de la reunión (Granola, Notion o escritas a mano). */
export default function AppointmentPage() {
  const { id } = useParams<{ id: string }>();
  const { setConfig, resetState } = useHeader();
  const [appointment, setAppointment] = useState<Detail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    resetState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetch(`/api/appointments/${id}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) return setState("missing");
        if (!res.ok) return setState("error");
        setAppointment((await res.json()) as Detail);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const title = appointment ? appointment.title?.trim() || appointment.appointmentType?.name || appointment.guestName : "Cita";

  useEffect(() => {
    setConfig({ title, backHref: "/appointments", pageHeader: true });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  return (
    <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {state === "loading" && <Skeleton shape="rows" count={3} label="Cargando la cita" />}
        {state === "missing" && <EmptyState title="Cita no encontrada" body="Puede que se haya eliminado o que no pertenezca a esta organización." />}
        {state === "error" && <ErrorState title="No se pudo cargar la cita" onRetry={() => setAttempt((n) => n + 1)} />}

        {state === "ready" && appointment && (
          <>
            <section aria-label="Datos de la cita" className="space-y-2 rounded-control border border-line p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 text-lg font-semibold text-text-primary">{title}</h1>
                <Chip tone={STATUS_TONES[appointment.status] ?? "neutral"}>{STATUS_LABELS[appointment.status] ?? appointment.status}</Chip>
                {appointment.appointmentType && <Chip>{appointment.appointmentType.name}</Chip>}
              </div>
              <p className="text-sm capitalize text-text-secondary">
                {day(appointment.startTime)} · {clock(appointment.startTime)} – {clock(appointment.endTime)}
              </p>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
                <span>{appointment.guestName}</span>
                {appointment.guestEmail && <a className="hover:text-text-primary" href={`mailto:${appointment.guestEmail}`}>{appointment.guestEmail}</a>}
                {appointment.guestPhone && <a className="tabular-nums hover:text-text-primary" href={`tel:${appointment.guestPhone}`}>{appointment.guestPhone}</a>}
              </p>
              {(appointment.contact || appointment.deal) && (
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {appointment.contact && (
                    <Link className="font-medium text-action-primary underline" href={`/contacts/${appointment.contact.id}`}>
                      Contacto: {appointment.contact.firstName} {appointment.contact.lastName ?? ""}
                    </Link>
                  )}
                  {appointment.deal && (
                    <Link className="font-medium text-action-primary underline" href={`/pipeline/${appointment.deal.id}`}>
                      Lead: {appointment.deal.title}
                    </Link>
                  )}
                </p>
              )}
              {appointment.notes && <KbMarkdown content={appointment.notes} allowImages={false} />}
            </section>

            <AppointmentSuggestions appointmentId={appointment.id} />

            <section aria-label="Notas de la reunión" className="space-y-3">
              <h2 className="text-sm font-semibold text-text-primary">Notas de la reunión</h2>
              <AppointmentMeetingPanel appointmentId={appointment.id} />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
