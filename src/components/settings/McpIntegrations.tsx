"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDialog } from "@/src/components/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon, Delete01Icon, PlugSocketIcon } from "@hugeicons/core-free-icons";
import { Block, Chip, DataList, EmptyState, Switch } from "@/src/components/ui";
import { input as inputCls } from "@/src/lib/crm-ui";
import { MCP_TRANSPORTS } from "@/src/lib/mcp-connections";

type Integration = {
  id: string;
  name: string;
  url: string | null;
  transport: string;
  enabled: boolean;
  source: string;
  note: string | null;
  hasToken: boolean;
};

// Solo sugerencias al escribir el nombre; no se importa nada de ningún lado.
const MCP_SUGGESTIONS = ["Notion", "Slack", "GitHub", "Linear", "Google Drive", "Gmail", "Google Calendar", "Vercel", "Stripe", "Atlassian"];

const EMPTY_FORM = { name: "", url: "", transport: "http", authToken: "", note: "" };

/** Conexiones MCP de la organización: lista (con su estado), alta manual e importación de las detectadas en Claude. */
export function McpIntegrations() {
  const [rows, setRows] = useState<Integration[] | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mcp-integrations");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { integrations: Integration[] };
      setRows(data.integrations);
    } catch {
      setRows([]);
      setMessage({ type: "error", text: "No se pudieron cargar las conexiones." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (row: Integration) => {
    setRows((current) => current?.map((item) => (item.id === row.id ? { ...item, enabled: !item.enabled } : item)) ?? null);
    const res = await fetch(`/api/mcp-integrations/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !row.enabled }) });
    if (!res.ok) await load();
  };

  const remove = async (row: Integration) => {
    if (!confirm(`¿Eliminar la conexión «${row.name}»?`)) return;
    const res = await fetch(`/api/mcp-integrations/${row.id}`, { method: "DELETE" });
    if (res.ok) setRows((current) => current?.filter((item) => item.id !== row.id) ?? null);
    else setMessage({ type: "error", text: "No se pudo eliminar." });
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdding(true);
    setMessage(null);
    const res = await fetch("/api/mcp-integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setAdding(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return setMessage({ type: "error", text: data.error ?? "No se pudo agregar." });
    }
    setForm(EMPTY_FORM);
    setOpen(false);
    setMessage({ type: "success", text: "Conexión agregada." });
    await load();
  };

  const set = (key: keyof typeof EMPTY_FORM, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const enabledCount = rows?.filter((row) => row.enabled).length ?? 0;
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, open, () => setOpen(false));

  return (
    <Block title="Conexiones MCP" action={{ label: "Agregar", onClick: () => { setMessage(null); setOpen(true); } }}>
      {(message || (rows && rows.length > 0)) && (
        <div className="flex flex-col gap-2 px-4 pt-4 sm:px-5">
          {rows && rows.length > 0 && <p className="text-sm text-text-secondary">{enabledCount} de {rows.length} activas.</p>}
          {message && (
            <p role="status" className={`rounded-control px-4 py-2.5 text-sm font-medium ${message.type === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
              {message.text}
            </p>
          )}
        </div>
      )}

      {rows === null ? (
        <p className="px-4 py-6 text-sm text-text-secondary sm:px-5">Cargando conexiones…</p>
      ) : (
        <DataList
          label="Conexiones MCP"
          rows={rows}
          getKey={(row) => row.id}
          empty={<EmptyState title="Sin conexiones" body="Agrega tu primer servidor MCP con el botón «Agregar»." />}
          renderRow={(row) => (
            <div className="flex w-full min-w-0 items-center gap-3">
              <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nav-active text-[var(--nav-active-ink)]">
                <HugeiconsIcon icon={PlugSocketIcon} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-text-primary">{row.name}</span>
                  {row.hasToken && <Chip tone="done">Con credencial</Chip>}
                </span>
                <span className="block truncate text-xs text-text-secondary">{row.url ?? row.note ?? "Sin URL"}</span>
              </span>
              <Switch checked={row.enabled} onChange={() => toggle(row)} label={`${row.enabled ? "Desactivar" : "Activar"} ${row.name}`} />
              <button
                type="button"
                onClick={() => remove(row)}
                aria-label={`Eliminar ${row.name}`}
                title="Eliminar"
                className="flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-danger-soft hover:text-danger lg:size-9"
              >
                <HugeiconsIcon icon={Delete01Icon} size={16} />
              </button>
            </div>
          )}
        />
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-obsidian/35 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mcp-dialog-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-surface border border-line bg-surface-elevated shadow-md"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 id="mcp-dialog-title" className="text-base font-semibold text-text-primary">Agregar conexión MCP</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover lg:size-9">
                <HugeiconsIcon icon={Cancel01Icon} size={18} />
              </button>
            </div>
            <form onSubmit={add} className="flex flex-col gap-4 p-5">
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
                Nombre
                <input required list="mcp-suggestions" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Notion" className={`${inputCls} font-normal`} />
                <datalist id="mcp-suggestions">
                  {MCP_SUGGESTIONS.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
                URL del servidor
                <input value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://mcp.ejemplo.com/mcp" className={`${inputCls} font-normal`} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
                  Tipo
                  <select value={form.transport} onChange={(e) => set("transport", e.target.value)} className={`${inputCls} font-normal`}>
                    {MCP_TRANSPORTS.map((transport) => (
                      <option key={transport} value={transport}>{transport}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
                  Token (opcional)
                  <input type="password" autoComplete="off" value={form.authToken} onChange={(e) => set("authToken", e.target.value)} className={`${inputCls} font-normal`} />
                </label>
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
                Nota (opcional)
                <input value={form.note} onChange={(e) => set("note", e.target.value)} className={`${inputCls} font-normal`} />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center rounded-control px-4 text-sm font-medium text-text-secondary hover:bg-nav-hover lg:min-h-10">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="crm-press inline-flex min-h-11 items-center gap-2 rounded-control bg-action-primary px-5 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary disabled:opacity-50 lg:min-h-10"
                >
                  <HugeiconsIcon icon={Add01Icon} size={16} aria-hidden="true" />
                  {adding ? "Agregando…" : "Agregar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Block>
  );
}
