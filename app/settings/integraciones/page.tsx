"use client";

import { useEffect, useState } from "react";
import { McpIntegrations } from "@/src/components/settings/McpIntegrations";
import { SettingsScreen } from "@/src/components/settings/SettingsScreen";
import { Block, Enter, PageHeader } from "@/src/components/ui";

type GoogleStatus = {
  connected: boolean;
  configured: boolean;
  calendarId: string;
  connectedAt: string | null;
};

export default function SettingsIntegrationsPage() {
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleMsg, setGoogleMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchGoogleStatus() {
      try {
        const res = await fetch("/api/google-calendar/status");
        if (res.ok) setGoogleStatus(await res.json());
      } catch { /* ignore */ }
    }
    fetchGoogleStatus();
    // Respuesta del flujo OAuth de Google.
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      setGoogleMsg({ type: "success", text: "Google Calendar conectado correctamente." });
      window.history.replaceState({}, "", "/settings/integraciones");
    } else if (params.get("error")?.startsWith("google")) {
      setGoogleMsg({ type: "error", text: "No se pudo conectar con Google Calendar." });
      window.history.replaceState({}, "", "/settings/integraciones");
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

  return (
    <SettingsScreen title="Integraciones">
      <Enter index={0}>
        <PageHeader title="Integraciones" subtitle="Conecta el CRM con otros servicios." />
      </Enter>
      <div className="flex flex-col gap-5">
      <Block title="Google Calendar">
        <div className="px-4 py-4 sm:px-5">
          <p className="mb-5 text-sm text-text-secondary">
            Sincroniza tus citas con Google Calendar. Las nuevas citas aparecerán en tu calendario y recibirás recordatorios adicionales.
          </p>


              {googleMsg && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${googleMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  {googleMsg.text}
                </div>
              )}

              {googleStatus === null ? (
                <div className="h-10 w-40 rounded-lg bg-surface-sidebar animate-pulse" />
              ) : !googleStatus.configured ? (
                <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-700">
                  Para activar esta integración, configura <code className="font-mono text-xs bg-amber-100 px-1 rounded">GOOGLE_CLIENT_ID</code>, <code className="font-mono text-xs bg-amber-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> y <code className="font-mono text-xs bg-amber-100 px-1 rounded">GOOGLE_REDIRECT_URI</code> en tu <code className="font-mono text-xs bg-amber-100 px-1 rounded">.env.local</code>.
                </div>
              ) : googleStatus.connected ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700 font-medium">
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
                    className="min-h-11 lg:min-h-10 px-4 py-2.5 rounded-lg border border-line text-sm text-text-secondary hover:bg-surface-sidebar transition-colors disabled:opacity-50"
                  >
                    Desconectar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={googleLoading}
                  className="min-h-11 lg:min-h-10 flex items-center gap-2 px-5 py-2.5 bg-surface-elevated border border-line hover:bg-surface-sidebar text-text-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
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
      </Block>
        <McpIntegrations />
      </div>
    </SettingsScreen>
  );
}
