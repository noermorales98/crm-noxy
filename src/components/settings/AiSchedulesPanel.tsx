"use client";

import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { Switch } from "@/src/components/ui";
import { input as inputCls } from "@/src/lib/crm-ui";
import { KIND_LABEL, KINDS, type AiSchedule, type AiScheduleKind } from "@/src/lib/ai-schedules";

const btn =
  "crm-press inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface-elevated px-3 text-xs font-semibold text-text-primary hover:bg-surface-sidebar disabled:opacity-50 lg:min-h-9";
const iconBtn =
  "flex size-11 items-center justify-center rounded-control text-text-secondary-strong outline-none transition-colors hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40 lg:size-9";
const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function when(s: AiSchedule): string {
  const hour = `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
  if (s.frequency === "weekly") return `cada ${DAYS[s.weeklyDay]} a las ${hour}`;
  if (s.frequency === "monthly") return `el día ${s.monthlyDay} de cada mes a las ${hour}`;
  return `cada día a las ${hour}`;
}

const EMPTY = { kind: "prompt" as AiScheduleKind, name: "", prompt: "", days: "5", frequency: "weekly", weeklyDay: "1", monthlyDay: "1", hour: "8" };

/** Programaciones y alertas del asistente: ver, pausar, ejecutar ahora, borrar y crear. El resultado llega como un chat nuevo (y por WhatsApp si lo tienes configurado). */
export function AiSchedulesPanel() {
  const [items, setItems] = useState<AiSchedule[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/ai/schedules", { cache: "no-store" }).catch(() => null);
    setItems(res?.ok ? ((await res.json()) as AiSchedule[]) : []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const call = async (key: string, init: RequestInit, url = "/api/ai/schedules") => {
    setBusy(key);
    setMessage(null);
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init }).catch(() => null);
    setBusy(null);
    if (!res?.ok) {
      const error = res ? ((await res.json().catch(() => ({}))) as { error?: string }).error : undefined;
      setMessage({ type: "error", text: error ?? "No se pudo completar la acción." });
      return false;
    }
    await load();
    return true;
  };

  const create = async () => {
    const ok = await call("create", { method: "POST", body: JSON.stringify({ ...form, days: Number(form.days), weeklyDay: Number(form.weeklyDay), monthlyDay: Number(form.monthlyDay), hour: Number(form.hour) }) });
    if (ok) {
      setForm(EMPTY);
      setMessage({ type: "success", text: "Programación creada." });
    }
  };

  if (items === null) return null;

  return (
    <section aria-label="Programaciones del asistente" className="mt-8 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Programaciones y alertas</h2>
        <p className="text-sm text-text-secondary">La IA hace algo por ti a la hora que elijas, o te avisa cuando algo se atrasa. El resultado aparece como un chat nuevo en el asistente y, si tienes WhatsApp configurado, también llega por ahí.</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-surface border border-line px-3 py-4 text-sm text-text-secondary">Aún no tienes programaciones.</p>
      ) : (
        <ul className="divide-y divide-line rounded-surface border border-line">
          {items.map((s) => (
            <li key={s.id} className="space-y-1 px-3 py-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">{s.name}</p>
                  <p className="text-xs text-text-secondary">{KIND_LABEL[s.kind]}{s.kind === "stale_deals" || s.kind === "late_content" || s.kind === "overdue_payments" ? ` (${s.days}+ días)` : ""} · {when(s)}</p>
                  {s.kind === "prompt" && <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{s.prompt}</p>}
                </div>
                <Switch checked={s.enabled} disabled={busy !== null} label={`Activar ${s.name}`} onChange={(v: boolean) => void call(s.id, { method: "PATCH", body: JSON.stringify({ id: s.id, enabled: v }) })} />
                <button type="button" className={iconBtn} aria-label={`Ejecutar ahora ${s.name}`} title="Ejecutar ahora" disabled={busy !== null} onClick={() => void call(s.id, { method: "PATCH", body: JSON.stringify({ id: s.id, run: true }) })}>
                  <HugeiconsIcon icon={PlayIcon} size={16} aria-hidden="true" className={busy === s.id ? "animate-pulse" : undefined} />
                </button>
                <button type="button" className={iconBtn} aria-label={`Borrar ${s.name}`} disabled={busy !== null} onClick={() => void call(s.id, { method: "DELETE" }, `/api/ai/schedules?id=${encodeURIComponent(s.id)}`)}>
                  <HugeiconsIcon icon={Delete02Icon} size={16} aria-hidden="true" />
                </button>
              </div>
              {s.lastRunAt && (
                <p className="text-xs text-text-secondary">Última vez: {new Date(s.lastRunAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })} — {(s.lastResult ?? "").slice(0, 160)}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-surface border border-line p-3">
        <p className="text-sm font-semibold text-text-primary">Nueva programación</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select className={inputCls} aria-label="Qué hace" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as AiScheduleKind })}>
            {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
          <input className={inputCls} placeholder="Nombre (opcional)" aria-label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        {form.kind === "prompt" ? (
          <textarea className={`${inputCls} min-h-20`} placeholder="Qué quieres que haga la IA (ej. Dame el resumen de la semana: ventas, tareas y contenido)" aria-label="Pedido" value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} />
        ) : form.kind === "client_reports" ? (
          <p className="text-sm text-text-secondary">Crea en Docs un informe del mes anterior por cada cliente activo (cobros, contenido y videos). Conviene programarlo «cada mes» el día 1 o 2.</p>
        ) : (
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            Avisar cuando lleve
            <input className={`${inputCls} w-20`} type="number" min={1} max={90} aria-label="Días" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
            días o más
          </label>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          <select className={inputCls} aria-label="Frecuencia" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
            <option value="daily">Cada día</option>
            <option value="weekly">Cada semana</option>
            <option value="monthly">Cada mes</option>
          </select>
          {form.frequency === "weekly" && (
            <select className={inputCls} aria-label="Día de la semana" value={form.weeklyDay} onChange={(e) => setForm({ ...form, weeklyDay: e.target.value })}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          )}
          {form.frequency === "monthly" && (
            <input className={inputCls} type="number" min={1} max={28} aria-label="Día del mes" value={form.monthlyDay} onChange={(e) => setForm({ ...form, monthlyDay: e.target.value })} />
          )}
          <input className={inputCls} type="number" min={0} max={23} aria-label="Hora" value={form.hour} onChange={(e) => setForm({ ...form, hour: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className={btn} disabled={busy !== null} onClick={() => void create()}>Crear programación</button>
          {message && <p role="status" className={`text-xs ${message.type === "error" ? "text-danger" : "text-action-ink"}`}>{message.text}</p>}
        </div>
      </div>
    </section>
  );
}
