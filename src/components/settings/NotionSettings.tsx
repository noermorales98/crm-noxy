"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Delete01Icon, PlugSocketIcon } from "@hugeicons/core-free-icons";
import { Block, Chip, Switch, useDialog } from "@/src/components/ui";
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
  const [docsDatabase, setDocsDatabase] = useState("");
  const [progress, setProgress] = useState<{ kind: "deal" | "doc"; text: string } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, open, () => setOpen(false));

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notion-config");
      if (!res.ok) throw new Error();
      setView((await res.json()) as NotionConfigView);
    } catch {
      setView({ configured: false, hasToken: false, databaseId: null, docsDatabaseId: null, autoSyncDeals: false, autoSyncDocs: false, source: "none" });
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
    setDocsDatabase(view?.docsDatabaseId ?? "");
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const res = await fetch("/api/notion-config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, databaseId: database, docsDatabaseId: docsDatabase, autoSyncDeals: view?.autoSyncDeals, autoSyncDocs: view?.autoSyncDocs }) });
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

  const setAuto = async (key: "autoSyncDeals" | "autoSyncDocs", value: boolean) => {
    if (!view?.databaseId) return;
    setView({ ...view, [key]: value });
    const res = await fetch("/api/notion-config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ databaseId: view.databaseId, docsDatabaseId: view.docsDatabaseId ?? "", [key]: value }) });
    if (!res.ok) {
      setMessage({ type: "error", text: "No se pudo guardar el cambio." });
      await load();
    }
  };

  const syncAll = async (kind: "deal" | "doc") => {
    setMessage(null);
    let offset: number | null = 0;
    const totals = { created: 0, updated: 0, failed: 0, errors: [] as string[] };
    let total = 0;
    while (offset !== null) {
      setProgress({ kind, text: total ? `Enviando… ${Math.min(offset, total)} de ${total}` : "Enviando…" });
      const res: Response = await fetch("/api/notion/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, offset }) });
      const data = (await res.json().catch(() => ({}))) as { total?: number; created?: number; updated?: number; failed?: number; errors?: string[]; nextOffset?: number | null; error?: string };
      if (!res.ok || data.total === undefined) {
        setProgress(null);
        return setMessage({ type: "error", text: data.error ?? "No se pudo sincronizar." });
      }
      total = data.total;
      totals.created += data.created ?? 0;
      totals.updated += data.updated ?? 0;
      totals.failed += data.failed ?? 0;
      totals.errors.push(...(data.errors ?? []));
      offset = data.nextOffset ?? null;
    }
    setProgress(null);
    const label = kind === "deal" ? "deals" : "documentos";
    const summary = `${total} ${label}: ${totals.created} creados, ${totals.updated} actualizados${totals.failed ? `, ${totals.failed} con error` : ""}.`;
    setMessage({ type: totals.failed ? "error" : "success", text: totals.failed && totals.errors[0] ? `${summary} ${totals.errors[0]}` : summary });
  };

  const canSync = view?.configured === true;
  const rows: { kind: "deal" | "doc"; title: string; hint: string; databaseId: string | null; auto: boolean; autoKey: "autoSyncDeals" | "autoSyncDocs" }[] = [
    { kind: "deal", title: "Deals", hint: "Base de leads", databaseId: view?.databaseId ?? null, auto: view?.autoSyncDeals ?? false, autoKey: "autoSyncDeals" },
    { kind: "doc", title: "Documentos (/kb)", hint: "Base de documentos", databaseId: view?.docsDatabaseId ?? null, auto: view?.autoSyncDocs ?? false, autoKey: "autoSyncDocs" },
  ];

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
          <>
            <div className="flex items-center gap-2">
              {view.configured ? <Chip tone="done">{view.source === "env" ? "Variables de entorno" : "Conectado"}</Chip> : <Chip>Sin configurar</Chip>}
              {view.source === "db" && (
                <button type="button" onClick={remove} aria-label="Quitar Notion" title="Quitar" className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-danger-soft hover:text-danger lg:size-9">
                  <HugeiconsIcon icon={Delete01Icon} size={16} />
                </button>
              )}
            </div>
            <ul className="divide-y divide-line rounded-control border border-line">
              {rows.map((row) => {
                const ready = canSync && Boolean(row.databaseId);
                return (
                  <li key={row.kind} className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-text-primary">{row.title}</span>
                      <span className="block truncate text-xs text-text-secondary">{row.databaseId ? `${row.hint} · ${row.databaseId}` : `${row.hint}: sin configurar`}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-2 text-xs text-text-secondary">
                        Automático
                        <Switch checked={row.auto} onChange={(next) => setAuto(row.autoKey, next)} label={`Sincronización automática de ${row.title}`} disabled={!ready || view.source !== "db"} />
                      </span>
                      <button
                        type="button"
                        disabled={!ready || progress !== null}
                        onClick={() => syncAll(row.kind)}
                        className="crm-press inline-flex min-h-11 items-center rounded-control border border-line bg-surface-elevated px-3 text-xs font-semibold text-text-primary hover:bg-surface-sidebar disabled:opacity-50 lg:min-h-9"
                      >
                        {progress?.kind === row.kind ? progress.text : "Sincronizar todo"}
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-text-secondary">
              También puedes enviar uno solo con el botón «Enviar a Notion» dentro de cada deal y de cada documento. El envío va del CRM hacia Notion.
            </p>
          </>
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
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
                Base de documentos (opcional)
                <input value={docsDatabase} onChange={(e) => setDocsDatabase(e.target.value)} placeholder="https://www.notion.so/…" className={`${inputCls} font-normal`} />
                <span className="text-xs font-normal text-text-secondary">Necesita las propiedades «Name» (título) y «CRM Doc ID» (texto).</span>
              </label>
              <p className="text-xs text-text-secondary">Recuerda conectar la integración a cada base (⋯ › Conexiones). El token se guarda cifrado y no se vuelve a mostrar.</p>
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
