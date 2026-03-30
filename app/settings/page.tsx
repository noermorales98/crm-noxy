"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";

export default function SettingsPage() {
  const [phone, setPhone] = useState("");
  const [callMeBotApiKey, setCallMeBotApiKey] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          }
        }
      } catch (err) {
        console.error("Failed to load settings");
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, callMeBotApiKey, notificationEmail }),
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
    <div className="flex h-screen bg-background font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 py-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuración / Integraciones</h1>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-2xl flex flex-col gap-8">

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
              {success && <p className="text-sm text-green-600 font-medium">Settings saved successfully!</p>}

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
