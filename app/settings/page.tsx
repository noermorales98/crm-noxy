"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";

type GoogleStatus = {
  connected: boolean;
  configured: boolean;
  calendarId: string;
  connectedAt: string | null;
};

const TIMEZONES = [
  // México
  { label: "── México ──", value: "", disabled: true },
  { label: "Ciudad de México, CDMX (UTC-6)", value: "America/Mexico_City" },
  { label: "Monterrey, Nuevo León (UTC-6)", value: "America/Monterrey" },
  { label: "Guadalajara, Jalisco (UTC-6)", value: "America/Mexico_City" },
  { label: "Mérida, Yucatán (UTC-6)", value: "America/Merida" },
  { label: "Cancún, Quintana Roo (UTC-5, sin cambio horario)", value: "America/Cancun" },
  { label: "Hermosillo, Sonora (UTC-7, sin cambio horario)", value: "America/Hermosillo" },
  { label: "Chihuahua, Chihuahua (UTC-6/-7)", value: "America/Chihuahua" },
  { label: "Mazatlán, Sinaloa (UTC-7)", value: "America/Mazatlan" },
  { label: "Tijuana / Mexicali, Baja California (UTC-8)", value: "America/Tijuana" },
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

export default function SettingsPage() {
  const [phone, setPhone] = useState("");
  const [callMeBotApiKey, setCallMeBotApiKey] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [timezone, setTimezone] = useState("America/Cancun");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Calendar state
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleMsg, setGoogleMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setPhone(data.phone || "");
            setCallMeBotApiKey(data.callMeBotApiKey || "");
            setNotificationEmail(data.notificationEmail || "");
            setTimezone(data.timezone || "America/Cancun");
          }
        }
      } catch (err) {
        console.error("Failed to load settings");
      }
    }
    async function fetchGoogleStatus() {
      try {
        const res = await fetch("/api/google-calendar/status");
        if (res.ok) setGoogleStatus(await res.json());
      } catch { /* ignore */ }
    }
    fetchSettings();
    fetchGoogleStatus();

    // Handle OAuth redirect feedback
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      setGoogleMsg({ type: "success", text: "Google Calendar conectado correctamente." });
      fetchGoogleStatus();
      window.history.replaceState({}, "", "/settings");
    } else if (params.get("error")?.startsWith("google")) {
      setGoogleMsg({ type: "error", text: "No se pudo conectar con Google Calendar." });
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  const handleConnectGoogle = async () => {
    setGoogleLoading(true);
    setGoogleMsg(null);
    try {
      const res = await fetch("/api/google-calendar/auth");
      if (!res.ok) {
        const data = await res.json();
        setGoogleMsg({ type: "error", text: data.error || "Error al conectar." });
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setGoogleMsg({ type: "error", text: "Error al conectar con Google." });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("¿Desconectar Google Calendar? Las citas futuras no se sincronizarán.")) return;
    setGoogleLoading(true);
    try {
      await fetch("/api/google-calendar/disconnect", { method: "DELETE" });
      setGoogleStatus(prev => prev ? { ...prev, connected: false, connectedAt: null } : null);
      setGoogleMsg({ type: "success", text: "Google Calendar desconectado." });
    } catch {
      setGoogleMsg({ type: "error", text: "Error al desconectar." });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, callMeBotApiKey, notificationEmail, timezone }),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings");
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f4ef] font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuración / Integraciones</h1>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-2xl flex flex-col gap-8">

            {/* Google Calendar */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Google Calendar</h2>
              <p className="text-sm text-gray-500 mb-5">
                Sincroniza automáticamente tus citas con Google Calendar. Las nuevas citas aparecerán en tu calendario y recibirás recordatorios adicionales.
              </p>

              {googleMsg && (
                <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${googleMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  {googleMsg.text}
                </div>
              )}

              {googleStatus === null ? (
                <div className="h-10 w-40 rounded-xl bg-gray-100 animate-pulse" />
              ) : !googleStatus.configured ? (
                <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
                  Para activar esta integración, configura <code className="font-mono text-xs bg-amber-100 px-1 rounded">GOOGLE_CLIENT_ID</code>, <code className="font-mono text-xs bg-amber-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> y <code className="font-mono text-xs bg-amber-100 px-1 rounded">GOOGLE_REDIRECT_URI</code> en tu <code className="font-mono text-xs bg-amber-100 px-1 rounded">.env.local</code>.
                </div>
              ) : googleStatus.connected ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    Conectado
                    {googleStatus.connectedAt && (
                      <span className="text-green-500 font-normal ml-1">
                        · desde {new Date(googleStatus.connectedAt).toLocaleDateString("es-MX")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectGoogle}
                    disabled={googleLoading}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Desconectar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={googleLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                    <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                    <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                    <path d="M43.611 20.083H42V20H24v8h11.303a11.944 11.944 0 01-4.087 5.571l.002-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
                  </svg>
                  {googleLoading ? "Conectando..." : "Conectar con Google Calendar"}
                </button>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Timezone */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Zona Horaria</h2>
              <p className="text-sm text-gray-500 mb-5">
                Define la zona horaria de tu organización. Se usará para guardar horarios bloqueados y disponibilidad correctamente.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Zona horaria</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm"
                >
                  {TIMEZONES.map((tz, i) => (
                    <option key={i} value={tz.value} disabled={tz.disabled}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Email Notifications */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Notificaciones por Email</h2>
              <p className="text-sm text-gray-500 mb-5">
                Recibe un correo cada vez que alguien llene un formulario. Usa el SMTP configurado en la empresa vinculada al formulario.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Correo de notificación</label>
                <input
                  type="email"
                  placeholder="tu@correo.com"
                  value={notificationEmail}
                  onChange={e => setNotificationEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm"
                />
                <p className="text-xs text-gray-400">Si lo dejas vacío, se usará el correo de tu cuenta. El SMTP debe estar configurado en la empresa del formulario.</p>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* WhatsApp */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Notificaciones por WhatsApp</h2>
              <p className="text-sm text-gray-500 mb-5">
                Recibe alertas vía <a href="https://www.callmebot.com/" target="_blank" className="text-blue-600 hover:underline">CallMeBot</a> cuando ocurran eventos en tu CRM.
              </p>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +34612345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm"
                />
                <p className="text-xs text-gray-400">Include country code (e.g., +1, +34, +52).</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">CallMeBot API Key</label>
                <input
                  type="password"
                  placeholder="Your 6 or 7-digit API Key"
                  value={callMeBotApiKey}
                  onChange={(e) => setCallMeBotApiKey(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm"
                />
                <p className="text-xs text-gray-400">Get this by sending "I allow callmebot to send me messages" to the CallMeBot WhatsApp number.</p>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-green-600 font-medium">Configuración guardada correctamente.</p>}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Guardar configuración"}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
