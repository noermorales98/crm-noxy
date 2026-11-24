"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Cancel01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Switch } from "@/src/components/ui";
import { input as inputCls } from "@/src/lib/crm-ui";

type Provider = "nvidia" | "openrouter";
type Account = { id: string; label: string; mask: string; source: "db" | "env"; enabled: boolean; failing: boolean; lastStatus: number | null; failedAt: string | null };
type ProviderBlock = { provider: Provider; accounts: Account[]; unreadable: boolean };
type Prefs = { defaultModelId: string | null; autoSwitch: boolean; fallbackModelIds: string[] };
type Model = { id: string; name: string; group: string; provider: Provider; configured: boolean };
type Message = { type: "success" | "error"; text: string } | null;

const PROVIDER_TEXT: Record<Provider, { name: string; hint: string; placeholder: string }> = {
  openrouter: { name: "OpenRouter", hint: "Crea la clave en openrouter.ai › Keys. Puedes agregar varias cuentas.", placeholder: "sk-or-v1-…" },
  nvidia: { name: "NVIDIA", hint: "Genera la clave en build.nvidia.com (Get API Key). Puedes agregar las cuentas que quieras.", placeholder: "nvapi-…" },
};

const btn =
  "crm-press inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface-elevated px-3 text-xs font-semibold text-text-primary hover:bg-surface-sidebar disabled:opacity-50 lg:min-h-9";
const iconBtn =
  "flex size-11 items-center justify-center rounded-control text-text-secondary-strong outline-none transition-colors hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40 lg:size-9";

/** Por qué una cuenta falló, en palabras. */
function failureText(status: number | null): string {
  if (status === 402) return "sin crédito";
  if (status === 401 || status === 403) return "clave rechazada";
  if (status === 429) return "límite de uso";
  if (status === 0 || status === 502) return "sin respuesta útil";
  return "el proveedor falló";
}

/** Cuentas de IA (varias por proveedor), modelo predeterminado y cambio automático cuando algo deja de funcionar. */
export function AiProviderKeys() {
  const [blocks, setBlocks] = useState<ProviderBlock[] | null>(null);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [drafts, setDrafts] = useState<Record<Provider, { label: string; key: string }>>({ nvidia: { label: "", key: "" }, openrouter: { label: "", key: "" } });

  const apply = (data: { providers?: ProviderBlock[]; prefs?: Prefs }) => {
    if (data.providers) setBlocks(data.providers);
    if (data.prefs) setPrefs(data.prefs);
  };

  const load = useCallback(async () => {
    try {
      const [accounts, list] = await Promise.all([fetch("/api/settings/ai-accounts", { cache: "no-store" }), fetch("/api/ai/models", { cache: "no-store" })]);
      if (!accounts.ok) throw new Error();
      apply(await accounts.json());
      if (list.ok) setModels((await list.json()) as Model[]);
    } catch {
      setBlocks([]);
      setMessage({ type: "error", text: "No se pudo cargar el estado de las cuentas." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async (url: string, init: RequestInit, success?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(url, init);
      const data = (await res.json().catch(() => ({}))) as { error?: string; warning?: string | null; providers?: ProviderBlock[]; prefs?: Prefs } & Partial<Prefs>;
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "No se pudo guardar." });
        return false;
      }
      if (data.providers) apply(data);
      else if ("autoSwitch" in data) setPrefs(data as Prefs);
      setMessage({ type: "success", text: data.warning ?? success ?? "Guardado." });
      return true;
    } finally {
      setBusy(false);
    }
  };

  const json = (body: unknown): RequestInit => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const addAccount = async (event: React.FormEvent, provider: Provider) => {
    event.preventDefault();
    const draft = drafts[provider];
    const ok = await send("/api/settings/ai-accounts", { method: "POST", ...json({ provider, label: draft.label, apiKey: draft.key }) }, `Cuenta de ${PROVIDER_TEXT[provider].name} agregada.`);
    if (ok) setDrafts((d) => ({ ...d, [provider]: { label: "", key: "" } }));
  };

  const patchAccount = (provider: Provider, id: string, body: Record<string, unknown>, success?: string) => send("/api/settings/ai-accounts", { method: "PATCH", ...json({ provider, id, ...body }) }, success);

  const removeAccount = (provider: Provider, account: Account) => {
    if (!confirm(`¿Quitar la cuenta «${account.label}» de ${PROVIDER_TEXT[provider].name}?`)) return;
    void send(`/api/settings/ai-accounts?provider=${provider}&id=${encodeURIComponent(account.id)}`, { method: "DELETE" }, "Cuenta quitada.");
  };

  const savePrefs = (patch: Partial<Prefs>, success?: string) => send("/api/settings/ai-prefs", { method: "PATCH", ...json(patch) }, success);

  const grouped = useMemo(() => {
    const out = new Map<string, Model[]>();
    for (const m of models) out.set(m.group, [...(out.get(m.group) ?? []), m]);
    return [...out.entries()];
  }, [models]);
  const nameOf = (id: string) => models.find((m) => m.id === id)?.name ?? id.replace(/^nvidia:/, "").split("/").pop() ?? id;

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-line bg-surface-elevated">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-text-primary">Cuentas de IA</h2>
          <p className="mt-0.5 text-xs text-text-secondary">Agrega todas las cuentas que quieras. Se usan en el orden de la lista y, si una falla (sin crédito, clave rechazada o límite de uso), se pasa a la siguiente. Las claves se guardan cifradas y no se vuelven a mostrar.</p>
        </div>
        <div className="flex flex-col gap-5 px-5 py-4">
          {message && (
            <p role="status" className={`rounded-control px-4 py-2.5 text-sm font-medium ${message.type === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
              {message.text}
            </p>
          )}
          {blocks === null ? (
            <p className="text-sm text-text-secondary">Cargando…</p>
          ) : (
            blocks.map(({ provider, accounts, unreadable }) => (
              <section key={provider} aria-label={`Cuentas de ${PROVIDER_TEXT[provider].name}`} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-text-primary">{PROVIDER_TEXT[provider].name}</h3>
                {unreadable && <p className="text-xs text-danger">Hay claves guardadas que ya no se pueden leer (cambió la clave de cifrado del servidor). Quítalas y agrega las cuentas de nuevo.</p>}
                {accounts.length === 0 ? (
                  <p className="text-xs text-text-secondary">Sin cuentas todavía.</p>
                ) : (
                  <ul className="flex flex-col">
                    {accounts.map((account, index) => (
                      <li key={account.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line py-2 first:border-t-0">
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-sm text-text-primary">
                            <span className="truncate font-medium">{account.label}</span>
                            <span className="text-xs text-text-secondary tabular-nums">{account.mask}</span>
                            <span className="rounded-full bg-nav-hover px-2 py-0.5 text-xs text-text-secondary">{account.source === "env" ? "Servidor" : "Guardada"}</span>
                            {account.failing && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">Falló: {failureText(account.lastStatus)}</span>}
                            {account.source === "db" && !account.enabled && <span className="rounded-full bg-nav-hover px-2 py-0.5 text-xs text-text-secondary">Apagada</span>}
                          </p>
                        </div>
                        {account.source === "db" && (
                          <div className="flex items-center gap-1">
                            <Switch checked={account.enabled} onChange={(enabled) => void patchAccount(provider, account.id, { enabled })} label={`Usar la cuenta ${account.label}`} disabled={busy} />
                            <button type="button" className={iconBtn} aria-label={`Subir ${account.label}`} disabled={busy || index === 0} onClick={() => void patchAccount(provider, account.id, { move: "up" })}>
                              <HugeiconsIcon icon={ArrowDown01Icon} size={16} aria-hidden="true" className="rotate-180" />
                            </button>
                            <button type="button" className={iconBtn} aria-label={`Bajar ${account.label}`} disabled={busy || index >= accounts.filter((a) => a.source === "db").length - 1} onClick={() => void patchAccount(provider, account.id, { move: "down" })}>
                              <HugeiconsIcon icon={ArrowDown01Icon} size={16} aria-hidden="true" />
                            </button>
                            <button type="button" className={iconBtn} aria-label={`Quitar ${account.label}`} disabled={busy} onClick={() => removeAccount(provider, account)}>
                              <HugeiconsIcon icon={Delete02Icon} size={16} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <form onSubmit={(e) => void addAccount(e, provider)} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-text-primary sm:w-44">
                    Nombre (opcional)
                    <input value={drafts[provider].label} onChange={(e) => setDrafts((d) => ({ ...d, [provider]: { ...d[provider], label: e.target.value } }))} placeholder="Cuenta de Ana" maxLength={40} className={`${inputCls} font-normal`} />
                  </label>
                  <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-text-primary">
                    Clave
                    <input type="password" autoComplete="off" value={drafts[provider].key} onChange={(e) => setDrafts((d) => ({ ...d, [provider]: { ...d[provider], key: e.target.value } }))} placeholder={PROVIDER_TEXT[provider].placeholder} className={`${inputCls} font-normal`} />
                  </label>
                  <button type="submit" className={btn} disabled={busy || !drafts[provider].key.trim()}>
                    {busy ? "Validando…" : "Agregar cuenta"}
                  </button>
                </form>
                <p className="text-xs text-text-secondary">{PROVIDER_TEXT[provider].hint}</p>
              </section>
            ))
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface-elevated">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-text-primary">Modelo predeterminado y respaldo</h2>
          <p className="mt-0.5 text-xs text-text-secondary">Es el que usan las funciones de IA cuando no eliges uno (borradores, ideas, sugerencias). El resumen diario tiene su propio modelo en Resumen diario.</p>
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          {!prefs ? (
            <p className="text-sm text-text-secondary">Cargando…</p>
          ) : (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
                Modelo predeterminado
                <select value={prefs.defaultModelId ?? ""} disabled={busy} onChange={(e) => void savePrefs({ defaultModelId: e.target.value || null }, "Modelo predeterminado guardado.")} className={`${inputCls} font-normal`}>
                  <option value="">Automático (el de siempre)</option>
                  {grouped.map(([group, list]) => (
                    <optgroup key={group} label={group}>
                      {list.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}{m.configured ? "" : " (sin cuenta)"}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <div className="flex items-start gap-3">
                <Switch checked={prefs.autoSwitch} onChange={(autoSwitch) => void savePrefs({ autoSwitch }, autoSwitch ? "Cambio automático encendido." : "Cambio automático apagado.")} label="Cambiar de modelo solo si falla" disabled={busy} />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Cambiar de modelo solo si falla</p>
                  <p className="text-xs text-text-secondary">Si ninguna cuenta del modelo elegido responde, se prueba otro. Si el motivo no se arregla solo (sin crédito, clave rechazada o modelo retirado), el que sí responde queda como predeterminado.</p>
                </div>
              </div>

              {prefs.autoSwitch && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-text-primary">Modelos de respaldo, en orden</p>
                  {prefs.fallbackModelIds.length === 0 ? (
                    <p className="text-xs text-text-secondary">Sin respaldos fijos: se probarán los ligeros de NVIDIA y el gratuito de OpenRouter si tienes cuenta.</p>
                  ) : (
                    <ol className="flex flex-wrap gap-2">
                      {prefs.fallbackModelIds.map((id, i) => (
                        <li key={id} className="flex items-center gap-1 rounded-full bg-nav-hover py-1 pl-3 pr-1 text-xs text-text-primary">
                          {i + 1}. {nameOf(id)}
                          <button type="button" aria-label={`Quitar respaldo ${nameOf(id)}`} disabled={busy} className="flex size-8 items-center justify-center rounded-full hover:bg-nav-active" onClick={() => void savePrefs({ fallbackModelIds: prefs.fallbackModelIds.filter((x) => x !== id) })}>
                            <HugeiconsIcon icon={Cancel01Icon} size={12} aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                  {prefs.fallbackModelIds.length < 3 && (
                    <label className="flex flex-col gap-1 text-xs font-semibold text-text-primary sm:max-w-sm">
                      Agregar un respaldo
                      <select value="" disabled={busy} onChange={(e) => e.target.value && void savePrefs({ fallbackModelIds: [...prefs.fallbackModelIds, e.target.value] }, "Respaldo agregado.")} className={`${inputCls} font-normal`}>
                        <option value="">Elegir modelo…</option>
                        {grouped.map(([group, list]) => (
                          <optgroup key={group} label={group}>
                            {list.filter((m) => !prefs.fallbackModelIds.includes(m.id)).map((m) => (
                              <option key={m.id} value={m.id}>{m.name}{m.configured ? "" : " (sin cuenta)"}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
