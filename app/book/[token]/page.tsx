"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon, ArrowLeft01Icon, ArrowRight01Icon,
  Clock01Icon, Location01Icon, Calendar01Icon, GlobeIcon,
  ArrowDown01Icon, Search01Icon,
} from "@hugeicons/core-free-icons";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const TIMEZONE_LIST = [
  { group: "México", tz: "America/Mexico_City", label: "Ciudad de México (UTC-6)" },
  { group: "México", tz: "America/Monterrey", label: "Monterrey (UTC-6)" },
  { group: "México", tz: "America/Cancun", label: "Cancún (UTC-5)" },
  { group: "México", tz: "America/Hermosillo", label: "Hermosillo (UTC-7)" },
  { group: "México", tz: "America/Tijuana", label: "Tijuana (UTC-8)" },
  { group: "Estados Unidos", tz: "America/New_York", label: "Nueva York (ET)" },
  { group: "Estados Unidos", tz: "America/Chicago", label: "Chicago (CT)" },
  { group: "Estados Unidos", tz: "America/Los_Angeles", label: "Los Ángeles (PT)" },
  { group: "Latinoamérica", tz: "America/Bogota", label: "Bogotá (UTC-5)" },
  { group: "Latinoamérica", tz: "America/Lima", label: "Lima (UTC-5)" },
  { group: "Latinoamérica", tz: "America/Argentina/Buenos_Aires", label: "Buenos Aires (UTC-3)" },
  { group: "Europa", tz: "Europe/Madrid", label: "Madrid (UTC+1)" },
  { group: "Europa", tz: "Europe/London", label: "Londres (UTC+0)" },
];

function getUtcOffset(tz: string): string {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "short" }).formatToParts(now);
    return parts.find(p => p.type === "timeZoneName")?.value || tz;
  } catch { return tz; }
}

export default function BookPage() {
  const { token } = useParams() as { token: string };

  // Data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deal, setDeal] = useState<any>(null);
  const [appointmentTypes, setAppointmentTypes] = useState<any[]>([]);

  // Steps: type → calendar → form → success
  const [step, setStep] = useState<"type" | "calendar" | "form" | "success">("type");
  const [selectedType, setSelectedType] = useState<any>(null);

  // Calendar
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Timezone
  const [timezone, setTimezone] = useState("America/Mexico_City");
  const [showTzPicker, setShowTzPicker] = useState(false);
  const [tzSearch, setTzSearch] = useState("");
  const tzPickerRef = useRef<HTMLDivElement>(null);

  // Form
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");

  // Auto-detect timezone
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {}
  }, []);

  // Load deal data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/book/${token}`);
        if (!res.ok) { setError("Este link de agendamiento no es válido."); return; }
        const data = await res.json();
        setDeal(data.deal);
        setAppointmentTypes(data.appointmentTypes);
        // Pre-fill guest from deal contact
        if (data.deal?.contact) {
          const c = data.deal.contact;
          setGuestName(`${c.firstName || ""} ${c.lastName || ""}`.trim());
          setGuestEmail(c.email || "");
          setGuestPhone(c.phone || "");
        }
        // Auto-select if only 1 type
        if (data.appointmentTypes.length === 1) {
          setSelectedType(data.appointmentTypes[0]);
          setStep("calendar");
        }
      } catch {
        setError("No se pudo cargar la información.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Close tz picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tzPickerRef.current && !tzPickerRef.current.contains(e.target as Node)) setShowTzPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Re-fetch slots when tz changes
  useEffect(() => {
    if (selectedDate && selectedType) fetchSlots(selectedDate);
  }, [timezone]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const fetchSlots = async (date: Date) => {
    if (!selectedType) return;
    setLoadingSlots(true);
    setAvailableSlots([]);
    setSelectedSlot(null);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    try {
      const res = await fetch(`/api/public/appointment-types/${selectedType.id}/slots?date=${dateStr}&tz=${encodeURIComponent(timezone)}`);
      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch {
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: Date) => { setSelectedDate(date); fetchSlots(date); };
  const handleSlotSelect = (slot: string) => { setSelectedSlot(slot); setStep("form"); };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedType) return;
    setIsBooking(true);
    setBookingError("");
    try {
      const res = await fetch(`/api/public/book/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentTypeId: selectedType.id,
          startTime: selectedSlot,
          guestName, guestEmail, guestPhone, notes, timezone,
        }),
      });
      if (res.ok) {
        setStep("success");
      } else {
        const d = await res.json();
        setBookingError(d.error || "Error al agendar la cita.");
      }
    } catch {
      setBookingError("Error de conexión.");
    } finally {
      setIsBooking(false);
    }
  };

  const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();

  const isDateAvailable = (date: Date) => {
    if (!selectedType?.schedule?.slots) return false;
    const dayOfWeek = date.getDay();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + (selectedType.maxAdvanceDays || 30));
    return date >= today && date <= maxDate && selectedType.schedule.slots.some((s: any) => s.dayOfWeek === dayOfWeek && s.isAvailable);
  };

  const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const formatSlot = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: timezone });
    } catch {
      return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });
    }
  };

  const formatDate = (date: Date) => `${DAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
  const tzLabel = TIMEZONE_LIST.find(t => t.tz === timezone)?.label || getUtcOffset(timezone);
  const filteredTz = TIMEZONE_LIST.filter(t =>
    t.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
    t.tz.toLowerCase().includes(tzSearch.toLowerCase())
  );
  const tzGroups = [...new Set(filteredTz.map(t => t.group))];

  // ─── Renders ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-red-100 max-w-md w-full text-center">
        <p className="text-red-500 font-medium">{error}</p>
      </div>
    </div>
  );

  if (step === "success") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 max-w-md w-full text-center flex flex-col items-center gap-4">
        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={56} color="#22c55e" />
        <h2 className="text-2xl font-bold text-gray-900">¡Cita Confirmada!</h2>
        <p className="text-gray-600">
          Tu cita ha sido agendada exitosamente. Recibirás una confirmación en <strong>{guestEmail}</strong>.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 w-full text-left mt-2 flex flex-col gap-1">
          <p className="text-sm font-semibold text-gray-700">{selectedType?.name}</p>
          <p className="text-sm text-gray-500">{selectedDate && formatDate(selectedDate)}</p>
          <p className="text-sm text-gray-500">{selectedSlot && formatSlot(selectedSlot)} · {selectedType?.duration} min</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><HugeiconsIcon icon={GlobeIcon} size={11} /> {tzLabel}</p>
        </div>
      </div>
    </div>
  );

  const daysInMonth = selectedType ? getDaysInMonth(currentMonth) : 0;
  const firstDay = selectedType ? getFirstDayOfMonth(currentMonth) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:py-10">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col md:flex-row">

            {/* Left panel */}
            <div className="md:w-72 p-8 border-b md:border-b-0 md:border-r border-gray-100">
              {selectedType ? (
                <>
                  <div className="w-10 h-10 rounded-full mb-4" style={{ backgroundColor: selectedType.color || "#3B82F6" }} />
                  <h1 className="text-xl font-bold text-gray-900 mb-2">{selectedType.name}</h1>
                  {selectedType.description && (
                    <p className="text-gray-500 text-sm mb-4">{selectedType.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                    <HugeiconsIcon icon={Clock01Icon} size={16} />
                    <span>{selectedType.duration} minutos</span>
                  </div>
                  {selectedType.location && (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <HugeiconsIcon icon={Location01Icon} size={16} />
                      <span>{selectedType.location}</span>
                    </div>
                  )}
                  {appointmentTypes.length > 1 && step === "calendar" && (
                    <button
                      onClick={() => { setStep("type"); setSelectedType(null); setSelectedDate(null); setSelectedSlot(null); }}
                      className="mt-4 text-xs font-semibold text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
                    >
                      Cambiar tipo de cita
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-gray-900 mb-4" />
                  <h1 className="text-xl font-bold text-gray-900 mb-2">Agendar cita</h1>
                  <p className="text-gray-500 text-sm">Selecciona el tipo de cita para agendar.</p>
                </>
              )}
            </div>

            {/* Right panel */}
            <div className="flex-1 p-8">
              {/* Step: select type */}
              {step === "type" && (
                <div className="flex flex-col gap-4">
                  <div className="mb-2">
                    {deal?.contact?.firstName ? (
                      <h2 className="text-2xl font-bold text-gray-900">¡Hola {deal.contact.firstName}! 👋</h2>
                    ) : (
                      <h2 className="text-2xl font-bold text-gray-900">¡Bienvenido! 👋</h2>
                    )}
                    <p className="text-gray-500 mt-1 text-sm">
                      {deal?.title ? (
                        <>Estás agendando una cita para: <strong className="text-gray-700">{deal.title}</strong>. Por favor selecciona el tipo de cita.</>
                      ) : (
                        "Por favor selecciona el tipo de cita que deseas agendar."
                      )}
                    </p>
                  </div>
                  {appointmentTypes.length === 0 ? (
                    <p className="text-gray-400 text-sm">No hay tipos de cita disponibles.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {appointmentTypes.map((t: any) => (
                        <button
                          key={t.id}
                          onClick={() => { setSelectedType(t); setStep("calendar"); }}
                          className="flex items-center gap-4 w-full text-left px-5 py-4 rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all group"
                        >
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color || "#3B82F6" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 group-hover:text-gray-700">{t.name}</p>
                            {t.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.description}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                            <HugeiconsIcon icon={Clock01Icon} size={13} />
                            <span>{t.duration} min</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step: calendar */}
              {step === "calendar" && selectedType && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Calendar */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900">{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h2>
                        <div className="flex gap-1">
                          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><HugeiconsIcon icon={ArrowLeft01Icon} size={18} /></button>
                          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><HugeiconsIcon icon={ArrowRight01Icon} size={18} /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>)}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
                        {Array(daysInMonth).fill(null).map((_, i) => {
                          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
                          const available = isDateAvailable(date);
                          const isSelected = selectedDate?.toDateString() === date.toDateString();
                          return (
                            <button
                              key={i}
                              onClick={() => available && handleDateSelect(date)}
                              disabled={!available}
                              className={`aspect-square rounded-full text-sm font-medium transition-colors
                                ${isSelected ? "bg-gray-900 text-white" : ""}
                                ${available && !isSelected ? "hover:bg-gray-100 text-gray-900" : ""}
                                ${!available ? "text-gray-300 cursor-default" : ""}
                              `}
                            >
                              {i + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Slots */}
                    {selectedDate && (
                      <div className="lg:w-52">
                        <h3 className="font-semibold text-gray-900 mb-4">{formatDate(selectedDate)}</h3>
                        {loadingSlots ? (
                          <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                          </div>
                        ) : availableSlots.length === 0 ? (
                          <p className="text-sm text-gray-400">No hay horarios disponibles.</p>
                        ) : (
                          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                            {availableSlots.map(slot => (
                              <button
                                key={slot}
                                onClick={() => handleSlotSelect(slot)}
                                className="py-2.5 px-4 rounded-xl border border-gray-200 hover:border-gray-900 hover:bg-gray-900 hover:text-white text-sm font-medium text-gray-700 transition-colors text-center"
                              >
                                {formatSlot(slot)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Timezone */}
                  <div className="relative" ref={tzPickerRef}>
                    <button
                      type="button"
                      onClick={() => { setShowTzPicker(p => !p); setTzSearch(""); }}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      <HugeiconsIcon icon={GlobeIcon} size={15} color="#9ca3af" />
                      <span>{tzLabel}</span>
                      <HugeiconsIcon icon={ArrowDown01Icon} size={14} color="#9ca3af" className={`transition-transform ${showTzPicker ? "rotate-180" : ""}`} />
                    </button>
                    {showTzPicker && (
                      <div className="absolute bottom-8 left-0 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="p-3 border-b border-gray-100">
                          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                            <HugeiconsIcon icon={Search01Icon} size={14} color="#9ca3af" className="shrink-0" />
                            <input
                              autoFocus type="text" placeholder="Buscar zona horaria..."
                              value={tzSearch} onChange={e => setTzSearch(e.target.value)}
                              className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                            />
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {tzGroups.map(group => (
                            <div key={group}>
                              <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{group}</p>
                              {filteredTz.filter(t => t.group === group).map(t => (
                                <button key={t.tz} type="button"
                                  onClick={() => { setTimezone(t.tz); setShowTzPicker(false); }}
                                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${timezone === t.tz ? "text-gray-900 font-semibold" : "text-gray-600"}`}
                                >
                                  <span>{t.label}</span>
                                  {timezone === t.tz && <div className="w-2 h-2 rounded-full bg-gray-900" />}
                                </button>
                              ))}
                            </div>
                          ))}
                          {filteredTz.length === 0 && <p className="px-4 py-6 text-sm text-gray-400 text-center">Sin resultados</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step: form */}
              {step === "form" && (
                <div className="max-w-md">
                  <button onClick={() => setStep("calendar")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={16} /> Volver al calendario
                  </button>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Confirma tu cita</h2>
                  <div className="flex flex-col gap-1 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <HugeiconsIcon icon={Calendar01Icon} size={14} />
                      <span>{selectedDate && formatDate(selectedDate)}{selectedSlot && ` · ${formatSlot(selectedSlot)}`}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <HugeiconsIcon icon={GlobeIcon} size={12} />
                      <span>{tzLabel}</span>
                    </div>
                  </div>

                  {bookingError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                      {bookingError}
                    </div>
                  )}

                  <form onSubmit={handleBook} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700">Nombre completo *</label>
                      <input type="text" required value={guestName} onChange={e => setGuestName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 text-sm" placeholder="Tu nombre" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700">Correo electrónico *</label>
                      <input type="email" required value={guestEmail} onChange={e => setGuestEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 text-sm" placeholder="tu@email.com" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700">Teléfono (opcional)</label>
                      <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 text-sm" placeholder="+52 55 1234 5678" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700">Notas adicionales</label>
                      <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 text-sm resize-none" placeholder="¿Algún tema que quieras tratar?" />
                    </div>
                    <button type="submit" disabled={isBooking} className="w-full py-3 rounded-xl font-bold text-white bg-gray-900 hover:bg-gray-800 transition-colors disabled:opacity-50 mt-2">
                      {isBooking ? "Agendando..." : "Confirmar Cita"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Desarrollado por Noxy</p>
      </div>
    </div>
  );
}
