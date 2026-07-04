"use client";

import { useEffect, useState } from "react";
import { History, X } from "lucide-react";

export type KbRevisionListItem = {
  id: string;
  title: string;
  createdAt: string;
  preview: string;
  isPublished: boolean;
};

interface Props {
  pageId: string;
  open: boolean;
  onClose: () => void;
  onRestore: (revisionId: string) => void;
  restoringId?: string | null;
}

export default function KbRevisionHistoryPanel({
  pageId,
  open,
  onClose,
  onRestore,
  restoringId,
}: Props) {
  const [revisions, setRevisions] = useState<KbRevisionListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/kb/${pageId}/revisions`)
      .then((r) => (r.ok ? r.json() : { revisions: [] }))
      .then((data) => setRevisions(data.revisions ?? []))
      .catch(() => setRevisions([]))
      .finally(() => setLoading(false));
  }, [open, pageId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/20"
        aria-label="Cerrar historial"
        onClick={onClose}
      />
      <aside className="relative w-full max-w-md h-full bg-white border-l border-border-subtle shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <History size={16} className="text-text-primary" />
            <h2 className="text-sm font-semibold text-text-primary">Historial de cambios</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-text-secondary hover:bg-nav-hover"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="text-xs text-text-secondary text-center py-8">Cargando historial...</p>
          ) : revisions.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-8">
              Aún no hay versiones guardadas. Cada guardado crea una entrada en el historial.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {revisions.map((rev) => (
                <li
                  key={rev.id}
                  className="border border-border-subtle rounded-lg p-3 hover:bg-surface-sidebar transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">{rev.title}</p>
                      <p className="text-[11px] text-text-secondary">
                        {new Date(rev.createdAt).toLocaleString("es-MX")}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={restoringId === rev.id}
                      onClick={() => onRestore(rev.id)}
                      className="shrink-0 text-[11px] px-2.5 py-1 rounded-md bg-black text-white font-medium hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {restoringId === rev.id ? "Restaurando..." : "Restaurar"}
                    </button>
                  </div>
                  {rev.preview ? (
                    <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                      {rev.preview}
                    </p>
                  ) : (
                    <p className="text-[11px] text-text-secondary italic">Sin contenido</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
