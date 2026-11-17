"use client";

import { useCallback, useEffect, useState } from "react";
import { input as inputCls } from "@/src/lib/crm-ui";

type Status = { provider: "nvidia" | "openrouter"; source: "db" | "env" | "none"; unreadable?: boolean };

const SOURCE_TEXT: Record<Status["source"], string> = {
  db: "Configurada (guardada en el CRM)",
  env: "Configurada (variable de entorno del servidor)",
  none: "Sin configurar",
};

const btn =
  "crm-press inline-flex min-h-11 items-center rounded-control border border-line bg-surface-elevated px-3 text-xs font-semibold text-text-primary hover:bg-surface-sidebar disabled:opacity-50 lg:min-h-9";

/** Clave de NVIDIA guardada cifrada en la base. OpenRouter se muestra solo como informativo (se configura en el servidor). */
export function AiProviderKeys() {
  const [statuses, setStatuses] = useState<Status[] | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/ai-keys");
      if (!res.ok) throw new Error();
      setStatuses((await res.json()) as Status[]);
    } catch {
      setStatuses([]);
      setMessage({ type: "error", text: "No se pudo cargar el estado de las claves." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const nvidia = statuses?.find((s) => s.provider === "nvidia");
  const openrouter = statuses?.find((s) => s.provider === "openrouter");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/settings/ai-keys", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "nvidia", apiKey: key }) });
    const data = (await res.json().catch(() => ({}))) as { error?: string; statuses?: Status[]; warning?: string | null };
    setBusy(false);
    if (!res.ok) return setMessage({ type: "error", text: data.error ?? "No se pudo guardar la clave." });
    setStatuses(data.statuses ?? statuses);
    setKey("");
    setMessage({ type: "success", text: data.warning ?? "Clave de NVIDIA guardada." });
  };

  const remove = async () => {
    if (!confirm("¿Quitar la clave de NVIDIA guardada en el CRM?")) return;
    setBusy(true);
    const res = await fetch("/api/settings/ai-keys?provider=nvidia", { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string; statuses?: Status[] };
    setBusy(false);
    if (!res.ok) return setMessage({ type: "error", text: data.error ?? "No se pudo quitar la clave." });
    setStatuses(data.statuses ?? statuses);
    setMessage({ type: "success", text: "Clave de NVIDIA quitada." });
  };

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-line bg-surface-elevated">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold text-text-primary">Claves de proveedores</h2>
        <p className="mt-0.5 text-xs text-text-secondary">La clave se guarda cifrada y no se vuelve a mostrar. Los modelos de NVIDIA se agregan con el prefijo <code>nvidia:</code>.</p>
      </div>
      <div className="flex flex-col gap-3 px-5 py-4">
        {message && (
          <p role="status" className={`rounded-control px-4 py-2.5 text-sm font-medium ${message.type === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
            {message.text}
          </p>
        )}
        {statuses === null ? (
          <p className="text-sm text-text-secondary">Cargando…</p>
        ) : (
          <>
            <form onSubmit={save} className="flex flex-col gap-2">
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
                Clave de NVIDIA
                <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="nvapi-…" className={`${inputCls} font-normal`} />
                <span className="text-xs font-normal text-text-secondary">
                  Estado: {nvidia ? SOURCE_TEXT[nvidia.source] : "—"}{nvidia?.unreadable ? ". Hay una clave guardada que ya no se puede leer: quítala o pega una nueva" : ""}. La generas en build.nvidia.com (Get API Key).
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className={btn} disabled={busy || !key.trim()}>
                  {busy ? "Validando…" : nvidia?.source === "db" ? "Cambiar clave" : "Guardar clave"}
                </button>
                {(nvidia?.source === "db" || nvidia?.unreadable) && (
                  <button type="button" className={btn} onClick={remove} disabled={busy}>
                    Quitar clave
                  </button>
                )}
              </div>
            </form>
            <p className="text-xs text-text-secondary">OpenRouter: {openrouter ? SOURCE_TEXT[openrouter.source] : "—"}. Se configura en las variables de entorno del servidor.</p>
          </>
        )}
      </div>
    </div>
  );
}
