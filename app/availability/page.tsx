"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import { Clock, Plus, Trash2, XCircle } from "lucide-react";
import { useToast } from "@/src/context/ToastContext";

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
  const { addToast, showConfirm } = useToast();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/Mexico_City");
  const [slots, setSlots] = useState<SlotState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchSchedules(); }, []);

  const fetchSchedules = async () => {
    setIsLoading(true);
    const res = await fetch("/api/availability");
    if (res.ok) setSchedules(await res.json());
    setIsLoading(false);
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
    const ok = await showConfirm(`¿Eliminar el horario '${scheduleName}'?`, {
      title: "Eliminar horario",
      confirmLabel: "Eliminar",
      isDanger: true,
    });
    if (!ok) return;
    await fetch(`/api/availability/${id}`, { method: "DELETE" });
    fetchSchedules();
  };

  return (
    <div className="flex h-screen bg-background font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 py-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <Clock className="text-gray-400" size={28} />
              Horarios de Disponibilidad
            </h1>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Plus size={18} /> Nuevo Horario
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <Clock className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Sin horarios</h3>
              <p className="text-gray-500 text-sm mb-4">Define tus horarios de disponibilidad para recibir citas.</p>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors"
              >
                <Plus size={16} /> Crear Horario
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {schedules.map(schedule => (
                <div key={schedule.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{schedule.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{schedule.timezone}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(schedule.id, schedule.name)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => openEdit(schedule)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {schedule.slots.filter((s: any) => s.isAvailable).map((slot: any) => (
                      <div key={slot.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 w-24">
                          {DAYS.find(d => d.id === slot.dayOfWeek)?.label}
                        </span>
                        <span className="text-gray-500">{slot.startTime} – {slot.endTime}</span>
                      </div>
                    ))}
                    {schedule.slots.filter((s: any) => s.isAvailable).length === 0 && (
                      <p className="text-sm text-gray-400">Sin días disponibles configurados.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editingSchedule ? "Editar Horario" : "Nuevo Horario"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="scheduleForm" onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Nombre del horario *</label>
                  <input
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm"
                    placeholder="Ej: Horario laboral"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Zona horaria</label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm"
                  >
                    {TIMEZONES.map((tz, i) => (
                      <option key={i} value={tz.value} disabled={tz.disabled}>{tz.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-gray-700">Días y horarios disponibles</label>
                  {slots.map(slot => (
                    <div key={slot.dayOfWeek} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`day-${slot.dayOfWeek}`}
                        checked={slot.isAvailable}
                        onChange={e => updateSlot(slot.dayOfWeek, "isAvailable", e.target.checked)}
                        className="w-4 h-4 rounded text-gray-900 border-gray-300"
                      />
                      <label
                        htmlFor={`day-${slot.dayOfWeek}`}
                        className="text-sm font-medium text-gray-700 w-24"
                      >
                        {DAYS.find(d => d.id === slot.dayOfWeek)?.label}
                      </label>
                      {slot.isAvailable && (
                        <>
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={e => updateSlot(slot.dayOfWeek, "startTime", e.target.value)}
                            className="px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                          />
                          <span className="text-gray-400 text-sm">–</span>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={e => updateSlot(slot.dayOfWeek, "endTime", e.target.value)}
                            className="px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-gray-50 flex justify-end gap-3 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="scheduleForm"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50"
              >
                {isSubmitting ? "Guardando..." : editingSchedule ? "Actualizar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
