"use client";

import { useCallback, useEffect, useState } from "react";
import { Block } from "@/src/components/ui";
import { input as inputCls } from "@/src/lib/crm-ui";

type Key = { id: string; name: string; keyPrefix: string; revokedAt: string | null; lastUsedAt: string | null; createdAt: string };
type Activity = { id: string; tool: string; ok: boolean; error: string | null; createdAt: string; agentKey: { name: string } };

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "nunca");

/** Claves de agentes externos (OpenClaw / Kimi Claw): crear, copiar una sola vez, revocar y ver qué hicieron. */
export function AgentKeys() {
  const [keys, setKeys] = useState<Key[] | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<{ name: string; token: string } | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/agent-keys");
    if (res.status === 403) { setKeys([]); setMsg({ type: "error", text: "Solo el dueño o un administrador puede ver las claves de agentes." }); return; }
    if (!res.ok) { setKeys([]); return; }
    const data = (await res.json()) as { keys: Key[]; activity: Activity[] };
    setKeys(data.keys);
    setActivity(data.activity);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/agent-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ type: "error", text: data.error ?? "No se pudo crear la clave." }); return; }
      setFresh({ name: data.name, token: data.token });
      setName("");
      await load();
    } finally { setBusy(false); }
  }

  async function revoke(k: Key) {
    if (!confirm(`¿Revocar la clave «${k.name}»? El agente dejará de poder entrar de inmediato.`)) return;
    const res = await fetch(`/api/agent-keys/${k.id}`, { method: "DELETE" });
    setMsg(res.ok ? { type: "success", text: `Clave «${k.name}» revocada.` } : { type: "error", text: "No se pudo revocar." });
    await load();
  }

  return (
    <Block title="Agentes externos (OpenClaw / Kimi Claw)">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <p className="text-sm text-text-secondary">
          Cada agente usa su propia clave: puede consultar el CRM y crear tareas, leads, contactos, notas y borradores de correo. No puede enviar correos, borrar, cobrar ni administrar. Se revoca aquí sin afectar nada más.
        </p>
        {msg && <p role="status" className={`rounded-control px-4 py-2.5 text-sm font-medium ${msg.type === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{msg.text}</p>}
        {fresh && (
          <div className="flex flex-col gap-2 rounded-control border border-line bg-surface-sidebar p-3">
            <p className="text-sm font-medium text-text-primary">Clave de «{fresh.name}». Cópiala ahora: no se vuelve a mostrar.</p>
            <code className="break-all rounded-control bg-surface-elevated px-3 py-2 text-xs">{fresh.token}</code>
            <div className="flex gap-2">
              <button type="button" className="rounded-control bg-action-primary px-3 py-1.5 text-sm text-action-primary-foreground" onClick={() => void navigator.clipboard.writeText(fresh.token)}>Copiar</button>
              <button type="button" className="rounded-control px-3 py-1.5 text-sm text-text-secondary hover:bg-nav-hover" onClick={() => setFresh(null)}>Ya la guardé</button>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className={inputCls} placeholder="Nombre del agente (ej. OpenClaw Kimi)" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          <button type="button" disabled={busy || !name.trim()} onClick={() => void create()} className="rounded-control bg-action-primary px-4 py-2 text-sm text-action-primary-foreground disabled:opacity-50">Crear clave</button>
        </div>
        {keys && keys.length > 0 && (
          <ul className="flex flex-col divide-y divide-line">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-text-primary">{k.name} <span className="font-mono text-xs text-text-secondary">{k.keyPrefix}…</span></p>
                  <p className="text-xs text-text-secondary">{k.revokedAt ? `Revocada ${fmt(k.revokedAt)}` : `Último uso: ${fmt(k.lastUsedAt)}`}</p>
                </div>
                {!k.revokedAt && <button type="button" onClick={() => void revoke(k)} className="shrink-0 rounded-control px-3 py-1.5 text-sm text-danger hover:bg-danger-soft">Revocar</button>}
              </li>
            ))}
          </ul>
        )}
        {activity.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm font-medium text-text-primary">Actividad reciente ({activity.length})</summary>
            <ul className="mt-2 flex flex-col gap-1 text-xs text-text-secondary">
              {activity.map((a) => (
                <li key={a.id}>{fmt(a.createdAt)} · {a.agentKey.name} · <span className="font-mono">{a.tool}</span> · {a.ok ? "ok" : `error: ${a.error ?? ""}`}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Block>
  );
}
