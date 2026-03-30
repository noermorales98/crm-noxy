"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Calendar, Globe, ChevronDown, Search } from "lucide-react";

const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
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

export default function PublicFormPage() {
  const { id } = useParams() as { id: string };
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
    } catch {}
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
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
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
    const today = new Date(); today.setHours(0,0,0,0);
    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + (apptType.maxAdvanceDays || 30));
    return date >= today && date <= maxDate && apptType.schedule.slots.some((s: any) => s.dayOfWeek === dayOfWeek && s.isAvailable);
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
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
      alert("Por favor selecciona una fecha y hora para tu cita.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    const payload: Record<string, any> = { ...formData };
    if (selectedSlot) {
      payload["__appointment_slot"] = selectedSlot;
      payload["__timezone"] = timezone;
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
    </div>
  );

  if (errorMsg && !formConfig) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full text-center">
        <div className="text-red-500 font-bold mb-2">Error</div>
        <p className="text-gray-600">{errorMsg}</p>
      </div>
    </div>
  );

  if (submitSuccess) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center flex flex-col items-center gap-4">
        <CheckCircle2 size={48} className="text-green-500" />
        <p className="text-gray-900 font-medium text-lg whitespace-pre-wrap">{successActionMsg}</p>
      </div>
    </div>
  );

  const apptType = formConfig?.appointmentType;
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  return (
    <div className="min-h-screen bg-transparent p-4 md:py-10">
      <div className="bg-white max-w-xl mx-auto rounded-3xl shadow-sm border border-gray-100 p-8 md:p-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{formConfig.name}</h1>
        {formConfig.description && (
          <p className="text-gray-600 mb-8 whitespace-pre-wrap">{formConfig.description}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {formConfig.fields.map((field: any) => (
            <div key={field.id} className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-800">
                {field.label} {field.isRequired && <span className="text-red-500">*</span>}
              </label>

              {field.type === "TEXT" && (
                <input type="text" required={field.isRequired} placeholder={field.placeholder || ""} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
              )}
              {field.type === "PREDEFINED_NAME" && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <input type="text" required={field.isRequired} placeholder="First Name" value={formData[`${field.name}_first`]} onChange={e => handleInputChange(`${field.name}_first`, e.target.value, field.type)} className="w-full sm:w-1/2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
                  <input type="text" required={field.isRequired} placeholder="Last Name" value={formData[`${field.name}_last`]} onChange={e => handleInputChange(`${field.name}_last`, e.target.value, field.type)} className="w-full sm:w-1/2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
                </div>
              )}
              {field.type === "EMAIL" && (
                <input type="email" required={field.isRequired} placeholder={field.placeholder || ""} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
              )}
              {field.type === "PHONE" && (
                <input type="tel" required={field.isRequired} placeholder={field.placeholder || ""} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
              )}
              {field.type === "PHONE_LADA" && (
                <div className="flex gap-2">
                  <select required={field.isRequired} value={formData[`${field.name}_code`]} onChange={e => handleInputChange(`${field.name}_code`, e.target.value, field.type)} className="w-[100px] px-2 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors">
                    <option value="+52">+52 (MX)</option>
                    <option value="+1">+1 (US/CA)</option>
                    <option value="+34">+34 (ES)</option>
                    <option value="+54">+54 (AR)</option>
                    <option value="+57">+57 (CO)</option>
                    <option value="+56">+56 (CL)</option>
                    <option value="+51">+51 (PE)</option>
                  </select>
                  <input type="tel" required={field.isRequired} placeholder={field.placeholder || "Phone Number"} value={formData[`${field.name}_number`]} onChange={e => handleInputChange(`${field.name}_number`, e.target.value, field.type)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
                </div>
              )}
              {field.type === "NUMBER" && (
                <input type="number" required={field.isRequired} placeholder={field.placeholder || ""} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
              )}
              {field.type === "DATE" && (
                <input type="date" required={field.isRequired} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors" />
              )}
              {field.type === "TEXTAREA" && (
                <textarea required={field.isRequired} placeholder={field.placeholder || ""} rows={3} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors resize-y"></textarea>
              )}
              {field.type === "SELECT" && (
                <select required={field.isRequired} value={formData[field.name]} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors">
                  <option value="" disabled>Select an option</option>
                  {field.options?.map((opt: string, i: number) => <option key={i} value={opt}>{opt}</option>)}
                </select>
              )}
              {field.type === "RADIO" && (
                <div className="flex flex-col gap-2 mt-1">
                  {field.options?.map((opt: string, i: number) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer text-gray-700">
                      <input type="radio" required={field.isRequired} name={field.name} value={opt} checked={formData[field.name] === opt} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-4 h-4 text-black focus:ring-black" />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              {field.type === "CHECKBOX" && (
                <div className="flex flex-col gap-2 mt-1">
                  {field.options?.map((opt: string, i: number) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer text-gray-700">
                      <input type="checkbox" value={opt} checked={formData[field.name]?.includes(opt)} onChange={e => handleInputChange(field.name, e.target.value, field.type)} className="w-4 h-4 rounded text-black focus:ring-black border-gray-300" />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* ── Calendar widget (shown when appointment type is linked) ── */}
          {apptType && (
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={16} className="text-gray-500" />
                  <h3 className="font-semibold text-gray-800 text-sm">Selecciona fecha y hora</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock size={12} />
                  <span>{apptType.name} · {apptType.duration} min</span>
                </div>
              </div>

              <div className="p-5">
                {/* Mini calendar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-900">
                      {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth()-1, 1))} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                        <ChevronLeft size={16} />
                      </button>
                      <button type="button" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth()+1, 1))} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {DAYS_SHORT.map(d => (
                      <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
                    {Array(daysInMonth).fill(null).map((_, i) => {
                      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i+1);
                      const available = isDateAvailable(date);
                      const isSelected = selectedDate?.toDateString() === date.toDateString();
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => available && handleDateSelect(date)}
                          disabled={!available}
                          className={`aspect-square rounded-full text-xs font-medium transition-colors
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
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      {DAYS_SHORT[selectedDate.getDay()]}, {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
                    </p>
                    {loadingSlots ? (
                      <div className="flex justify-center py-4">
                        <div className="w-5 h-5 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-xs text-gray-400">No hay horarios disponibles para este día.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2 px-2 rounded-xl border text-xs font-medium transition-colors
                              ${selectedSlot === slot
                                ? "bg-gray-900 text-white border-gray-900"
                                : "border-gray-200 hover:border-gray-900 text-gray-700"
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
                  <div className="mb-4 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-xl">
                    <Calendar size={13} />
                    <span>
                      Cita: {selectedDate && `${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()]}`} a las {formatSlot(selectedSlot)}
                    </span>
                  </div>
                )}

                {/* Timezone selector */}
                <div className="relative border-t border-gray-100 pt-3" ref={tzPickerRef}>
                  <button
                    type="button"
                    onClick={() => { setShowTzPicker(p => !p); setTzSearch(""); }}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors group"
                  >
                    <Globe size={13} className="shrink-0" />
                    <span className="truncate max-w-[260px]">{tzLabel}</span>
                    <ChevronDown size={12} className={`shrink-0 transition-transform ${showTzPicker ? "rotate-180" : ""}`} />
                  </button>

                  {showTzPicker && (
                    <div className="absolute bottom-7 left-0 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                      {/* Search */}
                      <div className="p-3 border-b border-gray-100">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                          <Search size={13} className="text-gray-400 shrink-0" />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Buscar zona horaria..."
                            value={tzSearch}
                            onChange={e => setTzSearch(e.target.value)}
                            className="flex-1 bg-transparent text-xs outline-none text-gray-700 placeholder-gray-400"
                          />
                        </div>
                      </div>
                      {/* List */}
                      <div className="max-h-56 overflow-y-auto">
                        {tzGroups.map(group => (
                          <div key={group}>
                            <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{group}</p>
                            {filteredTz.filter(t => t.group === group).map(t => (
                              <button
                                key={t.tz}
                                type="button"
                                onClick={() => { setTimezone(t.tz); setShowTzPicker(false); }}
                                className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 transition-colors flex items-center justify-between
                                  ${timezone === t.tz ? "text-gray-900 font-semibold" : "text-gray-600"}
                                `}
                              >
                                <span>{t.label}</span>
                                {timezone === t.tz && <div className="w-1.5 h-1.5 rounded-full bg-gray-900 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        ))}
                        {filteredTz.length === 0 && (
                          <p className="px-4 py-5 text-xs text-gray-400 text-center">Sin resultados</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{errorMsg}</p>
          )}

          <div className="pt-4 mt-2 border-t border-gray-100 pb-2">
            <button type="submit" disabled={isSubmitting} className="w-full py-4 rounded-xl font-bold text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50 text-lg">
              {isSubmitting ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Powered by Noxy CRM</p>
        </div>
      </div>
    </div>
  );
}
