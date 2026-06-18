"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, ArrowLeft01Icon, ArrowRight01Icon, Clock01Icon, Calendar01Icon, GlobeIcon, ArrowDown01Icon, Search01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";

const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
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

export default function PublicFormPage() {
  const { addToast } = useToast();
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const variantId = searchParams.get("v");
  const [formConfig, setFormConfig] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successActionMsg, setSuccessActionMsg] = useState("");

  // Timezone
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

  // Auto-detect timezone
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch { }
  }, []);

  useEffect(() => {
    fetchFormDefinition();
  }, [id]);

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

  // Re-fetch slots when timezone changes
  useEffect(() => {
    if (selectedDate && formConfig?.appointmentType) {
      fetchSlots(selectedDate, formConfig.appointmentType);
    }
  }, [timezone]);

  const fetchFormDefinition = async () => {
    try {
      const res = await fetch(`/api/public/forms/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to load form.");
      } else {
        setFormConfig(data);
        const initialData: Record<string, any> = {};
        data.fields.forEach((f: any) => {
          if (f.type === "CHECKBOX") initialData[f.name] = [];
          else initialData[f.name] = "";
        });
        setFormData(initialData);
      }
    } catch {
      setErrorMsg("Could not connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSlots = async (date: Date, apptType: any) => {
    setLoadingSlots(true);
    setAvailableSlots([]);
    setSelectedSlot(null);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    try {
      const res = await fetch(`/api/public/appointment-types/${apptType.id}/slots?date=${dateStr}&tz=${encodeURIComponent(timezone)}`);
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
    if (formConfig?.appointmentType) fetchSlots(date, formConfig.appointmentType);
  };

  const isDateAvailable = (date: Date) => {
    const apptType = formConfig?.appointmentType;
    if (!apptType?.schedule?.slots) return false;
    const dayOfWeek = date.getDay();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + (apptType.maxAdvanceDays || 30));
    return date >= today && date <= maxDate && apptType.schedule.slots.some((s: any) => s.dayOfWeek === dayOfWeek && s.isAvailable);
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const formatSlot = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: timezone });
    } catch {
      return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });
    }
  };

  const handleInputChange = (name: string, value: any, type: string) => {
    if (type === "CHECKBOX") {
      setFormData(prev => {
        const arr = prev[name] || [];
        return { ...prev, [name]: arr.includes(value) ? arr.filter((v: string) => v !== value) : [...arr, value] };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formConfig?.appointmentType && !selectedSlot) {
      addToast("Por favor selecciona una fecha y hora para tu cita.", "warning");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    const payload: Record<string, any> = { ...formData };
    if (selectedSlot) {
      payload["__appointment_slot"] = selectedSlot;
      payload["__timezone"] = timezone;
    }
    if (variantId) {
      payload["__variant_id"] = variantId;
    }
    try {
      const res = await fetch(`/api/public/forms/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        if (data.action === "REDIRECT" && data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          setSubmitSuccess(true);
          setSuccessActionMsg(data.message || "Form submitted successfully!");
        }
      } else {
        setErrorMsg(data.error || "Failed to submit form.");
      }
    } catch {
      setErrorMsg("Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tzLabel = TIMEZONE_LIST.find(t => t.tz === timezone)?.label || timezone;
  const filteredTz = TIMEZONE_LIST.filter(t =>
    t.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
    t.tz.toLowerCase().includes(tzSearch.toLowerCase()) ||
    t.group.toLowerCase().includes(tzSearch.toLowerCase())
  );
  const tzGroups = [...new Set(filteredTz.map(t => t.group))];

  if (isLoading) return (
    <div className="min-h-screen bg-surface-app flex items-center justify-center p-4">
      <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin"></div>
    </div>
  );

  if (errorMsg && !formConfig) return (
    <div className="min-h-screen bg-surface-app flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg border border-red-100 max-w-md w-full text-center">
        <div className="text-red-500 font-bold mb-2">Error</div>
        <p className="text-text-secondary">{errorMsg}</p>
      </div>
    </div>
  );

  if (submitSuccess) return (
    <div className="min-h-screen bg-surface-app flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-lg border border-border-subtle max-w-md w-full text-center flex flex-col items-center gap-4">
        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={48} color="#22c55e" />
        <p className="text-text-primary font-medium text-lg whitespace-pre-wrap">{successActionMsg}</p>
      </div>
    </div>
  );

  const apptType = formConfig?.appointmentType;
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  return (
    <div className="min-h-screen bg-transparent md:py-10">
      <div className={`${apptType ? "max-w-xl md:max-w-5xl" : "max-w-xl"} md:bg-surface-elevated mx-auto md:rounded-lg md:border md:border-border-subtle p-4 pt-10 md:p-10 transition-all duration-500`}>
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-text-primary mb-2 leading-tight tracking-tight">{formConfig.name}</h1>
          {formConfig.description && (
            <p className="text-text-secondary whitespace-pre-wrap text-lg">{formConfig.description}</p>
          )}
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className={`flex flex-col ${apptType ? "md:flex-row" : ""} gap-10`}>
            {/* ── Left Column: Form Fields ── */}
            <div className="flex-1 flex flex-col gap-6">
              {formConfig.fields.map((field: any) => (
                <div key={field.id} className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-text-primary flex items-center gap-1">
                    {field.label} {field.isRequired && <span className="text-red-500">*</span>}
                  </label>

                  {field.type === "TEXT" && (
                    <input type="text" required={field.isRequired} placeholder={field.placeholder || ""} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3.5 rounded-lg border border-border-subtle bg-surface-sidebar/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all text-[15px]" />
                  )}
                  {field.type === "PREDEFINED_NAME" && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input type="text" required={field.isRequired} placeholder="Nombres" value={formData[`${field.name}_first`]} onChange={e => handleInputChange(`${field.name}_first`, e.target.value, field.type)} className="w-full sm:w-1/2 px-4 py-3.5 rounded-lg border border-border-subtle bg-surface-sidebar/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all text-[15px]" />
                      <input type="text" required={field.isRequired} placeholder="Apellidos" value={formData[`${field.name}_last`]} onChange={e => handleInputChange(`${field.name}_last`, e.target.value, field.type)} className="w-full sm:w-1/2 px-4 py-3.5 rounded-lg border border-border-subtle bg-surface-sidebar/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all text-[15px]" />
                    </div>
                  )}
                  {field.type === "EMAIL" && (
                    <input type="email" required={field.isRequired} placeholder={field.placeholder || ""} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3.5 rounded-lg border border-border-subtle bg-surface-sidebar/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all text-[15px]" />
                  )}
                  {field.type === "PHONE" && (
                    <input type="tel" required={field.isRequired} placeholder={field.placeholder || ""} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3.5 rounded-lg border border-border-subtle bg-surface-sidebar/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all text-[15px]" />
                  )}
                  {field.type === "PHONE_LADA" && (
                    <div className="flex gap-2">
                      <select required={field.isRequired} value={formData[`${field.name}_code`]} onChange={e => handleInputChange(`${field.name}_code`, e.target.value, field.type)} className="w-[110px] px-2 py-3.5 rounded-lg border border-border-subtle bg-surface-sidebar/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all text-[15px]">
                        <option value="+52">+52 MX</option>
                        <option value="+1">+1 US</option>
                        <option value="+34">+34 ES</option>
                        <option value="+54">+54 AR</option>
                        <option value="+57">+57 CO</option>
                        <option value="+56">+56 CL</option>
                        <option value="+51">+51 PE</option>
                      </select>
                      <input type="tel" required={field.isRequired} placeholder={field.placeholder || "Número de teléfono"} value={formData[`${field.name}_number`]} onChange={e => handleInputChange(`${field.name}_number`, e.target.value, field.type)} className="flex-1 px-4 py-3.5 rounded-lg border border-border-subtle bg-surface-sidebar/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all text-[15px]" />
                    </div>
                  )}
                  {field.type === "NUMBER" && (
                    <input type="number" required={field.isRequired} placeholder={field.placeholder || ""} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3.5 rounded-lg border border-border-subtle bg-surface-sidebar/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all text-[15px]" />
                  )}
                  {field.type === "DATE" && (
                    <input type="date" required={field.isRequired} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3.5 rounded-lg border border-border-subtle bg-surface-sidebar/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all text-[15px]" />
                  )}
                  {field.type === "TEXTAREA" && (
                    <textarea required={field.isRequired} placeholder={field.placeholder || ""} rows={3} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3.5 rounded-lg border border-border-subtle bg-surface-sidebar/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all text-[15px] resize-y"></textarea>
                  )}
                  {field.type === "SELECT" && (
                    <select required={field.isRequired} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3.5 rounded-lg border border-border-subtle bg-surface-sidebar/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all text-[15px] bg-white">
                      <option value="" disabled>Selecciona una opción</option>
                      {field.options?.map((opt: string, i: number) => <option key={i} value={opt}>{opt}</option>)}
                    </select>
                  )}
                  {field.type === "RADIO" && (
                    <div className="flex flex-col gap-3 mt-1 px-1">
                      {field.options?.map((opt: string, i: number) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center justify-center">
                            <input type="radio" required={field.isRequired} name={field.name} value={opt} checked={formData[field.name] === opt} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="appearance-none w-5 h-5 border-2 border-border-subtle rounded-full checked:border-black transition-all" />
                            {formData[field.name] === opt && <div className="absolute w-2.5 h-2.5 bg-black rounded-full" />}
                          </div>
                          <span className="text-[15px] text-text-primary font-medium group-hover:text-black transition-colors">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {field.type === "CHECKBOX" && (
                    <div className="flex flex-col gap-3 mt-1 px-1">
                      {field.options?.map((opt: string, i: number) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center justify-center">
                            <input type="checkbox" value={opt} checked={formData[field.name]?.includes(opt)} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="appearance-none w-5 h-5 border-2 border-border-subtle rounded-md checked:border-black checked:bg-black transition-all" />
                            {formData[field.name]?.includes(opt) && <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} color="white" className="absolute" />}
                          </div>
                          <span className="text-[15px] text-text-primary font-medium group-hover:text-black transition-colors">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Right Column: Calendar ── */}
            {apptType && (
              <div className="flex-1">
                <div className="border border-border-subtle rounded-lg overflow-hidden md:sticky md:top-8 bg-white ">
                  {/* Calendar Header */}
                  <div className="bg-accent-charcoal px-6 py-5">
                    <div className="flex items-center gap-2 mb-1">
                      <HugeiconsIcon icon={Calendar01Icon} size={18} color="rgba(255,255,255,0.7)" />
                      <h3 className="font-bold text-white text-[15px]">Agendar cita</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-white/50 font-medium px-2 py-0.5 bg-white/10 rounded-full">
                        <HugeiconsIcon icon={Clock01Icon} size={12} />
                        <span>{apptType.duration} min</span>
                      </div>
                      <span className="text-xs text-white/40 italic">{apptType.name}</span>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Mini calendar */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold text-text-primary uppercase tracking-widest text-[11px]">
                          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-nav-hover text-text-primary transition-colors">
                            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
                          </button>
                          <button type="button" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-nav-hover text-text-primary transition-colors">
                            <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS_SHORT.map(d => (
                          <div key={d} className="text-center text-[11px] font-bold text-text-secondary py-1 uppercase">{d}</div>
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
                              type="button"
                              onClick={() => available && handleDateSelect(date)}
                              disabled={!available}
                              className={`aspect-square rounded-lg text-sm font-bold transition-all relative flex items-center justify-center
                                ${isSelected ? "bg-accent-charcoal text-white scale-110" : ""}
                                ${available && !isSelected ? "hover:bg-nav-hover text-text-primary" : ""}
                                ${!available ? "text-gray-300 cursor-default" : ""}
                              `}
                            >
                              {i + 1}
                              {available && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-green-500 rounded-full" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time slots */}
                    {selectedDate && (
                      <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
                        <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-3">
                          Horarios para {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
                        </p>
                        {loadingSlots ? (
                          <div className="flex justify-center py-6">
                            <div className="w-6 h-6 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin"></div>
                          </div>
                        ) : availableSlots.length === 0 ? (
                          <div className="bg-surface-sidebar rounded-lg p-4 text-center">
                            <p className="text-xs text-text-secondary font-medium">No hay horarios disponibles.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {availableSlots.map(slot => (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                className={`py-3 px-2 rounded-lg border-2 text-[13px] font-bold transition-all
                                  ${selectedSlot === slot
                                    ? "bg-accent-charcoal text-white border-accent-charcoal scale-105"
                                    : "border-border-subtle hover:border-accent-charcoal text-text-primary bg-surface-sidebar/50"
                                  }`}
                              >
                                {formatSlot(slot)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selected slot confirmation */}
                    {selectedSlot && (
                      <div className="mb-6 flex items-center gap-3 text-xs text-green-800 bg-green-50 px-4 py-3 rounded-lg border border-green-100 font-bold animate-in bounce-in duration-500">
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color="#22c55e" />
                        <span>
                          {selectedDate && `${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]}`} · {formatSlot(selectedSlot)}
                        </span>
                      </div>
                    )}

                    {/* Timezone selector */}
                    <div className="relative border-t border-border-subtle pt-4" ref={tzPickerRef}>
                      <button
                        type="button"
                        onClick={() => { setShowTzPicker(p => !p); setTzSearch(""); }}
                        className="flex items-center gap-2 text-[11px] font-bold text-text-secondary hover:text-text-primary transition-colors group uppercase tracking-widest w-full text-left"
                      >
                        <HugeiconsIcon icon={GlobeIcon} size={14} className="shrink-0" />
                        <span className="truncate flex-1">{tzLabel}</span>
                        <HugeiconsIcon icon={ArrowDown01Icon} size={14} className={`shrink-0 transition-transform duration-300 ${showTzPicker ? "rotate-180" : ""}`} />
                      </button>

                      {showTzPicker && (
                        <div className="absolute bottom-9 left-0 z-50 w-full bg-white rounded-lg border border-border-subtle overflow-hidden animate-in slide-in-from-bottom-2">
                          <div className="p-3 border-b border-border-subtle">
                            <div className="flex items-center gap-2 bg-surface-sidebar rounded-lg px-3 py-2.5">
                              <HugeiconsIcon icon={Search01Icon} size={14} color="#9ca3af" className="shrink-0" />
                              <input
                                autoFocus
                                type="text"
                                placeholder="Buscar zona horaria..."
                                value={tzSearch}
                                onChange={e => setTzSearch(e.target.value)}
                                className="flex-1 bg-transparent text-xs outline-none text-text-primary font-medium placeholder-gray-400"
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {tzGroups.map(group => (
                              <div key={group}>
                                <p className="px-4 pt-4 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-text-secondary">{group}</p>
                                {filteredTz.filter(t => t.group === group).map(t => (
                                  <button
                                    key={t.tz}
                                    type="button"
                                    onClick={() => { setTimezone(t.tz); setShowTzPicker(false); }}
                                    className={`w-full text-left px-5 py-3 text-xs hover:bg-surface-sidebar transition-colors flex items-center justify-between
                                      ${timezone === t.tz ? "text-text-primary bg-surface-sidebar/50" : "text-text-secondary"}
                                    `}
                                  >
                                    <span className={timezone === t.tz ? "font-bold" : "font-medium"}>{t.label}</span>
                                    {timezone === t.tz && <div className="w-2 h-2 rounded-full bg-black" />}
                                  </button>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 px-5 py-4 rounded-lg flex items-center gap-3">
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
              {errorMsg}
            </p>
          )}

          <div className="pt-6 border-t border-border-subtle">
            <button type="submit" disabled={isSubmitting} className="w-full md:w-auto md:min-w-[200px] py-4 md:py-4.5 px-10 rounded-lg font-semibold text-white bg-accent-charcoal hover:opacity-90 transition-opacity disabled:opacity-50 text-lg">
              {isSubmitting ? "Enviando..." : "Enviar Formulario"}
            </button>
          </div>
        </form>

        <footer className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-sidebar rounded-full border border-border-subtle">
            <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest">Desarrollado por Noxy</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
