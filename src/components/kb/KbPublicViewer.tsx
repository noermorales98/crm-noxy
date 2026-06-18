"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, MousePointer2, Pencil, PencilLine, ShieldCheck, Trash2 } from "lucide-react";
import KbMarkdown from "@/src/components/kb/KbMarkdown";
import KbSuggestionAnchors from "@/src/components/kb/KbSuggestionAnchors";
import {
  GUEST_EMAIL_KEY,
  GUEST_NAME_KEY,
  COMMENTATOR_ONBOARDING_KEY,
  findSelectionInMarkdown,
} from "@/src/lib/kb-suggestions";
import { getMarkdownTheme, type KbMarkdownThemeId } from "@/src/lib/kb-markdown-themes";
import type { KbShareRole, KbSuggestionType } from "@prisma/client";

type PublicTreeNode = {
  id: string;
  title: string;
  isFolder: boolean;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  children: PublicTreeNode[];
};

type PublicPage = {
  id: string;
  title: string;
  content: string;
  isFolder: boolean;
  markdownTheme: string;
  role: KbShareRole;
  rootPageId: string;
};

type Suggestion = {
  id: string;
  authorName: string;
  type: KbSuggestionType;
  startOffset: number | null;
  endOffset: number | null;
  selectedText: string | null;
  suggestedText: string | null;
  comment: string | null;
  status: string;
  createdAt: string;
};

const TYPE_LABELS: Record<KbSuggestionType, string> = {
  COMMENT: "Nota",
  REPLACE: "Sugerencia",
  DELETE: "Eliminar",
  INSERT: "Insertar",
};

function GuestNameModal({ onDone }: { onDone: (name: string, email: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary mb-1">Identifícate</h2>
        <p className="text-sm text-text-secondary mb-4">Tu nombre aparecerá en notas y ediciones.</p>
        <label className="block text-xs font-medium text-text-secondary mb-1">Nombre *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="crm-input w-full mb-3"
          placeholder="Tu nombre"
          autoFocus
        />
        <label className="block text-xs font-medium text-text-secondary mb-1">Email (opcional)</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className="crm-input w-full mb-4"
          placeholder="tu@email.com"
        />
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => onDone(name.trim(), email.trim())}
          className="w-full py-2.5 rounded-lg bg-accent-charcoal text-white text-sm font-medium disabled:opacity-40"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

function CommentatorOnboardingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-semibold text-text-primary mb-1">Modo comentarista</h2>
        <p className="text-sm text-text-secondary mb-6">
          Puedes revisar este documento y proponer cambios. Nada se modifica directamente: tus aportes
          quedan como sugerencias para que el equipo las apruebe.
        </p>
        <ul className="space-y-4 mb-8">
          <li className="flex gap-3">
            <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <MousePointer2 size={16} />
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">Selecciona texto</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Arrastra sobre cualquier parte del documento para marcarla.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <PencilLine size={16} />
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">Añade notas o sugerencias</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Deja un comentario, propón un cambio de texto o sugiere eliminar un fragmento.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-9 h-9 rounded-lg bg-green-50 text-green-700 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">Sin cambios directos</p>
              <p className="text-xs text-text-secondary mt-0.5">
                El documento original no se altera. Tus comentarios aparecen a la izquierda.
              </p>
            </div>
          </li>
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-accent-charcoal text-white text-sm font-medium"
        >
          Entendido, empezar
        </button>
      </div>
    </div>
  );
}

function SuggestionModal({
  selectedText,
  title = "Nueva sugerencia",
  submitLabel = "Enviar",
  initial,
  onClose,
  onSubmit,
}: {
  selectedText: string;
  title?: string;
  submitLabel?: string;
  initial?: { type: KbSuggestionType; suggestedText?: string | null; comment?: string | null };
  onClose: () => void;
  onSubmit: (data: {
    type: KbSuggestionType;
    suggestedText?: string;
    comment?: string;
  }) => void | Promise<void>;
}) {
  const initialMode =
    initial?.type === "REPLACE" ? "replace" : initial?.type === "DELETE" ? "delete" : "comment";
  const [mode, setMode] = useState<"comment" | "replace" | "delete">(initialMode);
  const [suggestedText, setSuggestedText] = useState(initial?.suggestedText ?? selectedText);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const type: KbSuggestionType =
        mode === "comment" ? "COMMENT" : mode === "replace" ? "REPLACE" : "DELETE";
      await onSubmit({
        type,
        suggestedText: mode === "replace" ? suggestedText : mode === "delete" ? "" : undefined,
        comment: comment || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 sm:p-6"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <p className="text-sm text-text-secondary mb-5 line-clamp-5 bg-surface-sidebar rounded-lg p-4 leading-relaxed">
          &quot;{selectedText}&quot;
        </p>
        <div className="flex flex-wrap gap-2 mb-5">
          {(["comment", "replace", "delete"] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={submitting}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
                mode === m ? "bg-nav-active" : "bg-surface-sidebar hover:bg-nav-hover"
              }`}
            >
              {m === "comment" ? "Nota" : m === "replace" ? "Sugerir cambio" : "Eliminar"}
            </button>
          ))}
        </div>
        {mode === "replace" && (
          <textarea
            value={suggestedText}
            onChange={(e) => setSuggestedText(e.target.value)}
            disabled={submitting}
            className="crm-input w-full mb-4 text-sm min-h-[120px] leading-relaxed disabled:opacity-60"
            placeholder="Texto propuesto"
          />
        )}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={submitting}
          className="crm-input w-full mb-6 text-sm min-h-[120px] leading-relaxed disabled:opacity-60"
          placeholder="Comentario (opcional)"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 text-sm rounded-lg hover:bg-surface-sidebar disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 text-sm rounded-lg bg-accent-charcoal text-white font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {submitting && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {submitting
              ? submitLabel === "Guardar"
                ? "Guardando…"
                : "Enviando…"
              : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  suggestion,
  onClose,
  onConfirm,
  deleting,
}: {
  suggestion: Suggestion;
  onClose: () => void;
  onConfirm: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-text-primary mb-1">Eliminar comentario</h3>
        <p className="text-xs text-text-secondary mb-4">
          Esta acción no se puede deshacer. El comentario se quitará del documento.
        </p>
        {suggestion.selectedText && (
          <p className="text-xs text-text-secondary mb-3 line-clamp-3 bg-surface-sidebar rounded p-2">
            &quot;{suggestion.selectedText}&quot;
          </p>
        )}
        {suggestion.comment && (
          <p className="text-xs italic text-text-secondary mb-4 line-clamp-2">{suggestion.comment}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-2 text-sm rounded-lg hover:bg-surface-sidebar disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2 text-sm rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentsSidebar({
  suggestions,
  guestName,
  accentColor,
  activeSuggestionId,
  missingAnchorIds,
  onSelect,
  onEdit,
  onDelete,
}: {
  suggestions: Suggestion[];
  guestName: string;
  accentColor: string;
  activeSuggestionId: string | null;
  missingAnchorIds: Set<string>;
  onSelect: (id: string) => void;
  onEdit: (suggestion: Suggestion) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside
      className="w-full md:w-72 lg:w-80 shrink-0 border-r border-border-subtle bg-white flex flex-col min-h-screen md:sticky md:top-0 md:h-screen"
      style={{ ["--comment-accent" as string]: accentColor }}
    >
      <div className="px-4 py-5 border-b border-border-subtle shrink-0">
        <h2 className="text-sm font-semibold text-text-primary">Comentarios realizados</h2>
        <p className="text-[11px] text-text-secondary mt-1">
          {suggestions.length === 0
            ? "Aún no hay comentarios en este documento"
            : `${suggestions.length} comentario${suggestions.length !== 1 ? "s" : ""} pendiente${suggestions.length !== 1 ? "s" : ""}`}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {suggestions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-subtle p-4 text-center">
            <MessageSquare size={20} className="mx-auto mb-2 text-text-secondary opacity-50" />
            <p className="text-xs text-text-secondary leading-relaxed">
              Selecciona texto en el documento para añadir tu primer comentario o sugerencia.
            </p>
          </div>
        ) : (
          suggestions.map((s) => {
            const isMine = s.authorName === guestName;
            const isActive = activeSuggestionId === s.id;
            const missingAnchor = missingAnchorIds.has(s.id);
            return (
              <article
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(s.id);
                  }
                }}
                className={`kb-comment-card rounded-xl border p-3 text-xs ${
                  isActive
                    ? "is-active"
                    : isMine
                      ? "border-amber-200 bg-amber-50/60"
                      : "border-border-subtle bg-surface-sidebar/50"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <p className="text-sm font-medium text-text-primary">
                    {s.authorName}
                    {isMine && (
                      <span className="ml-1.5 text-[10px] font-normal text-amber-700">(tú)</span>
                    )}
                  </p>
                  <span
                    className="text-[10px] uppercase tracking-wide shrink-0"
                    style={{ color: accentColor }}
                  >
                    {TYPE_LABELS[s.type]}
                  </span>
                </div>
                {missingAnchor && s.selectedText && (
                  <p className="text-[10px] text-amber-700 mb-1.5">Texto no encontrado en el documento</p>
                )}
                {s.selectedText && (
                  <p className="text-text-secondary mb-1.5 pl-2 border-l-2 line-clamp-3" style={{ borderColor: accentColor }}>
                    &quot;{s.selectedText}&quot;
                  </p>
                )}
                {s.suggestedText && s.type === "REPLACE" && (
                  <p className="text-green-800 mb-1">→ {s.suggestedText}</p>
                )}
                {s.type === "DELETE" && (
                  <p className="text-red-700 mb-1">Sugiere eliminar</p>
                )}
                {s.comment && <p className="italic text-text-secondary">{s.comment}</p>}
                <div className="flex items-center justify-between gap-2 mt-2">
                  <p className="text-[10px] text-text-secondary opacity-70">
                    {new Date(s.createdAt).toLocaleString("es-MX")}
                  </p>
                  {isMine && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Editar"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(s);
                        }}
                        className="p-1 rounded-md hover:bg-white/80 text-text-secondary hover:text-text-primary"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        title="Eliminar"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(s.id);
                        }}
                        className="p-1 rounded-md hover:bg-red-50 text-text-secondary hover:text-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default function KbPublicViewer({
  token,
  pageId,
  shareMeta,
}: {
  token: string;
  pageId: string;
  shareMeta: {
    role: KbShareRole;
    page: { id: string; title: string; isFolder: boolean };
    tree: PublicTreeNode[];
  };
}) {
  const router = useRouter();
  const [guestName, setGuestName] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [page, setPage] = useState<PublicPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  const [missingAnchorIds, setMissingAnchorIds] = useState<Set<string>>(new Set());
  const [selectionModal, setSelectionModal] = useState<{ text: string; hintOffset?: number } | null>(null);
  const [editModal, setEditModal] = useState<Suggestion | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Suggestion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proseContainerRef = useRef<HTMLDivElement>(null);

  const role = shareMeta.role;
  const isCommentator = role === "COMMENTATOR";

  useEffect(() => {
    const stored = sessionStorage.getItem(GUEST_NAME_KEY);
    const storedEmail = sessionStorage.getItem(GUEST_EMAIL_KEY) ?? "";
    if (stored) {
      setGuestName(stored);
      setGuestEmail(storedEmail);
    }
  }, []);

  useEffect(() => {
    if (!guestName || !isCommentator) return;
    const seen = localStorage.getItem(COMMENTATOR_ONBOARDING_KEY);
    if (!seen) setShowOnboarding(true);
  }, [guestName, isCommentator]);

  const dismissOnboarding = () => {
    localStorage.setItem(COMMENTATOR_ONBOARDING_KEY, "1");
    setShowOnboarding(false);
  };

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/public/kb/share/${token}/pages/${pageId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "No se pudo cargar");
      setLoading(false);
      return;
    }
    const data: PublicPage = await res.json();
    setPage(data);
    setTitle(data.title);
    setContent(data.content);
    if (data.isFolder) {
      router.replace(`/docs/s/${token}`);
      return;
    }
    setLoading(false);
  }, [token, pageId, router]);

  const loadSuggestions = useCallback(async () => {
    if (!isCommentator) return;
    const res = await fetch(`/api/public/kb/share/${token}/pages/${pageId}/suggestions`);
    if (res.ok) setSuggestions(await res.json());
  }, [token, pageId, isCommentator]);

  useEffect(() => {
    loadPage();
    setActiveSuggestionId(null);
    setMissingAnchorIds(new Set());
  }, [loadPage]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const save = useCallback(async () => {
    if (role !== "EDITOR" || !page) return;
    await fetch(`/api/public/kb/share/${token}/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
  }, [role, page, token, pageId, title, content]);

  useEffect(() => {
    if (role !== "EDITOR") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [title, content, role, save]);

  const handleGuestDone = (name: string, email: string) => {
    sessionStorage.setItem(GUEST_NAME_KEY, name);
    sessionStorage.setItem(GUEST_EMAIL_KEY, email);
    setGuestName(name);
    setGuestEmail(email);
  };

  const handlePreviewMouseUp = () => {
    if (!isCommentator || !guestName) return;
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text) return;
    const anchor = findSelectionInMarkdown(content, text);
    setSelectionModal({ text, hintOffset: anchor?.startOffset });
  };

  const submitSuggestion = async (data: {
    type: KbSuggestionType;
    suggestedText?: string;
    comment?: string;
  }) => {
    if (!selectionModal || !guestName) return;
    const anchor = findSelectionInMarkdown(content, selectionModal.text, selectionModal.hintOffset);
    const res = await fetch(`/api/public/kb/share/${token}/pages/${pageId}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorName: guestName,
        authorEmail: guestEmail || undefined,
        type: data.type,
        selectedText: selectionModal.text,
        suggestedText: data.suggestedText,
        comment: data.comment,
        startOffset: anchor?.startOffset,
        endOffset: anchor?.endOffset,
        hintOffset: selectionModal.hintOffset,
      }),
    });
    if (res.ok) {
      const created: Suggestion = await res.json();
      setSelectionModal(null);
      window.getSelection()?.removeAllRanges();
      setSuggestions((prev) => [...prev, created]);
      setActiveSuggestionId(created.id);
    }
  };

  const submitEditSuggestion = async (data: {
    type: KbSuggestionType;
    suggestedText?: string;
    comment?: string;
  }) => {
    if (!editModal || !guestName) return;
    const res = await fetch(
      `/api/public/kb/share/${token}/pages/${pageId}/suggestions/${editModal.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: guestName,
          type: data.type,
          suggestedText: data.suggestedText,
          comment: data.comment,
        }),
      }
    );
    if (res.ok) {
      const updated: Suggestion = await res.json();
      setSuggestions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditModal(null);
      setActiveSuggestionId(updated.id);
    }
  };

  const deleteSuggestion = async (suggestionId: string) => {
    if (!guestName) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/public/kb/share/${token}/pages/${pageId}/suggestions/${suggestionId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorName: guestName }),
        }
      );
      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
        setActiveSuggestionId((prev) => (prev === suggestionId ? null : prev));
        setDeleteConfirm(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectSuggestion = useCallback((id: string) => {
    setActiveSuggestionId(id);
  }, []);

  const handleAnchorsChange = useCallback(
    (result: { anchoredIds: Set<string>; missingIds: Set<string> }) => {
      setMissingAnchorIds(result.missingIds);
    },
    []
  );

  if (!guestName) {
    return <GuestNameModal onDone={handleGuestDone} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#fafafa" }}>
        <div className="w-8 h-8 border-2 border-border-subtle border-t-text-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#fafafa" }}>
        <p className="text-sm text-red-600">{error || "Documento no disponible"}</p>
      </div>
    );
  }

  if (page.isFolder) return null;

  const themeId = (page.markdownTheme || "minimal") as KbMarkdownThemeId;
  const themeTokens = getMarkdownTheme(themeId);
  const contentPad = {
    paddingLeft: "max(24px, calc((100% - 740px) / 2))",
    paddingRight: "max(24px, calc((100% - 740px) / 2))",
  };

  const documentBody = (
    <>
      {role === "EDITOR" ? (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-4xl font-semibold tracking-tight bg-transparent border-none outline-none mb-8 placeholder:opacity-40"
            placeholder="Sin título"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[70vh] font-mono text-sm leading-7 bg-transparent border-none outline-none resize-none placeholder:opacity-40"
            placeholder="Escribe aquí..."
            spellCheck={false}
          />
        </>
      ) : (
        <>
          <h1 className="text-4xl font-semibold tracking-tight mb-10">{title || "Sin título"}</h1>
          <div
            ref={proseContainerRef}
            onMouseUp={handlePreviewMouseUp}
            className={isCommentator ? "kb-commentator-doc select-text" : ""}
          >
            <KbMarkdown content={content} theme={themeId} />
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {showOnboarding && isCommentator && (
        <CommentatorOnboardingModal onClose={dismissOnboarding} />
      )}

      <div
        className="min-h-screen flex flex-col md:flex-row"
        style={isCommentator ? undefined : { backgroundColor: themeTokens.bg, color: themeTokens.text }}
      >
        {isCommentator && guestName && (
          <CommentsSidebar
            suggestions={suggestions}
            guestName={guestName}
            accentColor={themeTokens.accent}
            activeSuggestionId={activeSuggestionId}
            missingAnchorIds={missingAnchorIds}
            onSelect={handleSelectSuggestion}
            onEdit={setEditModal}
            onDelete={(id) => {
              const s = suggestions.find((item) => item.id === id);
              if (s) setDeleteConfirm(s);
            }}
          />
        )}

        <main
          className="flex-1 min-w-0 py-10 sm:py-14"
          style={{ backgroundColor: themeTokens.bg, color: themeTokens.text }}
        >
          <div style={contentPad}>{documentBody}</div>
        </main>
      </div>

      {isCommentator && suggestions.length > 0 && (
        <KbSuggestionAnchors
          suggestions={suggestions}
          activeSuggestionId={activeSuggestionId}
          onSelect={handleSelectSuggestion}
          proseContainerRef={proseContainerRef}
          markdownContent={content}
          onAnchorsChange={handleAnchorsChange}
        />
      )}

      {selectionModal && (
        <SuggestionModal
          selectedText={selectionModal.text}
          onClose={() => setSelectionModal(null)}
          onSubmit={submitSuggestion}
        />
      )}

      {editModal && (
        <SuggestionModal
          selectedText={editModal.selectedText ?? ""}
          title="Editar comentario"
          submitLabel="Guardar"
          initial={{
            type: editModal.type,
            suggestedText: editModal.suggestedText,
            comment: editModal.comment,
          }}
          onClose={() => setEditModal(null)}
          onSubmit={submitEditSuggestion}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirmModal
          suggestion={deleteConfirm}
          deleting={deleting}
          onClose={() => !deleting && setDeleteConfirm(null)}
          onConfirm={() => deleteSuggestion(deleteConfirm.id)}
        />
      )}
    </>
  );
}

export type { PublicTreeNode };
