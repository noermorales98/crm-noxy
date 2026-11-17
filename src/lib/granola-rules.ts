/** Reglas de las notas de reunión y de sus pasos. Funciones puras: las rutas solo las aplican. */

/** Solo las notas escritas a mano o importadas de Notion se editan o borran aquí; las de Granola cambian solo desde Granola. */
export const isEditableNote = (source: string): boolean => source === "MANUAL" || source === "NOTION";

type TaskSource = {
  title: string | null;
  url: string | null;
  appointment: { contactId: string | null; dealId: string | null } | null;
};

/** Datos de la Tarea que nace de un paso: ligada al contacto y al lead de la cita (si los tiene). */
export function buildTaskData(item: { text: string }, note: TaskSource) {
  return {
    title: item.text.trim().slice(0, 190),
    description: `Paso de la reunión «${note.title ?? "sin título"}»${note.url ? `\n${note.url}` : ""}`,
    contactId: note.appointment?.contactId ?? null,
    dealId: note.appointment?.dealId ?? null,
  };
}
