"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppointmentInfoPills from "@/src/components/appointments/AppointmentInfoPills";
import AppointmentNavbar from "@/src/components/appointments/AppointmentNavbar";
import { AppointmentMeetingPanel } from "@/src/components/AppointmentMeetingPanel";
import { AppointmentSuggestions } from "@/src/components/AppointmentSuggestions";
import KbMarkdown from "@/src/components/kb/KbMarkdown";
import { EmptyState, ErrorState, Skeleton } from "@/src/components/ui";
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

const day = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "");
const clock = (iso: string) => new Date(iso).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });

/**
 * Página de una cita: una barra baja con título, persona, fecha y acciones, pastillas con los datos y, como centro, las notas de la reunión
 * (Granola, Notion o escritas a mano). Las sugerencias de la IA van al lado.
 */
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

  // La barra de la cita lleva el título y el botón de volver: la barra general de la hoja no se repite.
  useEffect(() => {
    setConfig({ title, backHref: "/appointments", pageHeader: true });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* La barra va fuera del cuerpo: ocupa todo el ancho y no se desplaza con las notas. */}
      {state === "ready" && appointment && (
        <AppointmentNavbar appointmentId={appointment.id} title={title} />
      )}
      {/* Cuerpo: las notas a la izquierda y, en pantallas anchas, las sugerencias como un sidebar pegado a la derecha; cada lado se desplaza solo. */}
      <div className="crm-mobile-bottom-clearance flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden lg:flex-row lg:overflow-hidden">
      <div className="min-w-0 flex-1 lg:overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 pb-8 sm:px-6">
        {state === "loading" && (
          <div className="py-6">
            <Skeleton shape="rows" count={3} label="Cargando la cita" />
          </div>
        )}
        {state === "missing" && (
          <div className="py-6">
            <EmptyState title="Cita no encontrada" body="Puede que se haya eliminado o que no pertenezca a esta organización." />
          </div>
        )}
        {state === "error" && (
          <div className="py-6">
            <ErrorState title="No se pudo cargar la cita" onRetry={() => setAttempt((n) => n + 1)} />
          </div>
        )}

        {state === "ready" && appointment && (
          <>
            <div className="pt-4">
              <AppointmentInfoPills
                status={appointment.status}
                date={day(appointment.startTime)}
                time={`${clock(appointment.startTime)} – ${clock(appointment.endTime)}`}
                person={
                  appointment.contact
                    ? { name: `${appointment.contact.firstName} ${appointment.contact.lastName ?? ""}`.trim(), href: `/contacts/${appointment.contact.id}` }
                    : { name: appointment.guestName }
                }
                deal={appointment.deal ? { title: appointment.deal.title, href: `/pipeline/${appointment.deal.id}` } : null}
                details={{ typeName: appointment.appointmentType?.name ?? null, location: appointment.appointmentType?.location ?? null, email: appointment.guestEmail || null, phone: appointment.guestPhone }}
              />
            </div>

            {appointment.notes && (
              <div className="mb-2 rounded-surface bg-surface-elevated p-4 text-sm text-text-secondary">
                <KbMarkdown content={appointment.notes} allowImages={false} className="kb-compact" />
              </div>
            )}

            <div className="mt-4">
              <AppointmentMeetingPanel appointmentId={appointment.id} />
            </div>
          </>
        )}
      </div>
      </div>
      {state === "ready" && appointment && (
        <aside aria-label="Sugerencias" className="shrink-0 border-t border-line bg-surface-elevated lg:w-[22rem] lg:overflow-y-auto lg:border-l lg:border-t-0">
          <AppointmentSuggestions appointmentId={appointment.id} />
        </aside>
      )}
      </div>
    </main>
  );
}
