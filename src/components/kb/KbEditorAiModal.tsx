"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Copy01Icon } from "@hugeicons/core-free-icons";

type AiAction = "summarize" | "improve" | "continue" | "draft";

interface Props {
  open: boolean;
  loading: boolean;
  action: AiAction | null;
  result: string;
  selectionPreview: string | null;
  hasSelection: boolean;
  onClose: () => void;
  onInsertBelow: () => void;
  onInsertAtEnd: () => void;
  onReplaceSelection: () => void;
  onReplaceAll: () => void;
  onCopy: () => void;
}

const ACTION_LABELS: Record<AiAction, string> = {
  summarize: "Resumen",
  improve: "Texto mejorado",
  continue: "Continuación",
  draft: "Contenido redactado",
};

export default function KbEditorAiModal({
  open,
  loading,
  action,
  result,
  selectionPreview,
  hasSelection,
  onClose,
  onInsertBelow,
  onInsertAtEnd,
  onReplaceSelection,
  onReplaceAll,
  onCopy,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Cerrar"
        onClick={loading ? undefined : onClose}
      />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl border border-border-subtle shadow-2xl flex flex-col overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              {loading ? "Generando con IA..." : action ? ACTION_LABELS[action] : "Resultado IA"}
            </h2>
            {selectionPreview && !loading && (
              <p className="text-[11px] text-text-secondary mt-1 line-clamp-1">
                Selección: &quot;{selectionPreview}&quot;
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-md text-text-secondary hover:bg-nav-hover disabled:opacity-40"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-[200px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-secondary">
              <span className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Procesando documento...</p>
            </div>
          ) : (
            <pre className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed font-sans">
              {result}
            </pre>
          )}
        </div>

        {!loading && result && (
          <div className="px-5 py-4 border-t border-border-subtle bg-surface-sidebar flex flex-wrap gap-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onInsertBelow}
              className="text-xs px-3 py-2 rounded-lg bg-black text-white font-medium hover:bg-neutral-800 transition-colors"
            >
              Insertar debajo
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onInsertAtEnd}
              className="text-xs px-3 py-2 rounded-lg border border-border-subtle text-text-primary font-medium hover:bg-nav-hover transition-colors"
            >
              Insertar al final
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onReplaceSelection}
              disabled={!hasSelection}
              title={hasSelection ? "Reemplaza solo el texto seleccionado" : "Selecciona texto en el editor primero"}
              className="text-xs px-3 py-2 rounded-lg border border-border-subtle text-text-primary font-medium hover:bg-nav-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Reemplazar selección
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onReplaceAll}
              className="text-xs px-3 py-2 rounded-lg border border-red-200 text-red-700 font-medium hover:bg-red-50 transition-colors"
            >
              Reemplazar todo
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onCopy}
              className="ml-auto text-xs px-3 py-2 rounded-lg text-text-secondary hover:bg-nav-hover transition-colors flex items-center gap-1.5"
            >
              <HugeiconsIcon icon={Copy01Icon} size={13} />
              Copiar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
