"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import { Block, Chip, useDialog } from "@/src/components/ui";
import { input as inputCls } from "@/src/lib/crm-ui";
import { NOT_CONNECTED, type GranolaConnectionView } from "@/src/lib/granola-view";

type Message = { type: "success" | "error"; text: string };

const STATUS_LABEL: Record<string, string> = {
  CONNECTED: "Conectado",
  PENDING: "Esperando autorización",
  NEEDS_RECONNECT: "Hay que reconectar",
  ERROR: "Con error",
};

const buttonCls =
  "crm-press inline-flex min-h-11 items-center rounded-control border border-line bg-surface-elevated px-3 text-xs font-semibold text-text-primary hover:bg-surface-sidebar disabled:opacity-50 lg:min-h-9";

/** Conexión de Granola: clave API o MCP (inicio de sesión en Granola). Las credenciales nunca vuelven al navegador. */
export function GranolaSettings() {
  const [view, setView] = useState<GranolaConnectionView | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState<"key" | "mcp" | "sync" | null>(null);
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, open, () => setOpen(false));

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/granola/config");
      if (!res.ok) throw new Error();
      setView((await res.json()) as GranolaConnectionView);
    } catch {
      setView(NOT_CONNECTED);
      setMessage({ type: "error", text: "No se pudo cargar la conexión con Granola." });
    }
  }, []);

  useEffect(() => {
    void load();
    // Respuesta del flujo de autorización por MCP.
    const params = new URLSearchParams(window.location.search);
    const result = params.get("granola");
    if (result === "connected") setMessage({ type: "success", text: "Granola conectado por MCP." });
    else if (result === "error") setMessage({ type: "error", text: "No se completó la conexión con Granola. Intenta de nuevo." });
    if (result) window.history.replaceState({}, "", "/settings/integraciones");
  }, [load]);

  const errorOf = async (res: Response, fallback: string) => ((await res.json().catch(() => ({}))) as { error?: string }).error ?? fallback;

  const saveKey = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("key");
    setMessage(null);
    const res = await fetch("/api/granola/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey }) });
    setBusy(null);
    if (!res.ok) return setMessage({ type: "error", text: await errorOf(res, "No se pudo guardar la clave.") });
    setView((await res.json()) as GranolaConnectionView);
    setApiKey("");
    setOpen(false);
    setMessage({ type: "success", text: "Granola conectado con tu clave API." });
  };

  const connectMcp = async () => {
    setBusy("mcp");
    setMessage(null);
    const res = await fetch("/api/granola/mcp/connect", { method: "POST" });
    if (!res.ok) {
      setBusy(null);
      return setMessage({ type: "error", text: await errorOf(res, "No se pudo iniciar la conexión.") });
    }
    const { url } = (await res.json()) as { url: string };
    window.location.href = url;
  };

  const syncNow = async () => {
    setBusy("sync");
    setMessage(null);
    const res = await fetch("/api/granola/sync", { method: "POST" });
    setBusy(null);
    if (!res.ok) {
      setMessage({ type: "error", text: await errorOf(res, "No se pudo sincronizar.") });
    } else {
      const data = (await res.json()) as { synced: number; failed: number; complete: boolean; linked: number; unassigned: number };
      const extra = data.failed ? ` ${data.failed} no se pudieron guardar.` : data.complete ? "" : " Quedan más por traer: vuelve a sincronizar.";
      setMessage({ type: data.failed ? "error" : "success", text: `${data.synced} sesiones nuevas o actualizadas. En total: ${data.linked} con cita y ${data.unassigned} sin asignar.${extra}` });
    }
    await load();
  };

  const disconnect = async () => {
    if (!confirm("¿Desconectar Granola? Las notas ya guardadas en las citas se conservan.")) return;
    const res = await fetch("/api/granola/config", { method: "DELETE" });
    if (!res.ok) return setMessage({ type: "error", text: await errorOf(res, "No se pudo desconectar.") });
    setView((await res.json()) as GranolaConnectionView);
    setMessage({ type: "success", text: "Granola desconectado." });
  };

  const connected = view?.status === "CONNECTED";
  const lastSync = view?.lastSyncAt ? new Date(view.lastSyncAt).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <Block title="Granola" action={{ label: view?.mode === "API_KEY" ? "Cambiar clave" : "Usar clave API", onClick: () => { setMessage(null); setApiKey(""); setOpen(true); } }}>
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        {message && (
          <p role="status" className={`rounded-control px-4 py-2.5 text-sm font-medium ${message.type === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
            {message.text}
          </p>
        )}
        {view === null ? (
          <p className="text-sm text-text-secondary">Cargando…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {view.status ? <Chip tone={connected ? "done" : "late"}>{STATUS_LABEL[view.status] ?? view.status}</Chip> : <Chip>Sin conectar</Chip>}
              {view.mode && <Chip>{view.mode === "MCP" ? "Por MCP" : "Clave API"}</Chip>}
              {view.status && (
                <button type="button" onClick={disconnect} aria-label="Desconectar Granola" title="Desconectar" className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-danger-soft hover:text-danger lg:size-9">
                  <HugeiconsIcon icon={Delete01Icon} size={16} />
                </button>
              )}
            </div>
            {view.lastSyncError && <p className="text-xs text-danger">{view.lastSyncError}</p>}
            {lastSync && <p className="text-xs text-text-secondary">Última sincronización: {lastSync} · {view.lastSyncCount} sesiones.</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={connectMcp} disabled={busy !== null} className={buttonCls}>
                {busy === "mcp" ? "Abriendo Granola…" : view.mode === "MCP" ? "Reconectar por MCP" : "Conectar por MCP"}
              </button>
              <button type="button" onClick={syncNow} disabled={!connected || busy !== null} className={buttonCls}>
                {busy === "sync" ? "Sincronizando…" : "Sincronizar ahora"}
              </button>
            </div>
            <p className="text-xs text-text-secondary">
              Trae resúmenes, notas y pasos de tus reuniones y los guarda en la cita que coincide por horario y correo. Con MCP inicias sesión en Granola; con clave API pegas una clave que empiece por grn_. Todo se guarda cifrado.
            </p>
          </>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-obsidian/35 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="granola-dialog-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-surface border border-line bg-surface-elevated shadow-md">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 id="granola-dialog-title" className="text-base font-semibold text-text-primary">Clave API de Granola</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover lg:size-9">
                <HugeiconsIcon icon={Cancel01Icon} size={18} />
              </button>
            </div>
            <form onSubmit={saveKey} className="flex flex-col gap-4 p-5">
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
                Clave
                <input required type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="grn_…" className={`${inputCls} font-normal`} />
                <span className="text-xs font-normal text-text-secondary">En Granola: Settings › Connectors › API keys. Se valida antes de guardarla y no se vuelve a mostrar.</span>
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center rounded-control px-4 text-sm font-medium text-text-secondary hover:bg-nav-hover lg:min-h-10">Cancelar</button>
                <button type="submit" disabled={busy === "key"} className="crm-press inline-flex min-h-11 items-center rounded-control bg-action-primary px-5 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary disabled:opacity-50 lg:min-h-10">
                  {busy === "key" ? "Validando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Block>
  );
}
