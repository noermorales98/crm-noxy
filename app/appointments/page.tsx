"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  Mail01Icon,
  PencilEdit01Icon,
  CallIcon,
  Undo02Icon,
} from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import { ManualAppointmentDialog, type EditableAppointment } from "@/src/components/ManualAppointmentDialog";
import { ActionMenu, Chip, DataList, EmptyState, Enter, ErrorState, FilterBar, PageHeader, Segmented, Skeleton, type ActionMenuItem, type ChipTone } from "@/src/components/ui";
import { appointmentTabCounts, filterAppointments, groupAppointmentsByDay, type AppointmentTab } from "@/src/lib/appointment-groups";

type AppointmentRow = EditableAppointment & {
  status: string;
  appointmentType: { id: string; name?: string | null; color?: string | null } | null;
};

const STATUS_TONES: Record<string, ChipTone> = { CONFIRMED: "neutral", COMPLETED: "done", CANCELLED: "late" };
const STATUS_LABELS: Record<string, string> = { CONFIRMED: "Confirmada", COMPLETED: "Completada", CANCELLED: "Cancelada" };

const TABS: { key: AppointmentTab; label: string }[] = [
  { key: "upcoming", label: "Próximas" },
  { key: "past", label: "Anteriores" },
  { key: "cancelled", label: "Canceladas" },
  { key: "all", label: "Todas" },
];

const EMPTY: Record<AppointmentTab, { title: string; body: string }> = {
  upcoming: { title: "No tienes citas próximas", body: "Crea una con «Nueva cita» o comparte tu enlace de agenda para que te reserven." },
  past: { title: "Aún no hay citas anteriores", body: "Las citas que ya pasaron o que marques como completadas aparecen aquí." },
  cancelled: { title: "No hay citas canceladas", body: "Cuando canceles una cita quedará aquí y su horario se libera." },
  all: { title: "Sin citas", body: "Las citas que agenden tus clientes o que crees a mano aparecerán aquí." },
};

const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const clock = (iso: string) => new Date(iso).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
const minutesBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<AppointmentTab>("upcoming");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<AppointmentRow | null>(null);
  // Solo la primera carga (sin datos todavía) muestra el esqueleto; una recarga no hace parpadear la cabecera.
  const firstLoad = isLoading && appointments.length === 0 && !loadError;
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState } = useHeader();

  // «Ahora» se fija al cargar los datos: las pestañas y los avisos «Por cerrar» se calculan contra ese instante.
  const now = useMemo(() => new Date(), [appointments]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => appointmentTabCounts(appointments, now), [appointments, now]);

  // `refresh`: recarga tras una acción; si falla, la lista ya cargada se queda y se avisa con un toast.
  const fetchAppointments = useCallback(
    async ({ refresh = false }: { refresh?: boolean } = {}) => {
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
    },
    [addToast],
  );

  useEffect(() => {
    resetState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setConfig({ title: "Citas", titleBadge: firstLoad ? undefined : counts.upcoming, pageHeader: true });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstLoad, counts.upcoming]);

  useEffect(() => {
    void fetchAppointments();
  }, [fetchAppointments]);

  const updateStatus = async (id: string, status: string, done: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return addToast("No se pudo actualizar la cita.", "error");
      addToast(done, "success");
    } catch {
      return addToast("Error de red.", "error");
    }
    void fetchAppointments({ refresh: true });
  };

  const cancelAppointment = async (appt: AppointmentRow) => {
    const ok = await confirm({
      title: "Cancelar cita",
      description: `La cita con ${appt.guestName} quedará como cancelada y su horario se libera. Podrás reactivarla después.`,
      confirmText: "Cancelar cita",
      cancelText: "Conservar",
      variant: "warning",
    });
    if (ok) void updateStatus(appt.id, "CANCELLED", "Cita cancelada y horario liberado.");
  };

  const deleteAppointment = async (appt: AppointmentRow) => {
    const ok = await confirm({
      title: "Eliminar cita",
      description: "¿Eliminar esta cita permanentemente? No se puede deshacer; se liberará el horario.",
      confirmText: "Eliminar",
      cancelText: "Conservar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, { method: "DELETE" });
      if (res.ok) {
        addToast("Cita eliminada y horario liberado.", "success");
        void fetchAppointments({ refresh: true });
      } else addToast("Error al eliminar.", "error");
    } catch {
      addToast("Error de red.", "error");
    }
  };

  // Todas las acciones viven en un menú; las destructivas (cancelar, eliminar) van al final, en rojo y con confirmación.
  const menuFor = (appt: AppointmentRow): ActionMenuItem[] => {
    const edit: ActionMenuItem = { key: "edit", label: "Editar o reprogramar", icon: PencilEdit01Icon, onSelect: () => setEditing(appt) };
    const remove: ActionMenuItem = { key: "delete", label: "Eliminar", icon: Delete02Icon, tone: "danger", onSelect: () => void deleteAppointment(appt) };
    if (appt.status === "CONFIRMED") {
      return [
        edit,
        { key: "complete", label: "Marcar como completada", icon: CheckmarkCircle01Icon, onSelect: () => void updateStatus(appt.id, "COMPLETED", "Cita completada.") },
        { key: "cancel", label: "Cancelar cita", icon: Cancel01Icon, tone: "danger", onSelect: () => void cancelAppointment(appt) },
        remove,
      ];
    }
    return [
      edit,
      {
        key: "reopen",
        label: appt.status === "CANCELLED" ? "Reactivar cita" : "Reabrir cita",
        icon: Undo02Icon,
        onSelect: () => void updateStatus(appt.id, "CONFIRMED", "Cita reactivada."),
      },
      remove,
    ];
  };

  const renderRow = (appt: AppointmentRow) => {
    const isOver = new Date(appt.endTime) < now;
    const title = appt.title?.trim() || appt.appointmentType?.name || "Cita";
    const person = appt.guestName && appt.guestName !== appt.title ? appt.guestName : null;
    const accent = appt.appointmentType?.color || "var(--color-line)";
    const details = [person, appt.title?.trim() ? appt.appointmentType?.name : null].filter(Boolean).join(" · ");
    return (
      <div className="flex w-full items-start gap-3 py-1.5 sm:gap-4">
        <div className="w-[4.5rem] shrink-0 border-l-2 pl-3 sm:w-24" style={{ borderColor: accent }}>
          <p className="text-sm font-semibold tabular-nums text-text-primary">{clock(appt.startTime)}</p>
          <p className="text-xs tabular-nums text-text-secondary">{minutesBetween(appt.startTime, appt.endTime)} min</p>
        </div>

        <div className={`min-w-0 flex-1 ${appt.status === "CANCELLED" ? "opacity-60" : ""}`}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-sm font-semibold text-text-primary">{title}</p>
            {!appt.appointmentType && <Chip>Apartado</Chip>}
            {appt.status === "CONFIRMED" && isOver ? <Chip tone="hot">Por cerrar</Chip> : <Chip tone={STATUS_TONES[appt.status] ?? "neutral"}>{STATUS_LABELS[appt.status] ?? appt.status}</Chip>}
          </div>
          {details && <p className="mt-0.5 truncate text-sm text-text-secondary">{details}</p>}
          {(appt.guestEmail || appt.guestPhone) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
              {appt.guestPhone && (
                <a href={`tel:${appt.guestPhone}`} className="inline-flex items-center gap-1 tabular-nums hover:text-text-primary">
                  <HugeiconsIcon icon={CallIcon} size={12} />
                  {appt.guestPhone}
                </a>
              )}
              {appt.guestEmail && (
                <a href={`mailto:${appt.guestEmail}`} className="inline-flex min-w-0 items-center gap-1 hover:text-text-primary">
                  <HugeiconsIcon icon={Mail01Icon} size={12} />
                  <span className="truncate">{appt.guestEmail}</span>
                </a>
              )}
            </p>
          )}
          {appt.notes && <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{appt.notes}</p>}
        </div>

        <ActionMenu label={`Acciones de la cita «${title}»`} items={menuFor(appt)} />
      </div>
    );
  };

  const visible = filterAppointments(appointments, tab, now);
  const groups = groupAppointmentsByDay(visible, browserTimezone(), now, tab === "upcoming" ? "asc" : "desc");
  const todayCount = tab === "upcoming" ? (groups.find((group) => group.label === "Hoy")?.items.length ?? 0) : 0;

  return (
    <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-4xl">
        <Enter index={0}>
          <PageHeader
            title="Citas"
            subtitle={firstLoad ? "Cargando citas…" : todayCount > 0 ? `${todayCount} ${todayCount === 1 ? "cita hoy" : "citas hoy"} · ${counts.upcoming} próximas` : `${counts.upcoming} próximas`}
            actions={
              <button
                type="button"
                onClick={() => setShowNew(true)}
                className="crm-press inline-flex min-h-11 items-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary lg:min-h-10"
              >
                <HugeiconsIcon icon={Add01Icon} size={16} aria-hidden="true" />
                Nueva cita
              </button>
            }
          />
        </Enter>
        <Enter index={1}>
          <FilterBar
            segments={
              <Segmented
                label="Vista de las citas"
                value={tab}
                onChange={(value) => setTab(value as AppointmentTab)}
                options={TABS.map((item) => ({ value: item.key, label: `${item.label} · ${counts[item.key]}` }))}
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
              <ErrorState title="No se pudieron cargar las citas" onRetry={() => void fetchAppointments()} />
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-surface border border-line bg-surface-elevated">
              <EmptyState title={EMPTY[tab].title} body={EMPTY[tab].body} />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <section key={group.key} aria-label={group.label}>
                  <h2 className="mb-2 flex items-baseline gap-2 px-1 text-sm font-semibold text-text-primary">
                    {group.label}
                    <span className="text-xs font-normal tabular-nums text-text-secondary">{group.items.length}</span>
                  </h2>
                  <div className="rounded-surface border border-line bg-surface-elevated">
                    <DataList
                      label={`Citas: ${group.label}`}
                      rows={group.items}
                      getKey={(appt) => appt.id}
                      renderRow={renderRow}
                      empty={<EmptyState title="Sin citas este día" />}
                    />
                  </div>
                </section>
              ))}
            </div>
          )}
        </Enter>
      </div>

      <ManualAppointmentDialog open={showNew} onClose={() => setShowNew(false)} onCreated={() => void fetchAppointments({ refresh: true })} />
      <ManualAppointmentDialog
        open={editing !== null}
        appointment={editing}
        onClose={() => setEditing(null)}
        onCreated={() => void fetchAppointments({ refresh: true })}
      />
    </main>
  );
}
