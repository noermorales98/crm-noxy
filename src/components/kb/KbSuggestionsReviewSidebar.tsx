"use client";

import { useState, useEffect, useCallback, useRef, type MutableRefObject } from "react";
import { Check, MessageSquare, X } from "lucide-react";
import type { KbSuggestion, KbSuggestionType } from "@prisma/client";
import KbSuggestionAnchors from "@/src/components/kb/KbSuggestionAnchors";

const TYPE_LABELS: Record<KbSuggestionType, string> = {
  COMMENT: "Nota",
  REPLACE: "Sugerencia",
  DELETE: "Eliminar",
  INSERT: "Insertar",
};

type ReviewSuggestion = Pick<
  KbSuggestion,
  | "id"
  | "authorName"
  | "type"
  | "startOffset"
  | "endOffset"
  | "selectedText"
  | "suggestedText"
  | "comment"
  | "status"
  | "createdAt"
>;

export default function KbSuggestionsReviewSidebar({
  pageId,
  open,
  onClose,
  accentColor,
  markdownContent,
  proseContainerRef,
  onContentPatched,
  onPendingCountChange,
}: {
  pageId: string;
  open: boolean;
  onClose: () => void;
  accentColor: string;
  markdownContent: string;
  proseContainerRef: MutableRefObject<HTMLElement | null>;
  onContentPatched?: (content: string) => void;
  onPendingCountChange?: (count: number) => void;
}) {
  const [suggestions, setSuggestions] = useState<ReviewSuggestion[]>([]);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  const [missingAnchorIds, setMissingAnchorIds] = useState<Set<string>>(new Set());
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/kb/${pageId}/suggestions`);
    if (!res.ok) return;
    const data: ReviewSuggestion[] = await res.json();
    const pending = data.filter((s) => s.status === "PENDING");
    setSuggestions(pending);
    onPendingCountChange?.(pending.length);
    setActiveSuggestionId((prev) => {
      if (prev && pending.some((s) => s.id === prev)) return prev;
      return pending[0]?.id ?? null;
    });
  }, [pageId, onPendingCountChange]);

  useEffect(() => {
    if (open) load();
  }, [open, load, markdownContent]);

  useEffect(() => {
    if (!open) setActiveSuggestionId(null);
  }, [open]);

  const resolve = async (suggestionId: string, action: "accept" | "reject") => {
    setResolvingId(suggestionId);
    const res = await fetch(`/api/kb/${pageId}/suggestions/${suggestionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const data = await res.json();
      if (action === "accept" && data.content && onContentPatched) {
        onContentPatched(data.content);
      }
      await load();
      setActiveSuggestionId((prev) => (prev === suggestionId ? null : prev));
    }
    setResolvingId(null);
  };

  const handleAnchorsChange = useCallback(
    (result: { anchoredIds: Set<string>; missingIds: Set<string> }) => {
      setMissingAnchorIds(result.missingIds);
    },
    []
  );

  if (!open) return null;

  return (
    <>
      {suggestions.length > 0 && (
        <KbSuggestionAnchors
          suggestions={suggestions}
          activeSuggestionId={activeSuggestionId}
          onSelect={setActiveSuggestionId}
          proseContainerRef={proseContainerRef}
          markdownContent={markdownContent}
          onAnchorsChange={handleAnchorsChange}
        />
      )}

      <aside
        className="kb-suggestions-review-sidebar fixed right-4 top-[4.5rem] bottom-4 w-80 z-30 bg-white rounded-xl shadow-2xl border border-border-subtle flex flex-col overflow-hidden"
        style={{ ["--comment-accent" as string]: accentColor }}
      >
        <div className="px-4 py-4 border-b border-border-subtle shrink-0 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Sugerencias pendientes</h2>
            <p className="text-[11px] text-text-secondary mt-1">
              {suggestions.length === 0
                ? "No hay sugerencias pendientes"
                : `${suggestions.length} pendiente${suggestions.length !== 1 ? "s" : ""} · clic para ubicar en el documento`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-sidebar hover:text-text-primary shrink-0"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {suggestions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-subtle p-4 text-center">
              <MessageSquare size={20} className="mx-auto mb-2 text-text-secondary opacity-50" />
              <p className="text-xs text-text-secondary leading-relaxed">
                Las sugerencias de comentaristas aparecerán aquí cuando las recibas.
              </p>
            </div>
          ) : (
            suggestions.map((s) => {
              const isActive = activeSuggestionId === s.id;
              const isResolving = resolvingId === s.id;
              const missingAnchor = missingAnchorIds.has(s.id);

              return (
                <article
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveSuggestionId(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveSuggestionId(s.id);
                    }
                  }}
                  className={`kb-comment-card rounded-xl border p-3 text-xs ${
                    isActive ? "is-active" : "border-border-subtle bg-surface-sidebar/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">{s.authorName}</p>
                      <span
                        className="text-[10px] uppercase tracking-wide"
                        style={{ color: accentColor }}
                      >
                        {TYPE_LABELS[s.type]}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={isResolving}
                        onClick={(e) => {
                          e.stopPropagation();
                          void resolve(s.id, "accept");
                        }}
                        className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                        title="Aceptar"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={isResolving}
                        onClick={(e) => {
                          e.stopPropagation();
                          void resolve(s.id, "reject");
                        }}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                        title="Rechazar"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {missingAnchor && s.selectedText && (
                    <p className="text-[10px] text-amber-700 mb-1.5">Texto no encontrado en el documento</p>
                  )}

                  {s.selectedText && (
                    <p
                      className="text-text-secondary mb-1.5 pl-2 border-l-2 line-clamp-3"
                      style={{ borderColor: accentColor }}
                    >
                      &quot;{s.selectedText}&quot;
                    </p>
                  )}
                  {s.suggestedText && s.type === "REPLACE" && (
                    <p className="text-green-800 mb-1">→ {s.suggestedText}</p>
                  )}
                  {s.type === "DELETE" && (
                    <p className="text-red-700 mb-1">Propone eliminar el texto seleccionado</p>
                  )}
                  {s.comment && <p className="italic text-text-secondary">{s.comment}</p>}
                  <p className="text-[10px] text-text-secondary mt-2 opacity-70">
                    {new Date(s.createdAt).toLocaleString("es-MX")}
                  </p>
                </article>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
