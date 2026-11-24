"use client";

import { useRef, useState } from "react";
import { useDialog } from "@/src/components/ui/useDialog";

const QUICK_REASONS = ["Precio", "Sin presupuesto", "Sin respuesta", "Eligió a otro", "Ya no lo necesita"];

/**
 * Pregunta por qué se pierde un deal ANTES de moverlo a la etapa perdida. El motivo es obligatorio:
 * se guarda en el deal y en su bitácora para consultarlo después.
 */
export function LostReasonDialog({
  dealTitle,
  initialReason = "",
  saving = false,
  onConfirm,
  onCancel,
}: {
  dealTitle: string;
  initialReason?: string;
  saving?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState(initialReason);
  useDialog(ref, true, onCancel);
  const clean = reason.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="lost-reason-title" className="w-full max-w-md overflow-hidden rounded-lg bg-surface-elevated">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (clean && !saving) onConfirm(clean);
          }}
        >
          <div className="p-6">
            <h3 id="lost-reason-title" className="text-base font-bold text-text-primary">¿Por qué se perdió?</h3>
            <p className="mb-4 mt-1 text-sm text-text-secondary">
              «{dealTitle}» pasará a perdido. Escribe el motivo: se guarda en el deal para consultarlo después.
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Motivos frecuentes">
              {QUICK_REASONS.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setReason((current) => (current.trim() ? `${current.trim()}. ${quick}` : quick))}
                  className="h-7 min-h-0! rounded-full border border-line px-2.5 text-xs font-medium text-text-secondary hover:bg-nav-hover hover:text-text-primary"
                >
                  {quick}
                </button>
              ))}
            </div>
            <label htmlFor="lost-reason" className="sr-only">Motivo de la pérdida</label>
            <textarea
              id="lost-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Ej. Le pareció caro y eligió otra editorial."
              className="w-full resize-none rounded-control border border-line bg-surface-elevated p-3 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-action-ink"
            />
          </div>
          <div className="flex gap-3 px-6 pb-6">
            <button type="button" onClick={onCancel} className="min-h-11 flex-1 rounded-lg bg-surface-sidebar py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-nav-active lg:min-h-10">
              Cancelar
            </button>
            <button type="submit" disabled={!clean || saving} className="min-h-11 flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 lg:min-h-10">
              {saving ? "Guardando…" : "Marcar como perdido"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
