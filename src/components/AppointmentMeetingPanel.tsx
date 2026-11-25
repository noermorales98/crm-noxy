"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon, Link01Icon, Notion01Icon, PencilEdit01Icon, ReloadIcon } from "@hugeicons/core-free-icons";
import { Segmented } from "@/src/components/ui";
import KbMarkdown from "@/src/components/kb/KbMarkdown";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { input as inputCls } from "@/src/lib/crm-ui";
import { extractMarkdownTitle } from "@/src/lib/markdown-title";
import { NOTE_SOURCE_INFO, countBySource, filterNotes, onAppointmentAction, reportAppointmentBusy, reportLinkedGranola, showUnassignedSessions, type NoteSource } from "@/src/lib/appointment-actions";

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

const when = (value: string | null) =>
  value ? new Date(value).toLocaleString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

/** Un enlace de nota solo se abre si es http(s): nada de `javascript:` ni `data:`. */
const safeHref = (url: string | null) => (url && /^https?:\/\//i.test(url) ? url : null);

const smallBtn =
  "crm-press inline-flex min-h-11 items-center rounded-control border border-line bg-surface-elevated px-3 text-xs font-semibold text-text-primary hover:bg-surface-sidebar disabled:opacity-50 lg:min-h-9";

function NoteEditor({
  draftText,
  setDraftText,
  draftTitle,
  setDraftTitle,
  onCancel,
  onSave,
  busy,
  showTitleField,
}: {
  draftText: string;
  setDraftText: (v: string) => void;
  draftTitle: string;
  setDraftTitle: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  busy: boolean;
  showTitleField: boolean;
}) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const detected = useMemo(() => extractMarkdownTitle(draftText), [draftText]);
  const liveTitle = detected.title ?? (draftTitle.trim() || null);

  return (
    <div className="space-y-2">
      {liveTitle ? (
        <p className="text-sm font-semibold text-text-primary">{liveTitle}</p>
      ) : showTitleField ? (
        <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Título (opcional, o usa # en el markdown)" className={inputCls} />
      ) : null}
      <div className="flex gap-1 text-[11px] font-semibold text-text-secondary">
        <button type="button" className={`rounded-control px-2 py-1 ${mode === "write" ? "bg-surface-sidebar text-text-primary" : "hover:bg-nav-hover"}`} onClick={() => setMode("write")}>
          Escribir
        </button>
        <button type="button" className={`rounded-control px-2 py-1 ${mode === "preview" ? "bg-surface-sidebar text-text-primary" : "hover:bg-nav-hover"}`} onClick={() => setMode("preview")}>
          Vista previa
        </button>
      </div>
      {mode === "write" ? (
        <textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          rows={10}
          placeholder={"# Título de la nota\n\nEscribe en markdown.\n\n## Contexto\n- …"}
          className={`${inputCls} font-mono text-sm`}
          aria-label="Texto en markdown"
        />
      ) : (
        <div className="min-h-[12rem] rounded-control border border-line bg-surface-elevated p-3">
          {detected.body.trim() || (!detected.title && draftText.trim()) ? (
            <KbMarkdown content={detected.title ? detected.body : draftText} allowImages={false} className="kb-compact" />
          ) : detected.title ? (
            <p className="text-sm text-text-secondary">Solo título; el cuerpo queda vacío.</p>
          ) : (
            <p className="text-sm text-text-secondary">Nada que previsualizar.</p>
          )}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className={smallBtn} onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className={smallBtn} onClick={onSave} disabled={busy || !draftText.trim()}>
          Guardar
        </button>
      </div>
    </div>
  );
}

const SOURCE_ICON = { GRANOLA: ReloadIcon, MANUAL: PencilEdit01Icon, NOTION: Notion01Icon } as const;
/** Origen de una nota: icono y texto discretos, para distinguir una nota de Granola de una escrita a mano o de Notion. */
function SourceLabel({ source }: { source: NoteSource }) {
  const info = NOTE_SOURCE_INFO[source];
  return (
    <span title={info.hint} className="inline-flex items-center gap-1.5 font-medium text-text-secondary-strong">
      <HugeiconsIcon icon={SOURCE_ICON[source]} size={12} aria-hidden="true" />
      {info.label}
    </span>
  );
}

const iconBtn =
  "flex size-11 items-center justify-center rounded-control text-text-secondary-strong outline-none transition-colors hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus lg:size-9";

/** Notas de la reunión de una cita (Granola, Notion o escritas a mano), en markdown con el estilo de `/kb`. Son el centro de la pantalla. */
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
  const [filter, setFilter] = useState<NoteSource | "ALL">("ALL");

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
      window.dispatchEvent(new CustomEvent("meeting-notes-changed"));
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
  const link = (noteId: string) => call(`link-${noteId}`, `/api/granola/notes/${noteId}`, json("PATCH", { appointmentId: appointmentId }), "Sesión vinculada a la cita.");
  const unlink = async (note: { id: string }) => {
    if (!(await confirm({ title: "Desvincular la sesión", description: "La nota deja de mostrarse en esta cita y queda como «sin asignar».", confirmText: "Desvincular", variant: "warning" }))) return;
    await call(`unlink-${note.id}`, `/api/granola/notes/${note.id}`, json("PATCH", { appointmentId: null }), "Sesión desvinculada.");
  };
  const remove = async (note: MeetingNote) => {
    if (!(await confirm({ title: "Borrar la nota", description: "Se borra la nota. Las tareas que ya creaste se conservan.", confirmText: "Borrar", variant: "danger" }))) return;
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
  const openWrite = useCallback(() => {
    setAdding((current) => (current === "write" ? null : "write"));
    setDraftTitle("");
    setDraftText("");
  }, []);

  // La barra de la cita pide estas acciones; el estado de «sincronizando» vuelve a su botón.
  const syncRef = useRef(syncNow);
  syncRef.current = syncNow;
  const unlinkRef = useRef(unlink);
  unlinkRef.current = unlink;
  useEffect(
    () =>
      onAppointmentAction((action, target) => {
        if (action === "write") openWrite();
        else if (action === "notion") setAdding((current) => (current === "notion" ? null : "notion"));
        else if (action === "sync") void syncRef.current();
        else if (action === "unlink" && target) void unlinkRef.current({ id: target });
      }),
    [openWrite],
  );
  useEffect(() => reportAppointmentBusy("sync", busy === "sync"), [busy]);

  // La barra ofrece «Desvincular» por cada sesión de Granola de la cita.
  useEffect(() => {
    reportLinkedGranola((notes ?? []).filter((n) => n.source === "GRANOLA").map((n) => ({ id: n.id, title: n.title })));
  }, [notes]);
  useEffect(() => () => reportLinkedGranola([]), []);

  const counts = countBySource(notes ?? []);
  const sourcesPresent = (Object.keys(counts) as NoteSource[]).filter((k) => counts[k] > 0);
  const visible = filterNotes(notes ?? [], filter);

  return (
    <section aria-label="Notas de la reunión" className="space-y-6">
      {sourcesPresent.length > 1 && (
        <Segmented
          label="Origen de las notas"
          value={filter}
          onChange={(value) => setFilter(value as NoteSource | "ALL")}
          options={[{ value: "ALL", label: "Todas" }, ...sourcesPresent.map((k) => ({ value: k, label: `${NOTE_SOURCE_INFO[k].label} · ${counts[k]}` }))]}
        />
      )}

      {adding === "write" && (
        <div className="rounded-surface bg-surface-elevated p-4">
          <NoteEditor draftText={draftText} setDraftText={setDraftText} draftTitle={draftTitle} setDraftTitle={setDraftTitle} onCancel={() => setAdding(null)} onSave={saveNew} busy={busy === "save"} showTitleField />
        </div>
      )}
      {adding === "notion" && (
        <div className="space-y-2 rounded-surface bg-surface-elevated p-4">
          <input value={notionUrl} onChange={(e) => setNotionUrl(e.target.value)} placeholder="Enlace o id de la página de Notion" className={inputCls} aria-label="Enlace de Notion" />
          <p className="text-xs text-text-secondary">La página debe estar compartida con la integración de Notion. Importarla otra vez la actualiza.</p>
          <div className="flex justify-end gap-2">
            <button type="button" className={smallBtn} onClick={() => setAdding(null)}>Cancelar</button>
            <button type="button" className={smallBtn} onClick={importNotion} disabled={busy === "notion" || !notionUrl.trim()}>
              {busy === "notion" ? "Importando…" : "Importar"}
            </button>
          </div>
        </div>
      )}

      {notes === null ? (
        <p className="text-sm text-text-secondary" role="status">Cargando…</p>
      ) : loadError ? (
        <p role="alert" className="text-sm text-danger">No se pudo cargar la reunión.</p>
      ) : notes.length === 0 ? (
        adding === null && (
          <div className="flex flex-col items-center gap-3 rounded-surface bg-surface-elevated px-6 py-10 text-center">
            <HugeiconsIcon icon={PencilEdit01Icon} size={26} aria-hidden="true" className="text-text-secondary" />
            <p className="text-sm font-semibold text-text-primary">Aún no hay notas de esta reunión</p>
            <p className="max-w-[44ch] text-xs text-text-secondary">
              {unassigned.length > 0 ? "Hay sesiones de Granola sin asignar: vincula la de esta reunión, o escribe una nota." : "Sincroniza Granola para traer la sesión de esta reunión, o escribe una nota."}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className={smallBtn} onClick={syncNow} disabled={busy === "sync"}>
                <HugeiconsIcon icon={ReloadIcon} size={14} aria-hidden="true" className={`mr-1.5 ${busy === "sync" ? "animate-spin motion-reduce:animate-none" : ""}`} />
                {busy === "sync" ? "Sincronizando…" : "Sincronizar Granola"}
              </button>
              <button type="button" className={smallBtn} onClick={openWrite}>
                <HugeiconsIcon icon={Add01Icon} size={14} aria-hidden="true" className="mr-1.5" />
                Escribir una nota
              </button>
            </div>
          </div>
        )
      ) : (
        <>
          <div className="flex flex-col gap-8">
            {visible.map((note) => {
              const editable = note.source !== "GRANOLA";
              return (
                <article key={note.id} aria-label={note.title ?? "Nota"} className="group/note space-y-3">
                  {note.title && <h2 className="text-base font-semibold leading-snug text-text-primary">{note.title}</h2>}

                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <SourceLabel source={note.source} />
                    {note.startedAt && <span>· {when(note.startedAt)}</span>}
                    <span className="flex-1" />
                    {safeHref(note.url) && (
                      <a href={safeHref(note.url)!} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-xs font-medium text-action-ink hover:underline lg:min-h-9">
                        <HugeiconsIcon icon={Link01Icon} size={12} aria-hidden="true" />
                        Abrir en {NOTE_SOURCE_INFO[note.source].label}
                      </a>
                    )}
                    {editable && editingId !== note.id && (
                      <>
                        <button type="button" aria-label="Editar nota" title="Editar" onClick={() => startEdit(note)} className={iconBtn}>
                          <HugeiconsIcon icon={PencilEdit01Icon} size={16} aria-hidden="true" />
                        </button>
                        <button type="button" aria-label="Borrar nota" title="Borrar" onClick={() => remove(note)} className={`${iconBtn} hover:bg-danger-soft hover:text-danger`}>
                          <HugeiconsIcon icon={Delete02Icon} size={16} aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>

                  {editingId === note.id ? (
                    <div className="rounded-surface bg-surface-elevated p-4">
                      <NoteEditor draftText={draftText} setDraftText={setDraftText} draftTitle={draftTitle} setDraftTitle={setDraftTitle} onCancel={() => setEditingId(null)} onSave={() => saveEdit(note)} busy={busy === "save"} showTitleField />
                    </div>
                  ) : (
                    <div>
                      {note.summary ? <KbMarkdown content={note.summary} allowImages={false} className="kb-compact" /> : <p className="text-sm text-text-secondary">Sin contenido.</p>}
                    </div>
                  )}

                  {note.privateNotes && (
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold text-text-secondary">Notas privadas</summary>
                      <KbMarkdown content={note.privateNotes} allowImages={false} className="kb-compact" />
                    </details>
                  )}
                </article>
              );
            })}
          </div>

          {/* Siempre se puede sumar otra nota, aunque ya haya varias. */}
          {adding === null && (
            <button type="button" onClick={openWrite} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-surface border border-dashed border-line text-sm font-semibold text-text-secondary-strong outline-none transition-colors hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus">
              <HugeiconsIcon icon={Add01Icon} size={16} aria-hidden="true" />
              Agregar otra nota
            </button>
          )}
        </>
      )}

      {notes !== null && !loadError && unassigned.length > 0 && showUnassignedSessions(notes) && (
        <section aria-label="Sesiones de Granola sin asignar" className="space-y-2">
          <h2 className="text-xs font-semibold text-text-secondary">Sesiones de Granola sin asignar</h2>
          <ul className="divide-y divide-line rounded-surface bg-surface-elevated">
            {unassigned.map((note) => (
              <li key={note.id} className="flex items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text-primary">{note.title || "Sin título"}</span>
                  <span className="block text-xs text-text-secondary">
                    {when(note.startedAt)}
                    {note.itemCount ? ` · ${note.itemCount} pasos` : ""}
                  </span>
                </span>
                <button type="button" className={smallBtn} disabled={busy === `link-${note.id}`} onClick={() => link(note.id)}>
                  Vincular a esta cita
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
