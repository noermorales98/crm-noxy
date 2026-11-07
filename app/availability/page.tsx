"use client";

import { useState, useEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import { Block, DataTable, EmptyState, Enter, ErrorState, PageHeader, Skeleton, useDialog, type DataColumn } from "@/src/components/ui";

const primaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary disabled:opacity-50 lg:min-h-10";
const secondaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface-elevated px-4 text-sm font-semibold text-text-primary hover:bg-surface-sidebar lg:min-h-10";
const iconAction =
  "crm-press flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-surface-sidebar hover:text-text-primary lg:size-9";
const deleteAction = `${iconAction} hover:bg-danger-soft hover:text-danger`;

type ExtendedRow = { id: string; title?: string | null; date: string; startTime: string; endTime: string };
type BlockedRow = { id: string; title?: string | null; start: string; end: string };

const DAYS = [
  { id: 0, label: "Domingo" },
  { id: 1, label: "Lunes" },
  { id: 2, label: "Martes" },
  { id: 3, label: "Miércoles" },
  { id: 4, label: "Jueves" },
  { id: 5, label: "Viernes" },
  { id: 6, label: "Sábado" },
];

const TIMEZONES = [
  // México
  { label: "── México ──", value: "", disabled: true },
  { label: "Ciudad de México, CDMX (UTC-6)", value: "America/Mexico_City" },
  { label: "Monterrey, Nuevo León (UTC-6)", value: "America/Monterrey" },
  { label: "Guadalajara, Jalisco (UTC-6)", value: "America/Mexico_City" },
  { label: "Puebla, Puebla (UTC-6)", value: "America/Mexico_City" },
  { label: "Querétaro, Querétaro (UTC-6)", value: "America/Mexico_City" },
  { label: "León, Guanajuato (UTC-6)", value: "America/Mexico_City" },
  { label: "Mérida, Yucatán (UTC-6)", value: "America/Merida" },
  { label: "Cancún, Quintana Roo (UTC-5, sin cambio horario)", value: "America/Cancun" },
  { label: "Hermosillo, Sonora (UTC-7, sin cambio horario)", value: "America/Hermosillo" },
  { label: "Chihuahua, Chihuahua (UTC-6/-7)", value: "America/Chihuahua" },
  { label: "Mazatlán, Sinaloa (UTC-7)", value: "America/Mazatlan" },
  { label: "Tijuana / Mexicali, Baja California (UTC-8)", value: "America/Tijuana" },
  { label: "La Paz, Baja California Sur (UTC-7)", value: "America/Mazatlan" },
  // EE.UU.
  { label: "── Estados Unidos ──", value: "", disabled: true },
  { label: "Nueva York / Miami / Boston (ET, UTC-5)", value: "America/New_York" },
  { label: "Chicago / Houston / Dallas (CT, UTC-6)", value: "America/Chicago" },
  { label: "Denver / Phoenix / Salt Lake (MT, UTC-7)", value: "America/Denver" },
  { label: "Los Ángeles / San Francisco / Seattle (PT, UTC-8)", value: "America/Los_Angeles" },
  { label: "Anchorage, Alaska (UTC-9)", value: "America/Anchorage" },
  { label: "Honolulu, Hawái (UTC-10)", value: "Pacific/Honolulu" },
  // Latinoamérica
  { label: "── Latinoamérica ──", value: "", disabled: true },
  { label: "Bogotá, Colombia (UTC-5)", value: "America/Bogota" },
  { label: "Lima, Perú (UTC-5)", value: "America/Lima" },
  { label: "Santiago, Chile (UTC-3)", value: "America/Santiago" },
  { label: "Buenos Aires, Argentina (UTC-3)", value: "America/Argentina/Buenos_Aires" },
  // Europa
  { label: "── Europa ──", value: "", disabled: true },
  { label: "Madrid, España (UTC+1)", value: "Europe/Madrid" },
];

type SlotState = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

export default function AvailabilityPage() {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState } = useHeader();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/Mexico_City");
  const [slots, setSlots] = useState<SlotState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Org timezone (from settings)
  const [orgTimezone, setOrgTimezone] = useState("America/Cancun");

  // Blocked Times State
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const [blockedType, setBlockedType] = useState<"ALL_DAY" | "HOURS">("HOURS");
  const [blockedTitle, setBlockedTitle] = useState("");

  // For ALL_DAY: list of specific dates
  const [allDayDates, setAllDayDates] = useState<string[]>([]);
  const [allDayInput, setAllDayInput] = useState("");

  // For HOURS
  const [hoursDate, setHoursDate] = useState("");
  const [hoursStart, setHoursStart] = useState("09:00");
  const [hoursEnd, setHoursEnd] = useState("18:00");

  const [isSubmittingBlocked, setIsSubmittingBlocked] = useState(false);

  // Extended Availability State
  const [extendedTimes, setExtendedTimes] = useState<any[]>([]);
  const [isExtendedModalOpen, setIsExtendedModalOpen] = useState(false);
  // Estado propio de cada tabla: «Sin excepciones» solo se afirma cuando la carga terminó bien.
  const [blockedState, setBlockedState] = useState<"loading" | "ready" | "error">("loading");
  const [extendedState, setExtendedState] = useState<"loading" | "ready" | "error">("loading");
  const scheduleDialogRef = useRef<HTMLDivElement>(null);
  const blockedDialogRef = useRef<HTMLDivElement>(null);
  const extendedDialogRef = useRef<HTMLDivElement>(null);
  useDialog(scheduleDialogRef, isModalOpen, () => setIsModalOpen(false));
  useDialog(blockedDialogRef, isBlockedModalOpen, () => setIsBlockedModalOpen(false));
  useDialog(extendedDialogRef, isExtendedModalOpen, () => setIsExtendedModalOpen(false));
  const [extendedTitle, setExtendedTitle] = useState("");
  const [extendedDate, setExtendedDate] = useState("");
  const [extendedStart, setExtendedStart] = useState("09:00");
  const [extendedEnd, setExtendedEnd] = useState("14:00");
  const [isSubmittingExtended, setIsSubmittingExtended] = useState(false);

  useEffect(() => {
    resetState();
    setConfig({ title: "Disponibilidad", pageHeader: true });
    return () => setConfig({});
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchBlockedTimes();
    fetchExtendedTimes();
    fetchOrgTimezone();
  }, []);

  const fetchOrgTimezone = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setOrgTimezone(data.timezone || "America/Cancun");
      }
    } catch {}
  };

  const fetchSchedules = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/availability");
      if (res.ok) setSchedules(await res.json());
      else setLoadError(true);
    } catch {
      setLoadError(true);
    }
    setIsLoading(false);
  };

  const fetchBlockedTimes = async () => {
    setBlockedState("loading");
    try {
      const res = await fetch("/api/availability/blocked");
      if (res.ok) {
        setBlockedTimes(await res.json());
        setBlockedState("ready");
      } else setBlockedState("error");
    } catch {
      setBlockedState("error");
    }
  };

  const fetchExtendedTimes = async () => {
    setExtendedState("loading");
    try {
      const res = await fetch("/api/availability/extended");
      if (res.ok) {
        setExtendedTimes(await res.json());
        setExtendedState("ready");
      } else setExtendedState("error");
    } catch {
      setExtendedState("error");
    }
  };

  const defaultSlots = (): SlotState[] => DAYS.map(d => ({
    dayOfWeek: d.id,
    startTime: "09:00",
    endTime: "18:00",
    isAvailable: d.id >= 1 && d.id <= 5 // Mon-Fri default
  }));

  const openCreate = () => {
    setEditingSchedule(null);
    setName(""); setTimezone("America/Mexico_City"); setSlots(defaultSlots());
    setIsModalOpen(true);
  };

  const openEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    setName(schedule.name); setTimezone(schedule.timezone);
    const existing: SlotState[] = DAYS.map(d => {
      const found = schedule.slots.find((s: any) => s.dayOfWeek === d.id);
      return found
        ? { dayOfWeek: d.id, startTime: found.startTime, endTime: found.endTime, isAvailable: found.isAvailable }
        : { dayOfWeek: d.id, startTime: "09:00", endTime: "18:00", isAvailable: false };
    });
    setSlots(existing);
    setIsModalOpen(true);
  };

  const updateSlot = (dayId: number, key: keyof SlotState, value: any) => {
    setSlots(prev => prev.map(s => s.dayOfWeek === dayId ? { ...s, [key]: value } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timezone) { addToast("Selecciona una zona horaria válida.", "warning"); return; }
    setIsSubmitting(true);
    const body = { name, timezone, slots: slots.filter(s => s.isAvailable) };
    const url = editingSchedule ? `/api/availability/${editingSchedule.id}` : "/api/availability";
    const method = editingSchedule ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const text = await res.text();
      const d = text ? JSON.parse(text) : {};
      if (res.ok) { setIsModalOpen(false); fetchSchedules(); }
      else { addToast(d.error || `Error ${res.status}`, "error"); }
    } catch (err) {
      addToast("Error de conexión. Intenta de nuevo.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, scheduleName: string) => {
    const ok = await confirm({
      title: "Eliminar horario",
      description: `¿Eliminar el horario '${scheduleName}'?`,
      confirmText: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    await fetch(`/api/availability/${id}`, { method: "DELETE" });
    fetchSchedules();
  };

  const openBlockedModal = () => {
    setBlockedType("HOURS");
    setBlockedTitle("");
    setAllDayDates([]);
    setAllDayInput("");
    setHoursDate("");
    setHoursStart("09:00");
    setHoursEnd("18:00");
    setIsBlockedModalOpen(true);
  };

  const addAllDayDate = () => {
    if (!allDayInput) return;
    if (allDayDates.includes(allDayInput)) return;
    setAllDayDates(prev => [...prev, allDayInput].sort());
    setAllDayInput("");
  };

  const removeAllDayDate = (date: string) => {
    setAllDayDates(prev => prev.filter(d => d !== date));
  };

  const handleCreateBlocked = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBlocked(true);

    try {
      if (blockedType === "ALL_DAY") {
        if (allDayDates.length === 0) {
          addToast("Agrega al menos una fecha.", "warning");
          setIsSubmittingBlocked(false);
          return;
        }
        // Create one blocked entry per selected date
        for (const date of allDayDates) {
          const res = await fetch("/api/availability/blocked", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: blockedTitle, date, allDay: true })
          });
          if (!res.ok) {
            const d = await res.json();
            addToast(d.error || "Error al crear", "error");
            setIsSubmittingBlocked(false);
            return;
          }
        }
      } else {
        const res = await fetch("/api/availability/blocked", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: blockedTitle, date: hoursDate, startTime: hoursStart, endTime: hoursEnd, allDay: false })
        });
        if (!res.ok) {
          const d = await res.json();
          addToast(d.error || "Error al crear", "error");
          setIsSubmittingBlocked(false);
          return;
        }
      }

      setIsBlockedModalOpen(false);
      fetchBlockedTimes();
      addToast("Excepción añadida con éxito", "success");
    } catch (e) {
      addToast("Error de conexión", "error");
    } finally {
      setIsSubmittingBlocked(false);
    }
  };

  const openExtendedModal = () => {
    setExtendedTitle("");
    setExtendedDate("");
    setExtendedStart("09:00");
    setExtendedEnd("14:00");
    setIsExtendedModalOpen(true);
  };

  const handleCreateExtended = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingExtended(true);
    try {
      const res = await fetch("/api/availability/extended", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: extendedTitle, date: extendedDate, startTime: extendedStart, endTime: extendedEnd }),
      });
      if (res.ok) {
        setIsExtendedModalOpen(false);
        fetchExtendedTimes();
        addToast("Horario extendido añadido", "success");
      } else {
        const d = await res.json();
        addToast(d.error || "Error al crear", "error");
      }
    } catch (e) {
      addToast("Error de conexión", "error");
    } finally {
      setIsSubmittingExtended(false);
    }
  };

  const handleDeleteExtended = async (id: string) => {
    const ok = await confirm({
      title: "Eliminar horario extendido",
      description: "¿Eliminar este horario extendido?",
      confirmText: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    await fetch(`/api/availability/extended/${id}`, { method: "DELETE" });
    fetchExtendedTimes();
  };

  const handleDeleteBlocked = async (id: string) => {
    const ok = await confirm({
      title: "Eliminar excepción",
      description: "¿Eliminar esta excepción del calendario?",
      confirmText: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    await fetch(`/api/availability/blocked/${id}`, { method: "DELETE" });
    fetchBlockedTimes();
  };

  const formatBlockedDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleString("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: orgTimezone,
    });
  };

  const longDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

  const extendedColumns: DataColumn<ExtendedRow>[] = [
    {
      key: "title",
      header: "Motivo",
      render: (ext) => (
        <span className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
          <span className="font-medium text-text-primary">{ext.title || "Horario extendido"}</span>
        </span>
      ),
    },
    { key: "date", header: "Fecha", render: (ext) => <span className="text-text-secondary">{longDate(ext.date)}</span> },
    {
      key: "time",
      header: "Horario",
      render: (ext) => (
        <span className="inline-flex h-6 items-center rounded-full bg-success-soft px-2.5 text-xs font-semibold tabular-nums text-success">
          {ext.startTime} a {ext.endTime}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acción",
      align: "right",
      render: (ext) => (
        <button type="button" onClick={() => handleDeleteExtended(ext.id)} className={`${deleteAction} ml-auto`} aria-label={`Eliminar ${ext.title || "horario extendido"}`} title="Eliminar">
          <HugeiconsIcon icon={Delete01Icon} size={16} />
        </button>
      ),
    },
  ];

  const blockedColumns: DataColumn<BlockedRow>[] = [
    { key: "title", header: "Motivo", render: (b) => <span className="font-medium text-text-primary">{b.title || "No especificado"}</span> },
    { key: "start", header: "Inicia", render: (b) => <span className="text-text-secondary">{formatBlockedDate(b.start)}</span> },
    { key: "end", header: "Finaliza", render: (b) => <span className="text-text-secondary">{formatBlockedDate(b.end)}</span> },
    {
      key: "actions",
      header: "Acción",
      align: "right",
      render: (b) => (
        <button type="button" onClick={() => handleDeleteBlocked(b.id)} className={`${deleteAction} ml-auto`} aria-label={`Eliminar bloqueo ${b.title || ""}`.trim()} title="Eliminar">
          <HugeiconsIcon icon={Delete01Icon} size={16} />
        </button>
      ),
    },
  ];

  return (
    <>
      <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        <Enter index={0}>
          <PageHeader
            title="Disponibilidad"
            subtitle="Configura tus horarios de atención y bloquea días no disponibles."
            actions={
              <button type="button" onClick={openCreate} className={primaryAction}>
                <HugeiconsIcon icon={Add01Icon} size={16} />
                Nuevo horario
              </button>
            }
          />
        </Enter>

        <Enter index={1}>
          {isLoading && schedules.length === 0 ? (
            <div className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
              <Skeleton shape="rows" count={3} label="Cargando horarios" />
            </div>
          ) : loadError && schedules.length === 0 ? (
            <div className="rounded-surface border border-line bg-surface-elevated">
              <ErrorState title="No se pudieron cargar los horarios" onRetry={fetchSchedules} />
            </div>
          ) : schedules.length === 0 ? (
            <div className="rounded-surface border border-line bg-surface-elevated">
              <EmptyState
                title="Sin horarios"
                body="Define tus horarios de disponibilidad para recibir citas."
                action={
                  <button type="button" onClick={openCreate} className={primaryAction}>
                    <HugeiconsIcon icon={Add01Icon} size={16} /> Crear horario
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {schedules.map((schedule) => {
                const open = schedule.slots.filter((s: any) => s.isAvailable);
                return (
                  <section key={schedule.id} aria-label={schedule.name} className="rounded-surface border border-line bg-surface-elevated p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-text-primary">{schedule.name}</h2>
                        <p className="mt-0.5 text-xs text-text-secondary">{schedule.timezone}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => openEdit(schedule)} className={secondaryAction}>Editar</button>
                        <button type="button" onClick={() => handleDelete(schedule.id, schedule.name)} className={deleteAction} aria-label={`Eliminar ${schedule.name}`} title="Eliminar">
                          <HugeiconsIcon icon={Delete01Icon} size={16} />
                        </button>
                      </div>
                    </div>
                    {open.length === 0 ? (
                      <p className="text-sm text-text-secondary">Sin días disponibles configurados.</p>
                    ) : (
                      <dl className="divide-y divide-line">
                        {open.map((slot: any) => (
                          <div key={slot.id} className="flex items-center justify-between py-1.5 text-sm">
                            <dt className="font-medium text-text-primary">{DAYS.find((d) => d.id === slot.dayOfWeek)?.label}</dt>
                            <dd className="tabular-nums text-text-secondary">{slot.startTime} a {slot.endTime}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </Enter>

        <Enter index={2}>
          <div className="mt-8">
            <Block
              title="Horarios extendidos"
              action={{ label: "Agregar horario", onClick: openExtendedModal }}
            >
              <p className="px-4 pb-1 pt-3 text-sm text-text-secondary sm:px-5">Agrega disponibilidad adicional fuera de tu horario regular (ej. un sábado especial).</p>
              {extendedState === "loading" ? (
                <Skeleton shape="rows" count={2} label="Cargando horarios extendidos" />
              ) : extendedState === "error" ? (
                <ErrorState title="No se pudieron cargar los horarios extendidos" onRetry={fetchExtendedTimes} />
              ) : (
              <DataTable
                label="Horarios extendidos"
                columns={extendedColumns}
                rows={extendedTimes}
                getKey={(e) => e.id}
                mobileRow={(ext) => (
                  <div className="flex w-full min-w-0 items-center justify-between gap-3 py-1">
                    <span className="min-w-0">
                      <span className="block font-medium text-text-primary">{ext.title || "Horario extendido"}</span>
                      <span className="block text-xs text-text-secondary">{longDate(ext.date)}</span>
                      <span className="block text-xs font-semibold tabular-nums text-success">{ext.startTime} a {ext.endTime}</span>
                    </span>
                    <button type="button" onClick={() => handleDeleteExtended(ext.id)} className={deleteAction} aria-label={`Eliminar ${ext.title || "horario extendido"}`}>
                      <HugeiconsIcon icon={Delete01Icon} size={16} />
                    </button>
                  </div>
                )}
                empty={<EmptyState title="Sin horarios extendidos" body="Agrega uno para abrir disponibilidad fuera de tu horario regular." />}
              />
              )}
            </Block>
          </div>
        </Enter>

        <Enter index={3}>
          <div className="mt-6">
            <Block
              title="Excepciones y días especiales"
              action={{ label: "Bloquear fecha", onClick: openBlockedModal }}
            >
              <p className="px-4 pb-1 pt-3 text-sm text-text-secondary sm:px-5">Bloquea fechas u horas en las que no estarás disponible (ej. vacaciones).</p>
              {blockedState === "loading" ? (
                <Skeleton shape="rows" count={2} label="Cargando excepciones y días especiales" />
              ) : blockedState === "error" ? (
                <ErrorState title="No se pudieron cargar las excepciones" onRetry={fetchBlockedTimes} />
              ) : (
              <DataTable
                label="Excepciones y días especiales"
                columns={blockedColumns}
                rows={blockedTimes}
                getKey={(b) => b.id}
                mobileRow={(b) => (
                  <div className="flex w-full min-w-0 items-center justify-between gap-3 py-1">
                    <span className="min-w-0">
                      <span className="block font-medium text-text-primary">{b.title || "No especificado"}</span>
                      <span className="block text-xs text-text-secondary">{formatBlockedDate(b.start)} a {formatBlockedDate(b.end)}</span>
                    </span>
                    <button type="button" onClick={() => handleDeleteBlocked(b.id)} className={deleteAction} aria-label={`Eliminar bloqueo ${b.title || ""}`.trim()}>
                      <HugeiconsIcon icon={Delete01Icon} size={16} />
                    </button>
                  </div>
                )}
                empty={<EmptyState title="Sin excepciones" body="No tienes vacaciones ni bloqueos programados próximamente." />}
              />
              )}
            </Block>
          </div>
        </Enter>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4">
          <div ref={scheduleDialogRef} role="dialog" aria-modal="true" aria-label={editingSchedule ? "Editar horario" : "Nuevo horario"} className="bg-surface-elevated rounded-surface w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">
                {editingSchedule ? "Editar horario" : "Nuevo horario"}
              </h3>
              <button type="button" aria-label="Cerrar" onClick={() => setIsModalOpen(false)} className={iconAction}>
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="scheduleForm" onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="av-field-1" className="text-sm font-semibold text-text-primary">Nombre del horario *</label>
                  <input id="av-field-1"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm"
                    placeholder="Ej: Horario laboral"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="av-field-2" className="text-sm font-semibold text-text-primary">Zona horaria</label>
                  <select id="av-field-2"
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm"
                  >
                    {TIMEZONES.map((tz, i) => (
                      <option key={i} value={tz.value} disabled={tz.disabled}>{tz.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-semibold text-text-primary">Días y horarios disponibles</p>
                  {slots.map(slot => (
                    <div key={slot.dayOfWeek} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {/* La etiqueta entera es el área de toque; la casilla va dentro. */}
                      <label htmlFor={`day-${slot.dayOfWeek}`} data-check-ignore-tap className="flex min-h-11 w-28 cursor-pointer items-center gap-2 text-sm font-medium text-text-primary lg:min-h-9">
                        <input
                          type="checkbox"
                          id={`day-${slot.dayOfWeek}`}
                          checked={slot.isAvailable}
                          onChange={e => updateSlot(slot.dayOfWeek, "isAvailable", e.target.checked)}
                          className="size-4 rounded border-line accent-action-primary"
                        />
                        {DAYS.find(d => d.id === slot.dayOfWeek)?.label}
                      </label>
                      {slot.isAvailable && (
                        <>
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={e => updateSlot(slot.dayOfWeek, "startTime", e.target.value)}
                            className="min-h-11 px-2 rounded-control border border-line bg-surface-sidebar text-sm lg:min-h-9"
                          />
                          <span className="text-text-secondary text-sm">a</span>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={e => updateSlot(slot.dayOfWeek, "endTime", e.target.value)}
                            className="min-h-11 px-2 rounded-control border border-line bg-surface-sidebar text-sm lg:min-h-9"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-line flex justify-end gap-3 bg-surface-sidebar/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={secondaryAction}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="scheduleForm"
                disabled={isSubmitting}
                className={primaryAction}
              >
                {isSubmitting ? "Guardando..." : editingSchedule ? "Actualizar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BLOCKED TIME MODAL */}
      {isBlockedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4">
          <div ref={blockedDialogRef} role="dialog" aria-modal="true" aria-label="Bloquear fecha u hora" className="bg-surface-elevated rounded-surface w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">Bloquear fecha u hora</h3>
              <button type="button" aria-label="Cerrar" onClick={() => setIsBlockedModalOpen(false)} className={iconAction}>
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="blockedForm" onSubmit={handleCreateBlocked} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="av-field-3" className="text-sm font-semibold text-text-primary">Título / Motivo (Opcional)</label>
                  <input id="av-field-3"
                    value={blockedTitle}
                    onChange={e => setBlockedTitle(e.target.value)}
                    className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm"
                    placeholder="Ej: Consulta odontológica"
                  />
                </div>

                <div className="flex gap-4 border-b border-line pb-2">
                  <label data-check-ignore-tap className="flex min-h-11 items-center gap-2 cursor-pointer text-sm font-medium text-text-primary lg:min-h-9">
                    <input type="radio" checked={blockedType === "HOURS"} onChange={() => setBlockedType("HOURS")} className="size-4 accent-action-primary focus:ring-action-primary" />
                    <span>Por Horas</span>
                  </label>
                  <label data-check-ignore-tap className="flex min-h-11 items-center gap-2 cursor-pointer text-sm font-medium text-text-primary lg:min-h-9">
                    <input type="radio" checked={blockedType === "ALL_DAY"} onChange={() => setBlockedType("ALL_DAY")} className="size-4 accent-action-primary focus:ring-action-primary" />
                    <span>Días Completos</span>
                  </label>
                </div>

                {blockedType === "HOURS" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="av-field-4" className="text-sm font-semibold text-text-primary">Seleccionar Día *</label>
                      <input id="av-field-4" type="date" required value={hoursDate} onChange={e => setHoursDate(e.target.value)} className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="av-field-5" className="text-sm font-semibold text-text-primary">De (Hora) *</label>
                        <input id="av-field-5" type="time" required value={hoursStart} onChange={e => setHoursStart(e.target.value)} className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="av-field-6" className="text-sm font-semibold text-text-primary">A (Hora) *</label>
                        <input id="av-field-6" type="time" required value={hoursEnd} onChange={e => setHoursEnd(e.target.value)} className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm" />
                      </div>
                    </div>
                  </div>
                )}

                {blockedType === "ALL_DAY" && (
                  <div className="flex flex-col gap-3">
                    <label htmlFor="av-field-allday" className="text-sm font-semibold text-text-primary">Seleccionar Días *</label>
                    <div className="flex gap-2">
                      <input id="av-field-allday"
                        type="date"
                        value={allDayInput}
                        onChange={e => setAllDayInput(e.target.value)}
                        className="flex-1 min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm"
                      />
                      <button
                        type="button"
                        onClick={addAllDayDate}
                        disabled={!allDayInput}
                        className="min-h-11 shrink-0 px-4 rounded-control bg-action-primary text-action-primary-foreground text-sm font-semibold hover:bg-action-secondary disabled:opacity-40 transition-colors lg:min-h-10"
                      >
                        Agregar
                      </button>
                    </div>
                    {allDayDates.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {allDayDates.map(d => (
                          <span
                            key={d}
                            className="inline-flex items-center gap-1 rounded-full bg-surface-sidebar pl-3 text-text-primary text-xs font-medium"
                          >
                            {new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
                            <button
                              type="button"
                              onClick={() => removeAllDayDate(d)}
                              aria-label={`Quitar ${new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}`}
                              className="flex size-11 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-danger-soft hover:text-danger lg:size-8"
                            >
                              <HugeiconsIcon icon={Cancel01Icon} size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {allDayDates.length === 0 && (
                      <p className="text-xs text-text-secondary">Agrega los días que quieres bloquear.</p>
                    )}
                  </div>
                )}

                <p className="text-xs text-text-secondary leading-relaxed">
                  Se guardarán en la zona horaria de tu organización ({orgTimezone}).
                </p>
              </form>
            </div>
            <div className="p-4 border-t border-line flex justify-end gap-3 bg-surface-sidebar/50">
              <button
                type="button"
                onClick={() => setIsBlockedModalOpen(false)}
                className={secondaryAction}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="blockedForm"
                disabled={isSubmittingBlocked}
                className={primaryAction}
              >
                {isSubmittingBlocked ? "Guardando..." : "Bloquear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTENDED AVAILABILITY MODAL */}
      {isExtendedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4">
          <div ref={extendedDialogRef} role="dialog" aria-modal="true" aria-label="Agregar horario extendido" className="bg-surface-elevated rounded-surface w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">Agregar horario extendido</h3>
              <button type="button" aria-label="Cerrar" onClick={() => setIsExtendedModalOpen(false)} className={iconAction}>
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="extendedForm" onSubmit={handleCreateExtended} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="av-field-7" className="text-sm font-semibold text-text-primary">Título / Motivo (Opcional)</label>
                  <input id="av-field-7"
                    value={extendedTitle}
                    onChange={e => setExtendedTitle(e.target.value)}
                    className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm"
                    placeholder="Ej: Sábado especial, Atención fin de año"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="av-field-8" className="text-sm font-semibold text-text-primary">Fecha *</label>
                  <input id="av-field-8"
                    type="date"
                    required
                    value={extendedDate}
                    onChange={e => setExtendedDate(e.target.value)}
                    className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="av-field-9" className="text-sm font-semibold text-text-primary">De (Hora) *</label>
                    <input id="av-field-9"
                      type="time"
                      required
                      value={extendedStart}
                      onChange={e => setExtendedStart(e.target.value)}
                      className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="av-field-10" className="text-sm font-semibold text-text-primary">A (Hora) *</label>
                    <input id="av-field-10"
                      type="time"
                      required
                      value={extendedEnd}
                      onChange={e => setExtendedEnd(e.target.value)}
                      className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Los leads podrán agendar citas en este horario adicional, fuera de tu horario regular.
                </p>
              </form>
            </div>
            <div className="p-4 border-t border-line flex justify-end gap-3 bg-surface-sidebar/50">
              <button
                type="button"
                onClick={() => setIsExtendedModalOpen(false)}
                className={secondaryAction}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="extendedForm"
                disabled={isSubmittingExtended}
                className={primaryAction}
              >
                {isSubmittingExtended ? "Guardando..." : "Agregar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
