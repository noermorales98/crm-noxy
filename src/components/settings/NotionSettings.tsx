"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Delete01Icon, PlugSocketIcon } from "@hugeicons/core-free-icons";
import { Block, Chip, useDialog } from "@/src/components/ui";
import { input as inputCls } from "@/src/lib/crm-ui";
import type { NotionConfigView } from "@/src/lib/notion-config";

/** Token y base de leads de Notion, guardados cifrados en la BD (no en variables de entorno). */
export function NotionSettings() {
  const [view, setView] = useState<NotionConfigView | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState("");
  const [database, setDatabase] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, open, () => setOpen(false));

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notion-config");
      if (!res.ok) throw new Error();
      setView((await res.json()) as NotionConfigView);
    } catch {
      setView({ configured: false, hasToken: false, databaseId: null, source: "none" });
      setMessage({ type: "error", text: "No se pudo cargar la configuración de Notion." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDialog = () => {
    setMessage(null);
    setToken("");
    setDatabase(view?.databaseId ?? "");
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const res = await fetch("/api/notion-config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, databaseId: database }) });
    setSaving(false);
    const data = (await res.json().catch(() => ({}))) as NotionConfigView & { error?: string };
    if (!res.ok) return setMessage({ type: "error", text: data.error ?? "No se pudo guardar." });
    setView(data);
    setOpen(false);
    setToken("");
    setMessage({ type: "success", text: "Notion guardado." });
  };

  const remove = async () => {
    if (!confirm("¿Quitar la configuración de Notion guardada?")) return;
    const res = await fetch("/api/notion-config", { method: "DELETE" });
    if (!res.ok) return setMessage({ type: "error", text: "No se pudo quitar." });
    setView((await res.json()) as NotionConfigView);
    setMessage({ type: "success", text: "Configuración de Notion quitada." });
  };

  return (
    <Block title="Notion" action={{ label: view?.source === "db" ? "Editar" : "Configurar", onClick: openDialog }}>
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        {message && (
          <p role="status" className={`rounded-control px-4 py-2.5 text-sm font-medium ${message.type === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
            {message.text}
          </p>
        )}
        {view === null ? (
          <p className="text-sm text-text-secondary">Cargando…</p>
        ) : (
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nav-active text-[var(--nav-active-ink)]">
              <HugeiconsIcon icon={PlugSocketIcon} size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-text-primary">Base de leads</span>
                {view.configured ? <Chip tone="done">{view.source === "env" ? "Variables de entorno" : "Conectado"}</Chip> : <Chip>Sin configurar</Chip>}
              </span>
              <span className="block truncate text-xs text-text-secondary">
                {view.databaseId ? `Base ${view.databaseId}` : "Agrega el token de tu integración y el enlace de la base."}
              </span>
            </span>
            {view.source === "db" && (
              <button type="button" onClick={remove} aria-label="Quitar Notion" title="Quitar" className="flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-danger-soft hover:text-danger lg:size-9">
                <HugeiconsIcon icon={Delete01Icon} size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-obsidian/35 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="notion-dialog-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-surface border border-line bg-surface-elevated shadow-md">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 id="notion-dialog-title" className="text-base font-semibold text-text-primary">Configurar Notion</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover lg:size-9">
                <HugeiconsIcon icon={Cancel01Icon} size={18} />
              </button>
            </div>
            <form onSubmit={save} className="flex flex-col gap-4 p-5">
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
                Token de la integración
                <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder={view?.source === "db" ? "Déjalo vacío para conservar el actual" : "ntn_…"} className={`${inputCls} font-normal`} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
                Base de leads (enlace o id)
                <input required value={database} onChange={(e) => setDatabase(e.target.value)} placeholder="https://www.notion.so/…" className={`${inputCls} font-normal`} />
              </label>
              <p className="text-xs text-text-secondary">Recuerda conectar la integración a la base (⋯ › Conexiones). El token se guarda cifrado y no se vuelve a mostrar.</p>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center rounded-control px-4 text-sm font-medium text-text-secondary hover:bg-nav-hover lg:min-h-10">Cancelar</button>
                <button type="submit" disabled={saving} className="crm-press inline-flex min-h-11 items-center rounded-control bg-action-primary px-5 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary disabled:opacity-50 lg:min-h-10">
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Block>
  );
}
