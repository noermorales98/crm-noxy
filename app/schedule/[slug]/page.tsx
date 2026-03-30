"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, MapPin, Calendar, Globe, ChevronDown, Search } from "lucide-react";
import { useToast } from "@/src/context/ToastContext";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const TIMEZONE_LIST = [
  { group: "México",          tz: "America/Mexico_City",              label: "Ciudad de México (UTC-6)" },
  { group: "México",          tz: "America/Monterrey",                label: "Monterrey (UTC-6)" },
  { group: "México",          tz: "America/Merida",                   label: "Mérida / Yucatán (UTC-6)" },
  { group: "México",          tz: "America/Cancun",                   label: "Cancún (UTC-5, sin cambio horario)" },
  { group: "México",          tz: "America/Hermosillo",               label: "Hermosillo / Sonora (UTC-7, sin cambio)" },
  { group: "México",          tz: "America/Chihuahua",                label: "Chihuahua (UTC-6/-7)" },
  { group: "México",          tz: "America/Mazatlan",                 label: "Mazatlán / La Paz (UTC-7)" },
  { group: "México",          tz: "America/Tijuana",                  label: "Tijuana / Mexicali (UTC-8)" },
  { group: "Estados Unidos",  tz: "America/New_York",                 label: "Nueva York / Miami (ET)" },
  { group: "Estados Unidos",  tz: "America/Chicago",                  label: "Chicago / Houston (CT)" },
  { group: "Estados Unidos",  tz: "America/Denver",                   label: "Denver / Phoenix (MT)" },
  { group: "Estados Unidos",  tz: "America/Los_Angeles",              label: "Los Ángeles / Seattle (PT)" },
  { group: "Estados Unidos",  tz: "America/Anchorage",                label: "Alaska" },
  { group: "Estados Unidos",  tz: "Pacific/Honolulu",                 label: "Hawái" },
  { group: "Latinoamérica",   tz: "America/Bogota",                   label: "Bogotá (UTC-5)" },
  { group: "Latinoamérica",   tz: "America/Lima",                     label: "Lima (UTC-5)" },
  { group: "Latinoamérica",   tz: "America/Santiago",                 label: "Santiago (UTC-3/-4)" },
  { group: "Latinoamérica",   tz: "America/Argentina/Buenos_Aires",   label: "Buenos Aires (UTC-3)" },
  { group: "Latinoamérica",   tz: "America/Sao_Paulo",                label: "São Paulo (UTC-3)" },
  { group: "Europa",          tz: "Europe/Madrid",                    label: "Madrid (UTC+1/+2)" },
  { group: "Europa",          tz: "Europe/London",                    label: "Londres (UTC+0/+1)" },
  { group: "Europa",          tz: "Europe/Paris",                     label: "París / Berlín (UTC+1/+2)" },
];

function getUtcOffset(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "short" });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find(p => p.type === "timeZoneName");
    return tzPart?.value || tz;
  } catch {
    return tz;
  }
}

export default function SchedulePage() {
  const { addToast } = useToast();
  const { slug } = useParams() as { slug: string };
  const [appointmentType, setAppointmentType] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timezone — auto-detected, user can override
  const [timezone, setTimezone] = useState("America/Mexico_City");
  const [showTzPicker, setShowTzPicker] = useState(false);
  const [tzSearch, setTzSearch] = useState("");
  const tzPickerRef = useRef<HTMLDivElement>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Booking form
  const [step, setStep] = useState<"calendar" | "form" | "success">("calendar");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  // Auto-detect timezone on mount
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAppointmentType();
  }, [slug]);

  // Close tz picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tzPickerRef.current && !tzPickerRef.current.contains(e.target as Node)) {
        setShowTzPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Re-fetch slots when timezone changes and a date is selected
  useEffect(() => {
    if (selectedDate && appointmentType) {
      fetchSlots(selectedDate);
    }
  }, [timezone]);

  const fetchAppointmentType = async () => {
    try {
      const res = await fetch(`/api/public/appointment-types/${slug}`);
      if (!res.ok) { setError("Tipo de cita no encontrado."); return; }
      const data = await res.json();
      setAppointmentType(data);
    } catch {
      setError("No se pudo cargar la información.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSlots = async (date: Date) => {
    if (!appointmentType) return;
    setLoadingSlots(true);
    setAvailableSlots([]);
    setSelectedSlot(null);
    // Send date as the local calendar date the user sees
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    try {
      const res = await fetch(`/api/public/appointment-types/${appointmentType.id}/slots?date=${dateStr}&tz=${encodeURIComponent(timezone)}`);
      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch {
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    fetchSlots(date);
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setStep("form");
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !appointmentType) return;
    setIsBooking(true);
    try {
      const res = await fetch(`/api/public/appointment-types/${appointmentType.id}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime: selectedSlot, guestName, guestEmail, guestPhone, notes, timezone })
      });
      if (res.ok) {
        setStep("success");
      } else {
        const d = await res.json();
        addToast(d.error || "Error al agendar", "error");
      }
    } catch {
      addToast("Error de conexión.", "error");
    } finally {
      setIsBooking(false);
    }
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const isDateAvailable = (date: Date) => {
    if (!appointmentType?.schedule?.slots) return false;
    const dayOfWeek = date.getDay();
    const today = new Date(); today.setHours(0,0,0,0);
    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + (appointmentType.maxAdvanceDays || 30));
    return date >= today && date <= maxDate && appointmentType.schedule.slots.some((s: any) => s.dayOfWeek === dayOfWeek && s.isAvailable);
  };

  const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth()-1, 1));
  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth()+1, 1));

  // Format slot in the user's selected timezone
  const formatSlot = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("es-MX", {
        hour: "2-digit", minute: "2-digit", hour12: true, timeZone: timezone
      });
    } catch {
      return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });
    }
  };

  const formatDate = (date: Date) =>
    `${DAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;

  // Timezone display label
  const tzLabel = TIMEZONE_LIST.find(t => t.tz === timezone)?.label || getUtcOffset(timezone);

  const filteredTz = TIMEZONE_LIST.filter(t =>
    t.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
    t.tz.toLowerCase().includes(tzSearch.toLowerCase()) ||
    t.group.toLowerCase().includes(tzSearch.toLowerCase())
  );

  const tzGroups = [...new Set(filteredTz.map(t => t.group))];

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full text-center">
        <p className="text-red-500 font-medium">{error}</p>
      </div>
    </div>
  );

  if (step === "success") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center flex flex-col items-center gap-4">
        <CheckCircle2 size={56} className="text-green-500" />
        <h2 className="text-2xl font-bold text-gray-900">¡Cita Confirmada!</h2>
        <p className="text-gray-600">
          Tu cita ha sido agendada. Recibirás una confirmación en <strong>{guestEmail}</strong>.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 w-full text-left mt-2 flex flex-col gap-1">
          <p className="text-sm font-semibold text-gray-700">{appointmentType?.name}</p>
          <p className="text-sm text-gray-500">{selectedDate && formatDate(selectedDate)}</p>
          <p className="text-sm text-gray-500">{selectedSlot && formatSlot(selectedSlot)} · {appointmentType?.duration} min</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Globe size={11} /> {tzLabel}</p>
        </div>
      </div>
    </div>
  );

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:py-10">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col md:flex-row">

            {/* Left panel */}
            <div className="md:w-72 p-8 border-b md:border-b-0 md:border-r border-gray-100">
              <div className="w-10 h-10 rounded-full mb-4" style={{ backgroundColor: appointmentType?.color || "#3B82F6" }}></div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">{appointmentType?.name}</h1>
              {appointmentType?.description && (
                <p className="text-gray-500 text-sm mb-4">{appointmentType.description}</p>
              )}
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <Clock size={16} />
                <span>{appointmentType?.duration} minutos</span>
              </div>
              {appointmentType?.location && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <MapPin size={16} />
                  <span>{appointmentType.location}</span>
                </div>
              )}
            </div>

            {/* Right panel */}
            <div className="flex-1 p-8">
              {step === "calendar" && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col lg:flex-row gap-8">

                    {/* Calendar */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900">
                          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </h2>
                        <div className="flex gap-1">
                          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                            <ChevronLeft size={18}/>
                          </button>
                          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                            <ChevronRight size={18}/>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS.map(d => (
                          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
                        {Array(daysInMonth).fill(null).map((_, i) => {
                          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i+1);
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
                              {i+1}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time slots */}
                    {selectedDate && (
                      <div className="lg:w-52">
                        <h3 className="font-semibold text-gray-900 mb-4">{formatDate(selectedDate)}</h3>
                        {loadingSlots ? (
                          <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
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

                  {/* Timezone selector */}
                  <div className="relative" ref={tzPickerRef}>
                    <button
                      type="button"
                      onClick={() => { setShowTzPicker(p => !p); setTzSearch(""); }}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
                    >
                      <Globe size={15} className="text-gray-400 group-hover:text-gray-700" />
                      <span>{tzLabel}</span>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${showTzPicker ? "rotate-180" : ""}`} />
                    </button>

                    {showTzPicker && (
                      <div className="absolute bottom-8 left-0 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                        {/* Search */}
                        <div className="p-3 border-b border-gray-100">
                          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                            <Search size={14} className="text-gray-400 shrink-0" />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Buscar zona horaria..."
                              value={tzSearch}
                              onChange={e => setTzSearch(e.target.value)}
                              className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                            />
                          </div>
                        </div>
                        {/* List */}
                        <div className="max-h-64 overflow-y-auto">
                          {tzGroups.map(group => (
                            <div key={group}>
                              <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{group}</p>
                              {filteredTz.filter(t => t.group === group).map(t => (
                                <button
                                  key={t.tz}
                                  type="button"
                                  onClick={() => { setTimezone(t.tz); setShowTzPicker(false); }}
                                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between
                                    ${timezone === t.tz ? "text-gray-900 font-semibold" : "text-gray-600"}
                                  `}
                                >
                                  <span>{t.label}</span>
                                  {timezone === t.tz && <div className="w-2 h-2 rounded-full bg-gray-900" />}
                                </button>
                              ))}
                            </div>
                          ))}
                          {filteredTz.length === 0 && (
                            <p className="px-4 py-6 text-sm text-gray-400 text-center">Sin resultados</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === "form" && (
                <div className="max-w-md">
                  <button
                    onClick={() => setStep("calendar")}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
                  >
                    <ChevronLeft size={16} /> Volver al calendario
                  </button>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Confirma tu cita</h2>
                  <div className="flex flex-col gap-1 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar size={14} />
                      <span>{selectedDate && formatDate(selectedDate)}{selectedSlot && ` · ${formatSlot(selectedSlot)}`}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Globe size={12} />
                      <span>{tzLabel}</span>
                    </div>
                  </div>

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
                      <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 text-sm resize-none" placeholder="¿Algún tema específico que quieras tratar?"></textarea>
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
        <p className="text-center text-xs text-gray-400 mt-6">Powered by Noxy CRM</p>
      </div>
    </div>
  );
}
