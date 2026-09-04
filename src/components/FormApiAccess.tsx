"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";

type Props = {
  formId: string;
  apiEnabled: boolean;
  apiAuthRequired: boolean;
  apiToken: string;
  onEnabledChange: (value: boolean) => void;
  onAuthRequiredChange: (value: boolean) => void;
  onTokenChange: (token: string) => void;
};

export default function FormApiAccess({
  formId,
  apiEnabled,
  apiAuthRequired,
  apiToken,
  onEnabledChange,
  onAuthRequiredChange,
  onTokenChange,
}: Props) {
  const { addToast } = useToast();
  const [copied, setCopied] = useState<"url" | "token" | "curl" | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const apiUrl = `${origin}/api/public/forms/${formId}/entries`;
  const curl = apiAuthRequired
    ? `curl "${apiUrl}?limit=50" \\\n  -H "Authorization: Bearer ${apiToken || "<token>"}"`
    : `curl "${apiUrl}?limit=50"`;

  const copy = async (value: string, key: "url" | "token" | "curl") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      addToast("No se pudo copiar", "error");
    }
  };

  const generateToken = async () => {
    if (apiToken && !confirm("Esto invalida el token actual. Los clientes que ya lo usan dejarán de funcionar. ¿Continuar?")) {
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/forms/${formId}/api-token`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addToast(err.error || "No se pudo generar el token", "error");
        return;
      }
      const data = await res.json();
      onTokenChange(data.apiToken);
      onAuthRequiredChange(true);
      setShowToken(true);
      addToast(apiToken ? "Token regenerado" : "Token generado", "success");
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="bg-white rounded-lg border border-border-subtle overflow-hidden">
      <div className="px-6 py-4 border-b border-border-subtle">
        <h2 className="text-sm font-bold text-text-primary">API de registros</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Consulta en JSON (GET HTTPS) a las personas que se han registrado en este formulario.
        </p>
      </div>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between py-3 px-4 bg-surface-sidebar rounded-lg border border-border-subtle">
          <div>
            <p className="text-sm font-semibold text-text-primary">API activa</p>
            <p className="text-xs text-text-secondary">Si está apagada, el endpoint responde 403</p>
          </div>
          <button
            type="button"
            onClick={() => onEnabledChange(!apiEnabled)}
            className={`relative w-10 h-6 rounded-full shrink-0 ${apiEnabled ? "bg-action-primary" : "bg-nav-active"}`}
            aria-pressed={apiEnabled}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full ${apiEnabled ? "left-5" : "left-1"}`} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Acceso</p>
          <div className="flex gap-3">
            {[
              { value: false, label: "Libre", help: "Sin autenticación" },
              { value: true, label: "Protegida", help: "Bearer token" },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => onAuthRequiredChange(opt.value)}
                className={`flex-1 py-2.5 rounded-lg border text-xs font-semibold ${
                  apiAuthRequired === opt.value
                    ? "border-action-primary bg-action-primary text-action-primary-foreground"
                    : "border-border-subtle text-text-secondary hover:bg-surface-sidebar"
                }`}
              >
                {opt.label}
                <span className={`block font-normal mt-0.5 ${apiAuthRequired === opt.value ? "text-action-primary-foreground/80" : "text-text-secondary"}`}>
                  {opt.help}
                </span>
              </button>
            ))}
          </div>
        </div>

        {!apiAuthRequired && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Cualquiera con la URL podrá leer los registros, incluidos nombres, emails y teléfonos.
          </p>
        )}

        <div>
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Endpoint GET</label>
          <div className="flex gap-2 mt-1.5">
            <input
              readOnly
              value={apiUrl}
              className="flex-1 px-3 py-2.5 rounded-lg border border-border-subtle bg-surface-sidebar text-xs text-text-secondary font-mono focus:outline-none"
            />
            <button
              type="button"
              onClick={() => copy(apiUrl, "url")}
              className={`px-3 py-2.5 rounded-lg border text-xs font-semibold shrink-0 ${copied === "url" ? "border-green-200 bg-green-50 text-green-700" : "border-border-subtle text-text-secondary hover:bg-surface-sidebar"}`}
            >
              {copied === "url" ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
          <p className="text-xs text-text-secondary mt-1.5">
            Parámetros opcionales: <span className="font-mono">limit</span> (1–100), <span className="font-mono">offset</span>, <span className="font-mono">since</span> y <span className="font-mono">until</span> (ISO 8601).
          </p>
        </div>

        {apiAuthRequired && (
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Bearer token</label>
            {apiToken ? (
              <div className="flex gap-2 mt-1.5">
                <input
                  readOnly
                  type={showToken ? "text" : "password"}
                  value={apiToken}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-border-subtle bg-surface-sidebar text-xs text-text-secondary font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="px-3 py-2.5 rounded-lg border border-border-subtle text-xs font-semibold text-text-secondary hover:bg-surface-sidebar shrink-0"
                >
                  {showToken ? "Ocultar" : "Ver"}
                </button>
                <button
                  type="button"
                  onClick={() => copy(apiToken, "token")}
                  className={`px-3 py-2.5 rounded-lg border text-xs font-semibold shrink-0 ${copied === "token" ? "border-green-200 bg-green-50 text-green-700" : "border-border-subtle text-text-secondary hover:bg-surface-sidebar"}`}
                >
                  {copied === "token" ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-text-secondary mt-1.5">Aún no hay token. Genera uno o guarda el formulario para crearlo.</p>
            )}
            <div className="mt-2">
              <button
                type="button"
                onClick={generateToken}
                disabled={isGenerating}
                className="text-xs font-semibold text-text-secondary hover:text-text-primary hover:underline disabled:opacity-50"
              >
                {isGenerating ? "Generando…" : apiToken ? "Regenerar token" : "Generar token"}
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Ejemplo curl</label>
          <div className="mt-1.5 relative">
            <textarea
              readOnly
              rows={apiAuthRequired ? 3 : 2}
              value={curl}
              className="w-full px-3 py-2.5 pr-16 rounded-lg border border-border-subtle bg-surface-sidebar text-xs text-text-secondary font-mono resize-none focus:outline-none"
            />
            <button
              type="button"
              onClick={() => copy(curl, "curl")}
              className="absolute top-2 right-2 px-2 py-1 bg-white border border-border-subtle rounded-lg text-[10px] font-semibold text-text-secondary hover:bg-surface-sidebar inline-flex items-center gap-1"
            >
              <HugeiconsIcon icon={copied === "curl" ? CheckmarkCircle01Icon : Copy01Icon} size={12} />
              {copied === "curl" ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
