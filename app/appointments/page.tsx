"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, User02Icon, Mail01Icon, CallIcon, CheckmarkCircle01Icon, Cancel01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import { Chip, DataList, EmptyState, Enter, ErrorState, FilterBar, PageHeader, Segmented, Skeleton, type ChipTone } from "@/src/components/ui";

type AppointmentRow = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  notes?: string | null;
  appointmentType?: { name?: string | null; color?: string | null } | null;
};

// Estado de la cita (semántico): confirmada = neutral, completada = éxito, cancelada = error.
const STATUS_TONES: Record<string, ChipTone> = {
  CONFIRMED: "neutral",
  COMPLETED: "done",
  CANCELLED: "late",
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

const FILTER_TABS = [
  { key: "ALL", label: "Todas" },
  { key: "CONFIRMED", label: "Confirmadas" },
  { key: "COMPLETED", label: "Completadas" },
  { key: "CANCELLED", label: "Canceladas" },
];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState("ALL");
  // Solo la primera carga (sin datos todavía) muestra el esqueleto; una recarga no hace parpadear la cabecera.
  const firstLoad = isLoading && appointments.length === 0 && !loadError;
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState } = useHeader();

  useEffect(() => {
    resetState();
  }, []);

  useEffect(() => {
    setConfig({
      title: "Citas agendadas",
      titleBadge: firstLoad ? undefined : appointments.length,
      pageHeader: true,
    });
    return () => setConfig({});
  }, [firstLoad, appointments.length]);

  useEffect(() => { fetchAppointments(); }, []);

  // `refresh`: recarga tras una acción; si falla, la lista ya cargada se queda y se avisa con un toast.
  const fetchAppointments = async ({ refresh = false }: { refresh?: boolean } = {}) => {
    setIsLoading(true);
    if (!refresh) setLoadError(false);
    let ok = false;
    try {
      const res = await fetch("/api/appointments");
      if (res.ok) {
        setAppointments(await res.json());
        setLoadError(false);
        ok = true;
      }
    } catch {
      // se trata abajo
    }
    if (!ok) {
      if (refresh) addToast("No se pudo actualizar la lista de citas.", "error");
      else setLoadError(true);
    }
    setIsLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        addToast("No se pudo actualizar la cita.", "error");
        return;
      }
    } catch {
      addToast("Error de red.", "error");
      return;
    }
    fetchAppointments({ refresh: true });
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Eliminar cita",
      description: "¿Eliminar esta cita permanentemente? Se liberará el horario.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (res.ok) { addToast("Cita eliminada y horario liberado.", "success"); fetchAppointments({ refresh: true }); }
      else addToast("Error al eliminar.", "error");
    } catch { addToast("Error de red.", "error"); }
  };

  const filtered = filter === "ALL" ? appointments : appointments.filter(a => a.status === filter);

  const counts = {
    ALL: appointments.length,
    CONFIRMED: appointments.filter(a => a.status === "CONFIRMED").length,
    COMPLETED: appointments.filter(a => a.status === "COMPLETED").length,
    CANCELLED: appointments.filter(a => a.status === "CANCELLED").length,
  };

  const renderAppointment = (appt: AppointmentRow) => {
    const start = new Date(appt.startTime);
    const end = new Date(appt.endTime);
    const time = (d: Date) => d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    return (
      <div className="flex w-full min-w-0 flex-col gap-3 py-2 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {/* Color del tipo de cita (dato configurado por el usuario). */}
          <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: appt.appointmentType?.color || "#3545D6" }} aria-hidden="true" />
          <div className="w-14 shrink-0 rounded-control border border-line bg-surface-sidebar px-2 py-1.5 text-center">
            <div className="text-xs font-semibold text-text-secondary">{start.toLocaleDateString("es-MX", { month: "short" })}</div>
            <div className="text-2xl font-semibold leading-none tabular-nums text-text-primary">{start.getDate()}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-text-primary">{appt.appointmentType?.name || "Cita"}</span>
              <Chip tone={STATUS_TONES[appt.status] ?? "neutral"}>{STATUS_LABELS[appt.status] || appt.status}</Chip>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
              <HugeiconsIcon icon={Clock01Icon} size={14} />
              <span className="tabular-nums">
                {time(start)} a {time(end)} · {start.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
              <span className="inline-flex min-w-0 items-center gap-1.5"><HugeiconsIcon icon={User02Icon} size={14} />{appt.guestName}</span>
              <a href={`mailto:${appt.guestEmail}`} className="inline-flex min-h-11 min-w-0 items-center gap-1.5 hover:text-action-primary lg:min-h-0">
                <HugeiconsIcon icon={Mail01Icon} size={14} />
                <span className="truncate">{appt.guestEmail}</span>
              </a>
              {appt.guestPhone && (
                <a href={`tel:${appt.guestPhone}`} className="inline-flex min-h-11 items-center gap-1.5 tabular-nums hover:text-action-primary lg:min-h-0">
                  <HugeiconsIcon icon={CallIcon} size={14} />
                  {appt.guestPhone}
                </a>
              )}
            </div>
            {appt.notes && <p className="mt-2 rounded-control bg-surface-sidebar px-3 py-2 text-sm text-text-secondary">{appt.notes}</p>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
          {appt.status === "CONFIRMED" && (
            <>
              <button
                type="button"
                onClick={() => updateStatus(appt.id, "COMPLETED")}
                className="crm-press inline-flex min-h-11 items-center gap-1.5 rounded-control border border-line bg-surface-elevated px-3 text-sm font-semibold text-success hover:bg-success-soft lg:min-h-9"
              >
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} /> Completar
              </button>
              <button
                type="button"
                onClick={() => updateStatus(appt.id, "CANCELLED")}
                className="crm-press inline-flex min-h-11 items-center gap-1.5 rounded-control border border-line bg-surface-elevated px-3 text-sm font-semibold text-danger hover:bg-danger-soft lg:min-h-9"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} /> Cancelar
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => handleDelete(appt.id)}
            className="crm-press inline-flex min-h-11 items-center gap-1.5 rounded-control px-3 text-sm font-semibold text-text-secondary hover:bg-danger-soft hover:text-danger lg:min-h-9"
          >
            <HugeiconsIcon icon={Delete01Icon} size={16} /> Eliminar
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
      <Enter index={0}>
        <PageHeader
          title="Citas agendadas"
          subtitle={firstLoad ? "Cargando citas…" : `${counts.CONFIRMED} confirmadas · ${counts.COMPLETED} completadas · ${counts.CANCELLED} canceladas`}
        />
      </Enter>
      <Enter index={1}>
        <FilterBar
          segments={
            <Segmented
              label="Estado de las citas"
              value={filter}
              onChange={setFilter}
              options={FILTER_TABS.map((tab) => ({ value: tab.key, label: `${tab.label} · ${counts[tab.key as keyof typeof counts]}` }))}
            />
          }
        />
      </Enter>
      <Enter index={2}>
        {firstLoad ? (
          <div className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
            <Skeleton shape="rows" count={4} label="Cargando citas" />
          </div>
        ) : loadError && appointments.length === 0 ? (
          <div className="rounded-surface border border-line bg-surface-elevated">
            <ErrorState title="No se pudieron cargar las citas" onRetry={() => fetchAppointments()} />
          </div>
        ) : (
          <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
            <DataList
              label="Citas agendadas"
              rows={filtered}
              getKey={(a) => a.id}
              renderRow={renderAppointment}
              empty={
                <EmptyState
                  title={filter === "ALL" ? "Sin citas" : `Sin citas ${STATUS_LABELS[filter]?.toLowerCase() || ""}`}
                  body="Las citas que agenden tus clientes aparecerán aquí."
                />
              }
            />
          </section>
        )}
      </Enter>
    </main>
  );
}
