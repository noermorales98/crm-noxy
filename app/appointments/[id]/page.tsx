"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Briefcase01Icon, Call02Icon, Location01Icon, Mail01Icon, User02Icon, UserIcon } from "@hugeicons/core-free-icons";
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

const day = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const clock = (iso: string) => new Date(iso).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });

const FACT = "inline-flex min-h-11 items-center gap-1.5 rounded-control px-1 text-sm text-text-secondary lg:min-h-8";
const FACT_LINK = `${FACT} outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus`;

/**
 * Página de una cita: una barra con el título y las acciones, una línea con los datos y, como centro, las notas de la reunión
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
    <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto pb-8">
      {/* La barra va fuera del contenedor angosto: ocupa todo el ancho y se queda arriba al desplazar. */}
      {state === "ready" && appointment && (
        <AppointmentNavbar title={title} status={appointment.status} subtitle={`${day(appointment.startTime)} · ${clock(appointment.startTime)} – ${clock(appointment.endTime)}`} />
      )}
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
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
            <section aria-label="Datos de la cita" className="flex flex-wrap items-center gap-x-4 gap-y-0 py-3">
              <span className={FACT}>
                <HugeiconsIcon icon={User02Icon} size={14} aria-hidden="true" />
                {appointment.guestName}
              </span>
              {appointment.guestEmail && (
                <a className={FACT_LINK} href={`mailto:${appointment.guestEmail}`}>
                  <HugeiconsIcon icon={Mail01Icon} size={14} aria-hidden="true" />
                  {appointment.guestEmail}
                </a>
              )}
              {appointment.guestPhone && (
                <a className={`${FACT_LINK} tabular-nums`} href={`tel:${appointment.guestPhone}`}>
                  <HugeiconsIcon icon={Call02Icon} size={14} aria-hidden="true" />
                  {appointment.guestPhone}
                </a>
              )}
              {appointment.appointmentType?.location && (
                <span className={FACT}>
                  <HugeiconsIcon icon={Location01Icon} size={14} aria-hidden="true" />
                  {appointment.appointmentType.location}
                </span>
              )}
              {appointment.contact && (
                <Link className={`${FACT_LINK} font-medium text-action-ink hover:text-action-ink-hover`} href={`/contacts/${appointment.contact.id}`}>
                  <HugeiconsIcon icon={UserIcon} size={14} aria-hidden="true" />
                  {appointment.contact.firstName} {appointment.contact.lastName ?? ""}
                </Link>
              )}
              {appointment.deal && (
                <Link className={`${FACT_LINK} font-medium text-action-ink hover:text-action-ink-hover`} href={`/pipeline/${appointment.deal.id}`}>
                  <HugeiconsIcon icon={Briefcase01Icon} size={14} aria-hidden="true" />
                  {appointment.deal.title}
                </Link>
              )}
            </section>

            {appointment.notes && (
              <div className="mb-2 rounded-surface bg-surface-elevated p-4 text-sm text-text-secondary">
                <KbMarkdown content={appointment.notes} allowImages={false} />
              </div>
            )}

            <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <AppointmentMeetingPanel appointmentId={appointment.id} />
              {/* Las sugerencias de la IA acompañan al desplazarse (en pantallas anchas); si son largas, se desplazan dentro. */}
              <aside aria-label="Sugerencias" className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-y-auto">
                <AppointmentSuggestions appointmentId={appointment.id} />
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
