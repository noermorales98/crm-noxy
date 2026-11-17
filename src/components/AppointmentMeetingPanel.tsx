"use client";

import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { Chip } from "@/src/components/ui";
import KbMarkdown from "@/src/components/kb/KbMarkdown";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { input as inputCls } from "@/src/lib/crm-ui";

type Item = { id: string; text: string; taskId: string | null; task: { id: string; title: string; isCompleted: boolean } | null };
type MeetingNote = {
  id: string;
  source: "GRANOLA" | "MANUAL" | "NOTION";
  title: string | null;
  url: string | null;
  startedAt: string | null;
  summary: string | null;
  privateNotes: string | null;
  items: Item[];
};
type Unassigned = { id: string; title: string | null; startedAt: string | null; itemCount: number };

const SOURCE_LABEL = { GRANOLA: "Granola", MANUAL: "Escrita a mano", NOTION: "Notion" } as const;
const when = (value: string | null) =>
  value ? new Date(value).toLocaleString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

/** Un enlace de nota solo se abre si es http(s): nada de `javascript:` ni `data:`. */
const safeHref = (url: string | null) => (url && /^https?:\/\//i.test(url) ? url : null);

const smallBtn =
  "crm-press inline-flex min-h-11 items-center rounded-control border border-line bg-surface-elevated px-3 text-xs font-semibold text-text-primary hover:bg-surface-sidebar disabled:opacity-50 lg:min-h-9";

/** Notas de la reunión de una cita (Granola, Notion o escritas a mano), en markdown con el estilo de `/kb`. */
export function AppointmentMeetingPanel({ appointmentId }: { appointmentId: string }) {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  const [notes, setNotes] = useState<MeetingNote[] | null>(null);
  const [unassigned, setUnassigned] = useState<Unassigned[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState<"write" | "notion" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftText, setDraftText] = useState("");
  const [notionUrl, setNotionUrl] = useState("");

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [mine, free] = await Promise.all([fetch(`/api/appointments/${appointmentId}/granola`), fetch("/api/granola/notes")]);
      if (!mine.ok) throw new Error();
      setNotes((await mine.json()) as MeetingNote[]);
      setUnassigned(free.ok ? ((await free.json()) as Unassigned[]) : []);
    } catch {
      setLoadError(true);
      setNotes([]);
    }
  }, [appointmentId]);

  useEffect(() => {
    setNotes(null);
    setAdding(null);
    setEditingId(null);
    void load();
  }, [load]);

  const call = async (key: string, url: string, init: RequestInit, ok: string) => {
    setBusy(key);
    try {
      const res = await fetch(url, init);
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        addToast(data.error ?? "No se pudo completar la acción.", "error");
        return false;
      }
      addToast(ok, "success");
      await load();
      return true;
    } catch {
      addToast("Error de red.", "error");
      return false;
    } finally {
      setBusy(null);
    }
  };
  const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const syncNow = () => call("sync", "/api/granola/sync", { method: "POST" }, "Granola sincronizado.");
  const createTask = (item: Item) => call(`task-${item.id}`, `/api/granola/items/${item.id}/task`, { method: "POST" }, "Tarea creada.");
  const link = (noteId: string) => call(`link-${noteId}`, `/api/granola/notes/${noteId}`, json("PATCH", { appointmentId: appointmentId }), "Sesión vinculada a la cita.");
  const unlink = async (note: MeetingNote) => {
    if (!(await confirm({ title: "Desvincular la sesión", description: "La nota deja de mostrarse en esta cita y queda como «sin asignar».", confirmText: "Desvincular", variant: "warning" }))) return;
    await call(`unlink-${note.id}`, `/api/granola/notes/${note.id}`, json("PATCH", { appointmentId: null }), "Sesión desvinculada.");
  };
  const remove = async (note: MeetingNote) => {
    if (!(await confirm({ title: "Borrar la nota", description: "Se borra la nota y sus pasos. Las tareas que ya creaste se conservan.", confirmText: "Borrar", variant: "danger" }))) return;
    await call(`del-${note.id}`, `/api/granola/notes/${note.id}`, { method: "DELETE" }, "Nota borrada.");
  };

  const saveNew = async () => {
    if (await call("save", `/api/appointments/${appointmentId}/notes`, json("POST", { title: draftTitle, markdown: draftText }), "Nota guardada.")) {
      setAdding(null);
      setDraftTitle("");
      setDraftText("");
    }
  };
  const saveEdit = async (note: MeetingNote) => {
    if (await call("save", `/api/granola/notes/${note.id}`, json("PATCH", { title: draftTitle, markdown: draftText }), "Nota actualizada.")) setEditingId(null);
  };
  const importNotion = async () => {
    if (await call("notion", `/api/appointments/${appointmentId}/notes/notion`, json("POST", { url: notionUrl }), "Página de Notion importada.")) {
      setAdding(null);
      setNotionUrl("");
    }
  };

  const startEdit = (note: MeetingNote) => {
    setEditingId(note.id);
    setDraftTitle(note.title ?? "");
    setDraftText(note.summary ?? "");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={smallBtn} onClick={() => { setAdding(adding === "write" ? null : "write"); setDraftTitle(""); setDraftText(""); }}>Escribir nota</button>
        <button type="button" className={smallBtn} onClick={() => setAdding(adding === "notion" ? null : "notion")}>Importar de Notion</button>
        <button type="button" className={smallBtn} onClick={syncNow} disabled={busy === "sync"}>{busy === "sync" ? "Sincronizando…" : "Sincronizar Granola"}</button>
      </div>

      <div className="space-y-5">
          {adding === "write" && (
            <div className="space-y-2 rounded-control border border-line p-3">
              <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Título (opcional)" className={inputCls} />
              <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} rows={8} placeholder={"Escribe en markdown.\n\n## Siguientes pasos\n- Enviar propuesta"} className={`${inputCls} font-mono text-sm`} />
              <div className="flex justify-end gap-2">
                <button type="button" className={smallBtn} onClick={() => setAdding(null)}>Cancelar</button>
                <button type="button" className={smallBtn} onClick={saveNew} disabled={busy === "save" || !draftText.trim()}>Guardar nota</button>
              </div>
            </div>
          )}
          {adding === "notion" && (
            <div className="space-y-2 rounded-control border border-line p-3">
              <input value={notionUrl} onChange={(e) => setNotionUrl(e.target.value)} placeholder="Enlace o id de la página de Notion" className={inputCls} />
              <p className="text-xs text-text-secondary">La página debe estar compartida con la integración de Notion. Importarla otra vez la actualiza.</p>
              <div className="flex justify-end gap-2">
                <button type="button" className={smallBtn} onClick={() => setAdding(null)}>Cancelar</button>
                <button type="button" className={smallBtn} onClick={importNotion} disabled={busy === "notion" || !notionUrl.trim()}>{busy === "notion" ? "Importando…" : "Importar"}</button>
              </div>
            </div>
          )}

          {notes === null ? (
            <p className="text-sm text-text-secondary">Cargando…</p>
          ) : loadError ? (
            <p role="alert" className="text-sm text-danger">No se pudo cargar la reunión.</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-text-secondary">Esta cita aún no tiene notas. Sincroniza Granola, escribe una nota o importa una página de Notion.</p>
          ) : (
            notes.map((note) => {
              const editable = note.source !== "GRANOLA";
              const tasks = note.items.filter((item) => item.task);
              return (
                <section key={note.id} aria-label={note.title ?? "Nota"} className="space-y-3 rounded-control border border-line p-4">
                  <header className="flex flex-wrap items-center gap-2">
                    <h4 className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{note.title || "Sin título"}</h4>
                    <Chip>{SOURCE_LABEL[note.source]}</Chip>
                    {safeHref(note.url) && <a href={safeHref(note.url)!} target="_blank" rel="noreferrer" className="text-xs font-medium text-action-primary underline">Abrir</a>}
                    {editable && editingId !== note.id && (
                      <>
                        <button type="button" aria-label="Editar nota" onClick={() => startEdit(note)} className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover lg:size-9"><HugeiconsIcon icon={PencilEdit01Icon} size={16} /></button>
                        <button type="button" aria-label="Borrar nota" onClick={() => remove(note)} className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-danger-soft hover:text-danger lg:size-9"><HugeiconsIcon icon={Delete02Icon} size={16} /></button>
                      </>
                    )}
                    {!editable && <button type="button" className={smallBtn} onClick={() => unlink(note)}>Desvincular</button>}
                  </header>
                  {note.startedAt && <p className="text-xs text-text-secondary">{when(note.startedAt)}</p>}

                  {editingId === note.id ? (
                    <div className="space-y-2">
                      <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className={inputCls} aria-label="Título" />
                      <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} rows={10} className={`${inputCls} font-mono text-sm`} aria-label="Texto en markdown" />
                      <div className="flex justify-end gap-2">
                        <button type="button" className={smallBtn} onClick={() => setEditingId(null)}>Cancelar</button>
                        <button type="button" className={smallBtn} onClick={() => saveEdit(note)} disabled={busy === "save" || !draftText.trim()}>Guardar</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h5 className="mb-1 text-xs font-semibold text-text-secondary">Resumen</h5>
                      {note.summary ? <KbMarkdown content={note.summary} allowImages={false} /> : <p className="text-sm text-text-secondary">Sin resumen.</p>}
                    </div>
                  )}

                  {note.privateNotes && (
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold text-text-secondary">Notas</summary>
                      <KbMarkdown content={note.privateNotes} allowImages={false} />
                    </details>
                  )}

                  <div>
                    <h5 className="mb-1 text-xs font-semibold text-text-secondary">Pasos</h5>
                    {note.items.length === 0 ? (
                      <p className="text-sm text-text-secondary">No se detectaron pasos. Usa un encabezado como «Siguientes pasos» o casillas «- [ ]».</p>
                    ) : (
                      <ul className="divide-y divide-line">
                        {note.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-3 py-2">
                            <span className="min-w-0 flex-1 text-sm text-text-primary">{item.text}</span>
                            {item.taskId ? <Chip tone="done">Tarea creada</Chip> : <button type="button" className={smallBtn} disabled={busy === `task-${item.id}`} onClick={() => createTask(item)}>Crear tarea</button>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {tasks.length > 0 && (
                    <div>
                      <h5 className="mb-1 text-xs font-semibold text-text-secondary">Tareas</h5>
                      <ul className="space-y-1">
                        {tasks.map((item) => (
                          <li key={item.id} className="flex items-center gap-2 text-sm text-text-primary">
                            <Chip tone={item.task!.isCompleted ? "done" : "neutral"}>{item.task!.isCompleted ? "Hecha" : "Pendiente"}</Chip>
                            <span className="min-w-0 truncate">{item.task!.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              );
            })
          )}

          {unassigned.length > 0 && (
            <section aria-label="Sesiones sin asignar" className="space-y-2">
              <h4 className="text-xs font-semibold text-text-secondary">Sesiones sin asignar</h4>
              <ul className="divide-y divide-line rounded-control border border-line">
                {unassigned.map((note) => (
                  <li key={note.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text-primary">{note.title || "Sin título"}</span>
                      <span className="block text-xs text-text-secondary">{when(note.startedAt)}{note.itemCount ? ` · ${note.itemCount} pasos` : ""}</span>
                    </span>
                    <button type="button" className={smallBtn} disabled={busy === `link-${note.id}`} onClick={() => link(note.id)}>Vincular a esta cita</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
      </div>
    </div>
  );
}
