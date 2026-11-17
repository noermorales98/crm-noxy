"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chip, type ChipTone } from "@/src/components/ui";
import { useToast } from "@/src/context/ToastContext";

type Suggestion = {
  id: string;
  type: "TASK" | "APPOINTMENT" | "CONTACT" | "SUGGESTION";
  title: string;
  detail: string | null;
  payload: Record<string, unknown>;
  status: "PENDING" | "ACCEPTED" | "DISMISSED";
};

const TYPE_LABEL: Record<Suggestion["type"], string> = { TASK: "Tarea", APPOINTMENT: "Cita de seguimiento", CONTACT: "Contacto nuevo", SUGGESTION: "Recomendación" };
const TYPE_TONE: Record<Suggestion["type"], ChipTone> = { TASK: "neutral", APPOINTMENT: "hot", CONTACT: "done", SUGGESTION: "neutral" };
const ADD_LABEL: Record<Suggestion["type"], string> = { TASK: "Agregar tarea", APPOINTMENT: "Agendar cita", CONTACT: "Crear contacto", SUGGESTION: "Aceptar" };

const smallBtn =
  "crm-press inline-flex min-h-11 items-center rounded-control border border-line bg-surface-elevated px-3 text-xs font-semibold text-text-primary hover:bg-surface-sidebar disabled:opacity-50 lg:min-h-9";
const primaryBtn =
  "crm-press inline-flex min-h-11 items-center rounded-control bg-action-primary px-4 text-xs font-semibold text-action-primary-foreground hover:bg-action-secondary disabled:opacity-50 lg:min-h-9";

const text = (value: unknown) => (typeof value === "string" && value ? value : null);

function facts(s: Suggestion): string[] {
  const p = s.payload;
  if (s.type === "TASK") return text(p.dueDate) ? [`Fecha límite: ${text(p.dueDate)}`] : [];
  if (s.type === "APPOINTMENT") return [`${text(p.date) ?? ""} · ${text(p.time) ?? ""} · ${typeof p.durationMinutes === "number" ? p.durationMinutes : 30} min`];
  if (s.type === "CONTACT") return [text(p.email), text(p.phone), text(p.company)].filter((v): v is string => Boolean(v));
  return [];
}

/** Sugerencias de la IA para la cita: se listan, y el usuario decide cuáles agregar al CRM y cuáles descartar. */
export function AppointmentSuggestions({ appointmentId }: { appointmentId: string }) {
  const { addToast } = useToast();
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const inFlight = useRef(false); // un doble clic rápido no envía dos veces
  const loadSeq = useRef(0); // una carga vieja no pisa a una más reciente

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/suggestions`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Suggestion[];
      if (seq !== loadSeq.current) return;
      setItems(data);
      setLoadError(false);
    } catch {
      if (seq !== loadSeq.current) return;
      setLoadError(true);
      setItems((current) => current ?? []);
    }
  }, [appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy("generate");
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/suggestions`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; created?: number; total?: number };
      if (!res.ok) addToast(data.error ?? "No se pudieron generar sugerencias.", "error");
      else addToast(data.created ? `${data.created} sugerencias nuevas.` : data.total ? "No hay sugerencias nuevas: la IA repitió las que ya tienes." : "La IA no encontró nada que sugerir en las notas.", "success");
      await load();
    } catch {
      addToast("Error de red.", "error");
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const decide = async (s: Suggestion, action: "accept" | "dismiss") => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(`${action}-${s.id}`);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/suggestions/${s.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) addToast(data.error ?? "No se pudo completar la acción.", "error");
      else addToast(action === "accept" ? (data.message ?? "Sugerencia agregada.") : "Sugerencia descartada.", "success");
      await load();
    } catch {
      addToast("Error de red.", "error");
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const pending = (items ?? []).filter((s) => s.status === "PENDING");
  const decided = (items ?? []).filter((s) => s.status !== "PENDING");

  return (
    <section aria-label="Sugerencias de la IA" className="space-y-3 rounded-control border border-line p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 flex-1 text-sm font-semibold text-text-primary">Sugerencias de la IA</h2>
        <button type="button" className={primaryBtn} onClick={generate} disabled={busy === "generate"}>
          {busy === "generate" ? "Leyendo las notas…" : items && items.length ? "Generar de nuevo" : "Generar sugerencias"}
        </button>
      </header>
      <p className="text-xs text-text-secondary">La IA lee las notas de esta cita y propone acciones. No se crea nada hasta que tú lo agregues.</p>

      {items === null ? (
        <p className="text-sm text-text-secondary">Cargando…</p>
      ) : loadError ? (
        <p role="alert" className="text-sm text-danger">No se pudieron cargar las sugerencias.</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-text-secondary">{items.length ? "No quedan sugerencias pendientes." : "Aún no hay sugerencias. Genera desde las notas de la cita."}</p>
      ) : (
        <ul className="divide-y divide-line">
          {pending.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={TYPE_TONE[s.type]}>{TYPE_LABEL[s.type]}</Chip>
                  <p className="text-sm font-semibold text-text-primary">{s.title}</p>
                </div>
                {s.detail && <p className="text-sm text-text-secondary">{s.detail}</p>}
                {facts(s).length > 0 && <p className="text-xs text-text-secondary">{facts(s).join(" · ")}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" className={primaryBtn} disabled={busy !== null} onClick={() => decide(s, "accept")}>{ADD_LABEL[s.type]}</button>
                <button type="button" className={smallBtn} disabled={busy !== null} onClick={() => decide(s, "dismiss")}>Descartar</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs font-semibold text-text-secondary">Ya decididas ({decided.length})</summary>
          <ul className="mt-2 space-y-1">
            {decided.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                <Chip tone={s.status === "ACCEPTED" ? "done" : "neutral"}>{s.status === "ACCEPTED" ? "Agregada" : "Descartada"}</Chip>
                <span className="min-w-0 truncate">{TYPE_LABEL[s.type]}: {s.title}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
