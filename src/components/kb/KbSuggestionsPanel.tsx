"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, MessageSquare, X, ChevronDown, ChevronUp } from "lucide-react";
import type { KbSuggestion, KbSuggestionType } from "@prisma/client";

const TYPE_LABELS: Record<KbSuggestionType, string> = {
  COMMENT: "Nota",
  REPLACE: "Sugerencia",
  DELETE: "Eliminar",
  INSERT: "Insertar",
};

export default function KbSuggestionsPanel({
  pageId,
  onContentPatched,
}: {
  pageId: string;
  onContentPatched?: (content: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<KbSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/kb/${pageId}/suggestions`);
    if (res.ok) setSuggestions(await res.json());
  }, [pageId]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = suggestions.filter((s) => s.status === "PENDING");

  const resolve = async (suggestionId: string, action: "accept" | "reject") => {
    setResolvingId(suggestionId);
    setLoading(true);
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
    }
    setLoading(false);
    setResolvingId(null);
  };

  if (pending.length === 0 && !open) return null;

  return (
    <div className="border-t border-border-subtle bg-amber-50/50 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <MessageSquare size={14} />
          {pending.length} sugerencia{pending.length !== 1 ? "s" : ""} pendiente{pending.length !== 1 ? "s" : ""}
        </span>
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 max-h-64 overflow-y-auto">
          {pending.length === 0 ? (
            <p className="text-xs text-text-secondary italic">No hay sugerencias pendientes</p>
          ) : (
            pending.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-lg border border-amber-100 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-text-primary">{s.authorName}</p>
                    <p className="text-[10px] uppercase text-text-secondary">
                      {TYPE_LABELS[s.type]} · {new Date(s.createdAt).toLocaleString("es-MX")}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={loading && resolvingId === s.id}
                      onClick={() => resolve(s.id, "accept")}
                      className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                      title="Aceptar"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={loading && resolvingId === s.id}
                      onClick={() => resolve(s.id, "reject")}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                      title="Rechazar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                {s.selectedText && (
                  <p className="text-xs text-text-secondary mb-1 line-clamp-2">
                    &quot;{s.selectedText}&quot;
                  </p>
                )}
                {s.suggestedText && s.type === "REPLACE" && (
                  <p className="text-xs text-green-700 mb-1">→ {s.suggestedText}</p>
                )}
                {s.type === "DELETE" && (
                  <p className="text-xs text-red-600 mb-1">Propone eliminar el texto seleccionado</p>
                )}
                {s.comment && <p className="text-xs italic text-text-secondary">{s.comment}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
