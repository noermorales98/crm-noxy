"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, ArrowLeft01Icon, ArrowRight01Icon, Clock01Icon, Location01Icon, Calendar01Icon, GlobeIcon, ArrowDown01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const TIMEZONE_LIST = [
  { group: "México", tz: "America/Mexico_City", label: "Ciudad de México (UTC-6)" },
  { group: "México", tz: "America/Monterrey", label: "Monterrey (UTC-6)" },
  { group: "México", tz: "America/Merida", label: "Mérida / Yucatán (UTC-6)" },
  { group: "México", tz: "America/Cancun", label: "Cancún (UTC-5, sin cambio horario)" },
  { group: "México", tz: "America/Hermosillo", label: "Hermosillo / Sonora (UTC-7, sin cambio)" },
  { group: "México", tz: "America/Chihuahua", label: "Chihuahua (UTC-6/-7)" },
  { group: "México", tz: "America/Mazatlan", label: "Mazatlán / La Paz (UTC-7)" },
  { group: "México", tz: "America/Tijuana", label: "Tijuana / Mexicali (UTC-8)" },
  { group: "Estados Unidos", tz: "America/New_York", label: "Nueva York / Miami (ET)" },
  { group: "Estados Unidos", tz: "America/Chicago", label: "Chicago / Houston (CT)" },
  { group: "Estados Unidos", tz: "America/Denver", label: "Denver / Phoenix (MT)" },
  { group: "Estados Unidos", tz: "America/Los_Angeles", label: "Los Ángeles / Seattle (PT)" },
  { group: "Estados Unidos", tz: "America/Anchorage", label: "Alaska" },
  { group: "Estados Unidos", tz: "Pacific/Honolulu", label: "Hawái" },
  { group: "Latinoamérica", tz: "America/Bogota", label: "Bogotá (UTC-5)" },
  { group: "Latinoamérica", tz: "America/Lima", label: "Lima (UTC-5)" },
  { group: "Latinoamérica", tz: "America/Santiago", label: "Santiago (UTC-3/-4)" },
  { group: "Latinoamérica", tz: "America/Argentina/Buenos_Aires", label: "Buenos Aires (UTC-3)" },
  { group: "Latinoamérica", tz: "America/Sao_Paulo", label: "São Paulo (UTC-3)" },
  { group: "Europa", tz: "Europe/Madrid", label: "Madrid (UTC+1/+2)" },
  { group: "Europa", tz: "Europe/London", label: "Londres (UTC+0/+1)" },
  { group: "Europa", tz: "Europe/Paris", label: "París / Berlín (UTC+1/+2)" },
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

  // Confirmed appointment data (for calendar links)
  const [confirmedAppt, setConfirmedAppt] = useState<{
    startTime: string; endTime: string; timezone: string;
    typeName: string; location: string;
  } | null>(null);

  // Auto-detect timezone on mount
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch { }
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
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
        const d = await res.json();
        if (d.appointment) setConfirmedAppt(d.appointment);
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

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const isDateAvailable = (date: Date) => {
    if (!appointmentType?.schedule?.slots) return false;
    const dayOfWeek = date.getDay();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + (appointmentType.maxAdvanceDays || 30));
    return date >= today && date <= maxDate && appointmentType.schedule.slots.some((s: any) => s.dayOfWeek === dayOfWeek && s.isAvailable);
  };

  const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

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

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const toCalendarDate = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const buildGoogleCalendarUrl = () => {
    if (!confirmedAppt) return "#";
    const p = new URLSearchParams({
      action: "TEMPLATE",
      text: confirmedAppt.typeName,
      dates: `${toCalendarDate(confirmedAppt.startTime)}/${toCalendarDate(confirmedAppt.endTime)}`,
      ctz: confirmedAppt.timezone,
      ...(confirmedAppt.location ? { location: confirmedAppt.location } : {}),
    });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  };

  const downloadIcs = () => {
    if (!confirmedAppt) return;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CRM Noxy//Appointment//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `DTSTART:${toCalendarDate(confirmedAppt.startTime)}`,
      `DTEND:${toCalendarDate(confirmedAppt.endTime)}`,
      `SUMMARY:${confirmedAppt.typeName}`,
      confirmedAppt.location ? `LOCATION:${confirmedAppt.location}` : null,
      `ORGANIZER:mailto:${guestEmail}`,
      `UID:${Date.now()}@crm-noxy`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");

    const blob = new Blob([lines], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cita.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Timezone display label
  const tzLabel = TIMEZONE_LIST.find(t => t.tz === timezone)?.label || getUtcOffset(timezone);

  const filteredTz = TIMEZONE_LIST.filter(t =>
    t.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
    t.tz.toLowerCase().includes(tzSearch.toLowerCase()) ||
    t.group.toLowerCase().includes(tzSearch.toLowerCase())
  );

  const tzGroups = [...new Set(filteredTz.map(t => t.group))];

  if (isLoading) return (
    <div className="min-h-screen bg-surface-app flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-surface-app flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg border border-red-100 max-w-md w-full text-center">
        <p className="text-red-500 font-medium">{error}</p>
      </div>
    </div>
  );

  if (step === "success") return (
    <div className="min-h-screen bg-surface-app flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-lg border border-border-subtle max-w-md w-full text-center flex flex-col items-center gap-4">
        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={56} color="#22c55e" />
        <h2 className="text-2xl font-bold text-text-primary">¡Cita Confirmada!</h2>
        <p className="text-text-secondary">
          Tu cita ha sido agendada. Recibirás una confirmación en <strong>{guestEmail}</strong>.
        </p>
        <div className="bg-surface-sidebar rounded-lg p-4 w-full text-left mt-2 flex flex-col gap-1">
          <p className="text-sm font-semibold text-text-primary">{appointmentType?.name}</p>
          <p className="text-sm text-text-secondary">{selectedDate && formatDate(selectedDate)}</p>
          <p className="text-sm text-text-secondary">{selectedSlot && formatSlot(selectedSlot)} · {appointmentType?.duration} min</p>
          <p className="text-xs text-text-secondary mt-1 flex items-center gap-1"><HugeiconsIcon icon={GlobeIcon} size={11} /> {tzLabel}</p>
        </div>

        {confirmedAppt && (
          <div className="w-full flex flex-col gap-2 mt-2">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Agregar a mi calendario</p>
            <div className="flex gap-2">
              <a
                href={buildGoogleCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border-subtle hover:bg-surface-sidebar text-sm font-medium text-text-primary transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#FFC107"/>
                  <path d="M3.15295 7.3455L6.43845 9.755C7.32745 7.554 9.48045 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C8.15895 2 4.82795 4.1685 3.15295 7.3455Z" fill="#FF3D00"/>
                  <path d="M12 22C14.583 22 16.93 21.0115 18.7045 19.404L15.6095 16.785C14.5718 17.5742 13.3038 18.001 12 18C9.39903 18 7.19053 16.3415 6.35853 14.027L3.09753 16.5395C4.75253 19.778 8.11353 22 12 22Z" fill="#4CAF50"/>
                  <path d="M21.8055 10.0415H21V10H12V14H17.6515C17.2571 15.1082 16.5467 16.0766 15.608 16.7855L15.6095 16.7845L18.7045 19.4035C18.4855 19.6025 22 17 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#1976D2"/>
                </svg>
                Google Calendar
              </a>
              <button
                onClick={downloadIcs}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border-subtle hover:bg-surface-sidebar text-sm font-medium text-text-primary transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.78 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                </svg>
                Apple / iCal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  return (
    <div className="min-h-screen bg-surface-app p-4 md:py-10">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-border-subtle overflow-hidden">
          <div className="flex flex-col md:flex-row">

            {/* Left panel */}
            <div className="md:w-72 p-8 border-b md:border-b-0 md:border-r border-border-subtle">
              <div className="w-10 h-10 rounded-full mb-4" style={{ backgroundColor: appointmentType?.color || "#3545D6" }}></div>
              <h1 className="text-xl font-bold text-text-primary mb-2">{appointmentType?.name}</h1>
              {appointmentType?.description && (
                <p className="text-text-secondary text-sm mb-4">{appointmentType.description}</p>
              )}
              <div className="flex items-center gap-2 text-text-secondary text-sm mb-2">
                <HugeiconsIcon icon={Clock01Icon} size={16} />
                <span>{appointmentType?.duration} minutos</span>
              </div>
              {appointmentType?.location && (
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                  <HugeiconsIcon icon={Location01Icon} size={16} />
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
                        <h2 className="text-lg font-bold text-text-primary">
                          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </h2>
                        <div className="flex gap-1">
                          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-nav-hover text-text-secondary">
                            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
                          </button>
                          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-nav-hover text-text-secondary">
                            <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS.map(d => (
                          <div key={d} className="text-center text-xs font-semibold text-text-secondary py-1">{d}</div>
                        ))}
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
                                ${isSelected ? "bg-action-primary text-white" : ""}
                                ${available && !isSelected ? "hover:bg-nav-hover text-text-primary" : ""}
                                ${!available ? "text-gray-300 cursor-default" : ""}
                              `}
                            >
                              {i + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time slots */}
                    {selectedDate && (
                      <div className="lg:w-52">
                        <h3 className="font-semibold text-text-primary mb-4">{formatDate(selectedDate)}</h3>
                        {loadingSlots ? (
                          <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin"></div>
                          </div>
                        ) : availableSlots.length === 0 ? (
                          <p className="text-sm text-text-secondary">No hay horarios disponibles.</p>
                        ) : (
                          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                            {availableSlots.map(slot => (
                              <button
                                key={slot}
                                onClick={() => handleSlotSelect(slot)}
                                className="py-2.5 px-4 rounded-lg border border-border-subtle hover:border-action-primary hover:bg-action-primary hover:text-white text-sm font-medium text-text-primary transition-colors text-center"
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
                      className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors group"
                    >
                      <HugeiconsIcon icon={GlobeIcon} size={15} color="#9ca3af" />
                      <span>{tzLabel}</span>
                      <HugeiconsIcon icon={ArrowDown01Icon} size={14} color="#9ca3af" className={`transition-transform ${showTzPicker ? "rotate-180" : ""}`} />
                    </button>

                    {showTzPicker && (
                      <div className="absolute bottom-8 left-0 z-50 w-80 bg-white rounded-lg border border-border-subtle overflow-hidden">
                        {/* Search */}
                        <div className="p-3 border-b border-border-subtle">
                          <div className="flex items-center gap-2 bg-surface-sidebar rounded-lg px-3 py-2">
                            <HugeiconsIcon icon={Search01Icon} size={14} color="#9ca3af" className="shrink-0" />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Buscar zona horaria..."
                              value={tzSearch}
                              onChange={e => setTzSearch(e.target.value)}
                              className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder-gray-400"
                            />
                          </div>
                        </div>
                        {/* List */}
                        <div className="max-h-64 overflow-y-auto">
                          {tzGroups.map(group => (
                            <div key={group}>
                              <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">{group}</p>
                              {filteredTz.filter(t => t.group === group).map(t => (
                                <button
                                  key={t.tz}
                                  type="button"
                                  onClick={() => { setTimezone(t.tz); setShowTzPicker(false); }}
                                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-sidebar transition-colors flex items-center justify-between
                                    ${timezone === t.tz ? "text-text-primary font-semibold" : "text-text-secondary"}
                                  `}
                                >
                                  <span>{t.label}</span>
                                  {timezone === t.tz && <div className="w-2 h-2 rounded-full bg-action-primary" />}
                                </button>
                              ))}
                            </div>
                          ))}
                          {filteredTz.length === 0 && (
                            <p className="px-4 py-6 text-sm text-text-secondary text-center">Sin resultados</p>
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
                    className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-6 transition-colors"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={16} /> Volver al calendario
                  </button>
                  <h2 className="text-lg font-bold text-text-primary mb-1">Confirma tu cita</h2>
                  <div className="flex flex-col gap-1 mb-6">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <HugeiconsIcon icon={Calendar01Icon} size={14} />
                      <span>{selectedDate && formatDate(selectedDate)}{selectedSlot && ` · ${formatSlot(selectedSlot)}`}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <HugeiconsIcon icon={GlobeIcon} size={12} />
                      <span>{tzLabel}</span>
                    </div>
                  </div>

                  <form onSubmit={handleBook} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-text-primary">Nombre completo *</label>
                      <input type="text" required value={guestName} onChange={e => setGuestName(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle text-sm" placeholder="Tu nombre" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-text-primary">Correo electrónico *</label>
                      <input type="email" required value={guestEmail} onChange={e => setGuestEmail(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle text-sm" placeholder="tu@email.com" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-text-primary">Teléfono (opcional)</label>
                      <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle text-sm" placeholder="+52 55 1234 5678" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-text-primary">Notas adicionales</label>
                      <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle text-sm resize-none" placeholder="¿Algún tema específico que quieras tratar?"></textarea>
                    </div>
                    <button type="submit" disabled={isBooking} className="w-full py-3 rounded-lg font-bold text-white bg-action-primary hover:opacity-90 transition-colors disabled:opacity-50 mt-2">
                      {isBooking ? "Agendando..." : "Confirmar Cita"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-text-secondary mt-6">Desarrollado por Noxy</p>
      </div>
    </div>
  );
}
