// Bus mínimo entre la barra de una cita y sus paneles (notas y sugerencias): la barra pide una acción y el panel dueño la ejecuta.
// Evita subir al padre el estado de las notas y de la IA solo para dos botones. Solo corre en el navegador.

export type AppointmentAction = "write" | "notion" | "sync" | "generate";

const ACTION_EVENT = "appointment-action";
const BUSY_EVENT = "appointment-busy";

export function requestAppointmentAction(action: AppointmentAction): void {
  window.dispatchEvent(new CustomEvent(ACTION_EVENT, { detail: { action } }));
}

export function onAppointmentAction(handler: (action: AppointmentAction) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<{ action: AppointmentAction }>).detail.action);
  window.addEventListener(ACTION_EVENT, listener);
  return () => window.removeEventListener(ACTION_EVENT, listener);
}

/** El panel avisa a la barra de que una acción está en curso (para mostrar «Sincronizando…» en su botón). */
export function reportAppointmentBusy(action: AppointmentAction, busy: boolean): void {
  window.dispatchEvent(new CustomEvent(BUSY_EVENT, { detail: { action, busy } }));
}

export function onAppointmentBusy(handler: (action: AppointmentAction, busy: boolean) => void): () => void {
  const listener = (event: Event) => {
    const { action, busy } = (event as CustomEvent<{ action: AppointmentAction; busy: boolean }>).detail;
    handler(action, busy);
  };
  window.addEventListener(BUSY_EVENT, listener);
  return () => window.removeEventListener(BUSY_EVENT, listener);
}

/** Origen de una nota de reunión, con su texto: lo que la persona ve como etiqueta. */
export type NoteSource = "GRANOLA" | "MANUAL" | "NOTION";

export const NOTE_SOURCE_INFO: Record<NoteSource, { label: string; hint: string }> = {
  GRANOLA: { label: "Granola", hint: "Sincronizada desde Granola" },
  MANUAL: { label: "Nota escrita", hint: "Escrita a mano en el CRM" },
  NOTION: { label: "Notion", hint: "Importada desde una página de Notion" },
};

/** Conteo por origen, para los filtros («2 de Granola · 1 escrita»). */
export function countBySource(notes: { source: NoteSource }[]): Record<NoteSource, number> {
  const out: Record<NoteSource, number> = { GRANOLA: 0, MANUAL: 0, NOTION: 0 };
  for (const n of notes) out[n.source] += 1;
  return out;
}

export function filterNotes<T extends { source: NoteSource }>(notes: T[], filter: NoteSource | "ALL"): T[] {
  return filter === "ALL" ? notes : notes.filter((n) => n.source === filter);
}
