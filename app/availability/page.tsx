"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, Add01Icon, Delete01Icon, Cancel01Icon, CalendarOffIcon, CalendarCheckIn01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";

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
  const [extendedTitle, setExtendedTitle] = useState("");
  const [extendedDate, setExtendedDate] = useState("");
  const [extendedStart, setExtendedStart] = useState("09:00");
  const [extendedEnd, setExtendedEnd] = useState("14:00");
  const [isSubmittingExtended, setIsSubmittingExtended] = useState(false);

  useEffect(() => {
    resetState();
    setConfig({
      title: "Disponibilidad",
      addButton: { label: "Nuevo horario", onClick: openCreate },
    });
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
    const res = await fetch("/api/availability");
    if (res.ok) setSchedules(await res.json());
    setIsLoading(false);
  };

  const fetchBlockedTimes = async () => {
    const res = await fetch("/api/availability/blocked");
    if (res.ok) setBlockedTimes(await res.json());
  };

  const fetchExtendedTimes = async () => {
    const res = await fetch("/api/availability/extended");
    if (res.ok) setExtendedTimes(await res.json());
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

  return (
    <>
      <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-6 py-6 bg-surface-app">
          <div className="mb-6">
            <p className="text-sm text-text-secondary">Configura tus horarios de atención y bloquea días no disponibles.</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin"></div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg border border-border-subtle">
              <HugeiconsIcon icon={Clock01Icon} size={48} color="#d1d5db" className="mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-1">Sin horarios</h3>
              <p className="text-text-secondary text-sm mb-4">Define tus horarios de disponibilidad para recibir citas.</p>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 text-sm font-medium text-text-primary bg-gray-100 hover:bg-nav-active px-4 py-2 rounded-lg transition-colors"
              >
                <HugeiconsIcon icon={Add01Icon} size={16} /> Crear Horario
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {schedules.map(schedule => (
                <div key={schedule.id} className="bg-white border border-border-subtle rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-text-primary">{schedule.name}</h3>
                      <p className="text-xs text-text-secondary mt-0.5">{schedule.timezone}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(schedule.id, schedule.name)}
                        className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <HugeiconsIcon icon={Delete01Icon} size={16} />
                      </button>
                      <button
                        onClick={() => openEdit(schedule)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-primary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {schedule.slots.filter((s: any) => s.isAvailable).map((slot: any) => (
                      <div key={slot.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-text-primary w-24">
                          {DAYS.find(d => d.id === slot.dayOfWeek)?.label}
                        </span>
                        <span className="text-text-secondary">{slot.startTime} – {slot.endTime}</span>
                      </div>
                    ))}
                    {schedule.slots.filter((s: any) => s.isAvailable).length === 0 && (
                      <p className="text-sm text-text-secondary">Sin días disponibles configurados.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Extended Availability Section */}
          <div className="mt-16 mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                <HugeiconsIcon icon={CalendarCheckIn01Icon} size={24} color="#22c55e" />
                Horarios Extendidos
              </h2>
              <p className="text-sm text-text-secondary mt-1">Agrega disponibilidad adicional fuera de tu horario regular (Ej: Sábado especial)</p>
            </div>
            <button
              onClick={openExtendedModal}
              className="flex items-center gap-2 bg-white border border-border-subtle hover:bg-surface-sidebar text-text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <HugeiconsIcon icon={Add01Icon} size={18} /> Agregar Horario
            </button>
          </div>

          {!isLoading && extendedTimes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-border-subtle mb-12">
              <HugeiconsIcon icon={CalendarCheckIn01Icon} size={40} color="#d1d5db" className="mx-auto mb-3" />
              <p className="text-text-secondary text-sm">No tienes horarios extendidos. Agrega uno para abrir disponibilidad fuera de tu horario regular.</p>
            </div>
          ) : extendedTimes.length > 0 ? (
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden mb-12">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-sidebar/50">
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Motivo</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Horario</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {extendedTimes.map(ext => (
                    <tr key={ext.id} className="hover:bg-surface-sidebar/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                          <span className="font-medium text-text-primary">{ext.title || "Horario extendido"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-secondary">{new Date(ext.date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}</td>
                      <td className="px-6 py-4 text-text-secondary">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs font-semibold">
                          {ext.startTime} – {ext.endTime}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteExtended(ext.id)}
                          className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <HugeiconsIcon icon={Delete01Icon} size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Blocked Times Section */}
          <div className="mt-16 mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                <HugeiconsIcon icon={CalendarOffIcon} size={24} color="#9ca3af" />
                Excepciones y Días Especiales
              </h2>
              <p className="text-sm text-text-secondary mt-1">Bloquea fechas u horas específicas donde no estarás disponible (Ej: Vacaciones)</p>
            </div>
            <button
              onClick={openBlockedModal}
              className="flex items-center gap-2 bg-white border border-border-subtle hover:bg-surface-sidebar text-text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <HugeiconsIcon icon={Add01Icon} size={18} /> Bloquear Fecha
            </button>
          </div>

          {!isLoading && blockedTimes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-border-subtle">
              <HugeiconsIcon icon={CalendarOffIcon} size={40} color="#d1d5db" className="mx-auto mb-3" />
              <p className="text-text-secondary text-sm">No tienes ninguna excursión o vacación programada próximamente.</p>
            </div>
          ) : (
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden mb-12">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-sidebar/50">
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Motivo</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Inicia</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Finaliza</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {blockedTimes.map(blocked => (
                    <tr key={blocked.id} className="hover:bg-surface-sidebar/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-text-primary">{blocked.title || "No especificado"}</td>
                      <td className="px-6 py-4 text-text-secondary">{formatBlockedDate(blocked.start)}</td>
                      <td className="px-6 py-4 text-text-secondary">{formatBlockedDate(blocked.end)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteBlocked(blocked.id)}
                          className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <HugeiconsIcon icon={Delete01Icon} size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">
                {editingSchedule ? "Editar Horario" : "Nuevo Horario"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-text-secondary">
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="scheduleForm" onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Nombre del horario *</label>
                  <input
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                    placeholder="Ej: Horario laboral"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Zona horaria</label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                  >
                    {TIMEZONES.map((tz, i) => (
                      <option key={i} value={tz.value} disabled={tz.disabled}>{tz.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-text-primary">Días y horarios disponibles</label>
                  {slots.map(slot => (
                    <div key={slot.dayOfWeek} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`day-${slot.dayOfWeek}`}
                        checked={slot.isAvailable}
                        onChange={e => updateSlot(slot.dayOfWeek, "isAvailable", e.target.checked)}
                        className="w-4 h-4 rounded text-text-primary border-border-subtle"
                      />
                      <label
                        htmlFor={`day-${slot.dayOfWeek}`}
                        className="text-sm font-medium text-text-primary w-24"
                      >
                        {DAYS.find(d => d.id === slot.dayOfWeek)?.label}
                      </label>
                      {slot.isAvailable && (
                        <>
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={e => updateSlot(slot.dayOfWeek, "startTime", e.target.value)}
                            className="px-2 py-1 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                          />
                          <span className="text-text-secondary text-sm">–</span>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={e => updateSlot(slot.dayOfWeek, "endTime", e.target.value)}
                            className="px-2 py-1 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-border-subtle flex justify-end gap-3 bg-surface-sidebar/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-primary hover:bg-nav-hover"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="scheduleForm"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-action-primary-foreground bg-action-primary hover:opacity-90 disabled:opacity-50"
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
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">Bloquear Fecha / Hora</h3>
              <button onClick={() => setIsBlockedModalOpen(false)} className="text-text-secondary hover:text-text-secondary">
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="blockedForm" onSubmit={handleCreateBlocked} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Título / Motivo (Opcional)</label>
                  <input
                    value={blockedTitle}
                    onChange={e => setBlockedTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                    placeholder="Ej: Consulta odontológica"
                  />
                </div>

                <div className="flex gap-4 border-b border-border-subtle pb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-primary">
                    <input type="radio" checked={blockedType === "HOURS"} onChange={() => setBlockedType("HOURS")} className="text-text-primary focus:ring-gray-900" />
                    <span>Por Horas</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-primary">
                    <input type="radio" checked={blockedType === "ALL_DAY"} onChange={() => setBlockedType("ALL_DAY")} className="text-text-primary focus:ring-gray-900" />
                    <span>Días Completos</span>
                  </label>
                </div>

                {blockedType === "HOURS" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-text-primary">Seleccionar Día *</label>
                      <input type="date" required value={hoursDate} onChange={e => setHoursDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-text-primary">De (Hora) *</label>
                        <input type="time" required value={hoursStart} onChange={e => setHoursStart(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-text-primary">A (Hora) *</label>
                        <input type="time" required value={hoursEnd} onChange={e => setHoursEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm" />
                      </div>
                    </div>
                  </div>
                )}

                {blockedType === "ALL_DAY" && (
                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-semibold text-text-primary">Seleccionar Días *</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={allDayInput}
                        onChange={e => setAllDayInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                      />
                      <button
                        type="button"
                        onClick={addAllDayDate}
                        disabled={!allDayInput}
                        className="px-3 py-2 rounded-lg bg-action-primary text-action-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-colors"
                      >
                        Agregar
                      </button>
                    </div>
                    {allDayDates.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {allDayDates.map(d => (
                          <span
                            key={d}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-text-primary text-xs font-medium"
                          >
                            {new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
                            <button
                              type="button"
                              onClick={() => removeAllDayDate(d)}
                              className="text-text-secondary hover:text-red-500 transition-colors"
                            >
                              ×
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
            <div className="p-4 border-t border-border-subtle flex justify-end gap-3 bg-surface-sidebar/50">
              <button
                type="button"
                onClick={() => setIsBlockedModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-primary hover:bg-nav-hover"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="blockedForm"
                disabled={isSubmittingBlocked}
                className="px-4 py-2 rounded-lg text-sm font-medium text-action-primary-foreground bg-action-primary hover:opacity-90 disabled:opacity-50"
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
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">Agregar Horario Extendido</h3>
              <button onClick={() => setIsExtendedModalOpen(false)} className="text-text-secondary hover:text-text-secondary">
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="extendedForm" onSubmit={handleCreateExtended} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Título / Motivo (Opcional)</label>
                  <input
                    value={extendedTitle}
                    onChange={e => setExtendedTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                    placeholder="Ej: Sábado especial, Atención fin de año"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={extendedDate}
                    onChange={e => setExtendedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">De (Hora) *</label>
                    <input
                      type="time"
                      required
                      value={extendedStart}
                      onChange={e => setExtendedStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">A (Hora) *</label>
                    <input
                      type="time"
                      required
                      value={extendedEnd}
                      onChange={e => setExtendedEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Los leads podrán agendar citas en este horario adicional, fuera de tu horario regular.
                </p>
              </form>
            </div>
            <div className="p-4 border-t border-border-subtle flex justify-end gap-3 bg-surface-sidebar/50">
              <button
                type="button"
                onClick={() => setIsExtendedModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-primary hover:bg-nav-hover"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="extendedForm"
                disabled={isSubmittingExtended}
                className="px-4 py-2 rounded-lg text-sm font-medium text-action-primary-foreground bg-action-primary hover:opacity-90 disabled:opacity-50"
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
