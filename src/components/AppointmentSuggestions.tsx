"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chip, type ChipTone } from "@/src/components/ui";
import { useToast } from "@/src/context/ToastContext";
import { input as inputCls } from "@/src/lib/crm-ui";

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

type ModelOption = { id: string; name: string; group: string; provider: string; configured: boolean };
const MODEL_STORAGE_KEY = "noxy.suggestions.model";

const readStoredModel = () => {
  try {
    return localStorage.getItem(MODEL_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};
const storeModel = (id: string) => {
  try {
    if (id) localStorage.setItem(MODEL_STORAGE_KEY, id);
    else localStorage.removeItem(MODEL_STORAGE_KEY);
  } catch {
    // sin almacenamiento: el modelo elegido solo dura esta visita
  }
};

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
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelId, setModelId] = useState("");
  // Fallo de la IA que se puede resolver cambiando de modelo: se muestra con el motivo y un botón para reintentar.
  const [failure, setFailure] = useState<string | null>(null);
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

  // Modelos disponibles para elegir; si el recordado ya no existe (se ocultó o se quitó), se vuelve al predeterminado.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/models")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: ModelOption[]) => {
        if (cancelled || !Array.isArray(list)) return;
        setModels(list);
        const stored = readStoredModel();
        setModelId(list.some((m) => m.id === stored) ? stored : "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const chooseModel = (id: string) => {
    setModelId(id);
    storeModel(id);
  };

  const generate = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy("generate");
    setFailure(null);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelId ? { modelId } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; created?: number; total?: number };
      if (!res.ok) {
        const message = data.error ?? "No se pudieron generar sugerencias.";
        // Un fallo del proveedor o del modelo (502/503) se resuelve cambiando de modelo: queda a la vista con el motivo.
        if (res.status === 502 || res.status === 503) setFailure(message);
        else addToast(message, "error");
      } else {
        addToast(data.created ? `${data.created} sugerencias nuevas.` : data.total ? "No hay sugerencias nuevas: la IA repitió las que ya tienes." : "La IA no encontró nada que sugerir en las notas.", "success");
      }
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

      {models.length > 0 && (
        <label className="flex flex-col gap-1 text-xs font-semibold text-text-primary sm:max-w-sm">
          Modelo de IA
          <select value={modelId} onChange={(e) => chooseModel(e.target.value)} disabled={busy === "generate"} className={`${inputCls} font-normal`}>
            <option value="">Predeterminado (el de tu resumen diario)</option>
            {Array.from(new Set(models.map((m) => m.group))).map((group) => (
              <optgroup key={group} label={group}>
                {models
                  .filter((m) => m.group === group)
                  .map((m) => (
                    <option key={m.id} value={m.id} disabled={!m.configured}>
                      {m.name}
                      {m.configured ? "" : " — sin clave configurada"}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}

      {failure && (
        <div role="alert" className="space-y-2 rounded-control border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
          <p>{failure}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs">Prueba con otro modelo de la lista y vuelve a intentar.</span>
            <button type="button" className={smallBtn} onClick={generate} disabled={busy === "generate"}>
              Reintentar con este modelo
            </button>
          </div>
        </div>
      )}

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
