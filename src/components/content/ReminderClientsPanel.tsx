"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/src/components/ui";
import { REMINDER_DAYS_OPTIONS } from "@/src/lib/content-reminder-options";

export type ReminderClientRow = {
  id: string;
  name: string;
  color: string;
  remindersEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  reminderDaysBefore: number;
  phones: number;
  scheduled: number;
};

const pad = (n: number) => String(n).padStart(2, "0");
const BUTTON = "inline-flex min-h-11 items-center rounded-control border border-line px-4 text-sm font-semibold text-text-primary outline-none transition-colors hover:bg-nav-hover focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50";

/** Interruptor de avisos por cliente, con acciones por lotes (todos / seleccionados) y horario común. */
export default function ReminderClientsPanel({ clients }: { clients: ReminderClientRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(clients);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [days, setDays] = useState("");

  async function send(clientIds: string[] | "all", enabled: boolean, extra: Record<string, number> = {}) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/content/reminders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientIds, enabled, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo guardar");
        return false;
      }
      const ids = clientIds === "all" ? rows.map((r) => r.id) : clientIds;
      setRows((prev) => prev.map((row) => (ids.includes(row.id) ? { ...row, remindersEnabled: enabled, ...("hour" in extra ? { reminderHour: extra.hour, reminderMinute: extra.minute ?? row.reminderMinute } : {}), ...("daysBefore" in extra ? { reminderDaysBefore: extra.daysBefore } : {}) } : row)));
      setMessage(`${enabled ? "Activados" : "Desactivados"}: ${data.clients} cliente(s)${enabled ? ` · ${data.itemsEnabled} pieza(s) futuras con aviso` : ""}.`);
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  const toggleSelected = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const target: string[] | "all" = selected.length > 0 ? selected : "all";
  const targetLabel = selected.length > 0 ? `${selected.length} seleccionado(s)` : "todos";

  function applySchedule() {
    const extra: Record<string, number> = {};
    if (time) {
      const [h, m] = time.split(":").map(Number);
      extra.hour = h;
      extra.minute = m;
    }
    if (days !== "") extra.daysBefore = Number(days);
    if (Object.keys(extra).length === 0) return setMessage("Elige una hora o los días de anticipación.");
    const enabledNow = target === "all" ? rows.every((r) => r.remindersEnabled) : rows.filter((r) => selected.includes(r.id)).every((r) => r.remindersEnabled);
    void send(target, enabledNow, extra);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || rows.length === 0} className={BUTTON} onClick={() => send(target, true)}>Activar {targetLabel}</button>
        <button type="button" disabled={busy || rows.length === 0} className={BUTTON} onClick={() => send(target, false)}>Desactivar {targetLabel}</button>
        {selected.length > 0 && (
          <button type="button" className="text-sm font-medium text-text-secondary underline-offset-2 hover:underline" onClick={() => setSelected([])}>Quitar selección</button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-control border border-line p-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Hora de aviso
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="min-h-11 rounded-control border border-line bg-surface-sidebar px-3 text-sm text-text-primary" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Anticipación
          <select value={days} onChange={(e) => setDays(e.target.value)} className="min-h-11 rounded-control border border-line bg-surface-sidebar px-3 text-sm text-text-primary">
            <option value="">Sin cambiar</option>
            {REMINDER_DAYS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy || rows.length === 0} className={BUTTON} onClick={applySchedule}>Aplicar a {targetLabel}</button>
      </div>

      {message && <p role="status" className="text-sm text-text-secondary">{message}</p>}

      <ul className="flex flex-col divide-y divide-line">
        {rows.map((row) => (
          <li key={row.id} className="flex min-h-12 items-center gap-3 py-2">
            <input
              type="checkbox"
              aria-label={`Seleccionar ${row.name}`}
              checked={selected.includes(row.id)}
              onChange={() => toggleSelected(row.id)}
              className="size-4 shrink-0 accent-[var(--color-action-ink)]"
            />
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-text-primary">{row.name}</span>
              <span className="block truncate text-xs tabular-nums text-text-secondary">
                {pad(row.reminderHour)}:{pad(row.reminderMinute)} · {REMINDER_DAYS_OPTIONS.find((o) => o.value === row.reminderDaysBefore)?.label ?? `${row.reminderDaysBefore} días antes`}
                {row.phones === 0 ? " · sin teléfono: no llegará" : ""}
                {row.remindersEnabled ? ` · ${row.scheduled} programada(s)` : ""}
              </span>
            </span>
            <Switch
              checked={row.remindersEnabled}
              disabled={busy}
              label={`Avisos de ${row.name}`}
              onChange={(next) => send([row.id], next)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
