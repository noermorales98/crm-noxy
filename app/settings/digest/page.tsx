"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ModelSelector from "@/app/assistant/[id]/_components/ModelSelector";

const WEEKDAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
];

const FREQUENCIES = [
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "custom", label: "Personalizado" },
];

const REMINDER_MINUTES = [
  { value: 0, label: "Desactivado" },
  { value: 5, label: "5 minutos antes" },
  { value: 10, label: "10 minutos antes" },
  { value: 15, label: "15 minutos antes" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
];

export default function DigestSettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState("daily");
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [weeklyDay, setWeeklyDay] = useState(1);
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [includeGoogleCalendar, setIncludeGoogleCalendar] = useState(true);
  const [includeUnreadEmails, setIncludeUnreadEmails] = useState(true);
  const [calendarRemindDayBefore, setCalendarRemindDayBefore] = useState(true);
  const [calendarRemindMinutesBefore, setCalendarRemindMinutesBefore] = useState(15);
  const [aiModelId, setAiModelId] = useState("chatbase");
  const [whatsappConfigured, setWhatsappConfigured] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/digest")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setEnabled(d.enabled);
        setFrequency(d.frequency);
        setCustomDays(d.customDays ?? [1, 2, 3, 4, 5]);
        setWeeklyDay(d.weeklyDay ?? 1);
        setMonthlyDay(d.monthlyDay ?? 1);
        setHour(d.hour ?? 8);
        setMinute(d.minute ?? 0);
        setIncludeGoogleCalendar(d.includeGoogleCalendar ?? true);
        setIncludeUnreadEmails(d.includeUnreadEmails ?? true);
        setCalendarRemindDayBefore(d.calendarRemindDayBefore ?? true);
        setCalendarRemindMinutesBefore(d.calendarRemindMinutesBefore ?? 15);
        setAiModelId(d.aiModelId ?? "chatbase");
        setWhatsappConfigured(d.whatsappConfigured);
        setGoogleCalendarConnected(d.googleCalendarConnected ?? false);
        setLastSentAt(d.lastSentAt);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleDay(day: number) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings/digest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          frequency,
          customDays,
          weeklyDay,
          monthlyDay,
          hour,
          minute,
          includeGoogleCalendar,
          includeUnreadEmails,
          calendarRemindDayBefore,
          calendarRemindMinutesBefore,
          aiModelId,
        }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setSuccess("Configuración guardada.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings/digest/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "preview" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar vista previa");
      setPreview(data.message);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSendTest() {
    if (!whatsappConfigured) {
      setError("Configura WhatsApp en Configuración → Integraciones primero.");
      return;
    }
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings/digest/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "send" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar");
      setPreview(data.message);
      setSuccess("Resumen enviado por WhatsApp.");
      setLastSentAt(new Date().toISOString());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  const timeValue = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-6 py-6 bg-surface-app">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
          ← Configuración
        </Link>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight mt-2">Resumen por WhatsApp</h1>
        <p className="text-sm text-text-secondary mt-1">
          Recibe un resumen generado por IA con pipelines, ventas pendientes, ingresos, cobros próximos y eventos de Google Calendar.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
          <form onSubmit={handleSave} className="bg-white rounded-lg border border-border-subtle p-6 flex flex-col gap-5">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-text-primary">Activar resumen automático</p>
                <p className="text-xs text-text-secondary">Se enviará por WhatsApp según la programación</p>
              </div>
              <button
                type="button"
                onClick={() => setEnabled((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors relative ${enabled ? "bg-emerald-500" : "bg-nav-active"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>

            <hr className="border-border-subtle" />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-text-primary">Frecuencia</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm focus:outline-none focus:ring-1 focus:ring-border-subtle"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {frequency === "weekly" && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-text-primary">Día de la semana</label>
                <select
                  value={weeklyDay}
                  onChange={(e) => setWeeklyDay(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}

            {frequency === "monthly" && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-text-primary">Día del mes</label>
                <select
                  value={monthlyDay}
                  onChange={(e) => setMonthlyDay(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>Día {d}</option>
                  ))}
                </select>
              </div>
            )}

            {frequency === "custom" && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-text-primary">Días personalizados</label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        customDays.includes(d.value)
                          ? "bg-action-primary text-white border-action-primary"
                          : "bg-white text-text-secondary border-border-subtle hover:bg-nav-hover"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-text-primary">Hora de envío</label>
              <input
                type="time"
                value={timeValue}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(":").map(Number);
                  setHour(h);
                  setMinute(m);
                }}
                className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
              />
              <p className="text-xs text-text-secondary">Usa la zona horaria de tu organización.</p>
            </div>

            <hr className="border-border-subtle" />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-text-primary">Modelo de IA</label>
              <p className="text-xs text-text-secondary">
                Usa los mismos modelos configurados en{" "}
                <Link href="/settings/ai-models" className="underline font-semibold">
                  Modelos de IA
                </Link>
                . Por defecto: Chatbase.
              </p>
              <ModelSelector value={aiModelId} onChange={setAiModelId} />
            </div>

            <hr className="border-border-subtle" />

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-text-primary">Correos sin leer</p>
                <p className="text-xs text-text-secondary">Incluye el total de correos sin leer de tu organización en el resumen</p>
              </div>
              <button
                type="button"
                onClick={() => setIncludeUnreadEmails((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors relative ${includeUnreadEmails ? "bg-emerald-500" : "bg-nav-active"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${includeUnreadEmails ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>

            <hr className="border-border-subtle" />

            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">Google Calendar</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Incluye eventos en el resumen y recibe recordatorios por WhatsApp.
                </p>
              </div>

              {!googleCalendarConnected && (
                <div className="px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-800">
                  Conecta Google Calendar en{" "}
                  <Link href="/settings" className="underline font-semibold">Integraciones</Link>{" "}
                  para usar estas opciones.
                </div>
              )}

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-text-primary">Incluir en el resumen</p>
                  <p className="text-xs text-text-secondary">Lista eventos de los próximos 7 días</p>
                </div>
                <button
                  type="button"
                  disabled={!googleCalendarConnected}
                  onClick={() => setIncludeGoogleCalendar((v) => !v)}
                  className={`w-11 h-6 rounded-full transition-colors relative disabled:opacity-40 ${includeGoogleCalendar ? "bg-emerald-500" : "bg-nav-active"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${includeGoogleCalendar ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-text-primary">Recordatorio 1 día antes</p>
                  <p className="text-xs text-text-secondary">Aviso por WhatsApp 24 h antes del evento</p>
                </div>
                <button
                  type="button"
                  disabled={!googleCalendarConnected}
                  onClick={() => setCalendarRemindDayBefore((v) => !v)}
                  className={`w-11 h-6 rounded-full transition-colors relative disabled:opacity-40 ${calendarRemindDayBefore ? "bg-emerald-500" : "bg-nav-active"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${calendarRemindDayBefore ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </label>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-primary">Recordatorio antes del evento</label>
                <select
                  value={calendarRemindMinutesBefore}
                  disabled={!googleCalendarConnected}
                  onChange={(e) => setCalendarRemindMinutesBefore(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm disabled:opacity-40"
                >
                  {REMINDER_MINUTES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {!whatsappConfigured && (
              <div className="px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-800">
                Configura tu teléfono y API key de CallMeBot en{" "}
                <Link href="/settings" className="underline font-semibold">Integraciones</Link>{" "}
                para recibir el resumen.
              </div>
            )}

            {lastSentAt && (
              <p className="text-xs text-text-secondary">
                Último envío: {new Date(lastSentAt).toLocaleString("es-MX")}
              </p>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600 font-medium">{success}</p>}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-action-primary text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewing}
                className="px-4 py-2 border border-border-subtle text-sm font-semibold rounded-lg hover:bg-nav-hover transition-colors disabled:opacity-50"
              >
                {previewing ? "Generando…" : "Vista previa"}
              </button>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={sending || !whatsappConfigured}
                className="px-4 py-2 border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                {sending ? "Enviando…" : "Enviar prueba a WhatsApp"}
              </button>
            </div>
          </form>

          <div className="bg-white rounded-lg border border-border-subtle p-6 flex flex-col gap-3 min-h-[320px]">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">Vista previa en vivo</h2>
            {preview ? (
              <pre className="flex-1 text-sm text-text-primary whitespace-pre-wrap font-sans bg-surface-sidebar rounded-lg p-4 border border-border-subtle overflow-y-auto max-h-[480px]">
                {preview}
              </pre>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-text-secondary text-center px-4">
                Pulsa &quot;Vista previa&quot; para generar el resumen con IA usando tus datos actuales del CRM.
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
