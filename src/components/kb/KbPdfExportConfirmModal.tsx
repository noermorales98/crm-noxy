"use client";

import { X } from "lucide-react";
import KbPdfExportStyleOptions from "@/src/components/kb/KbPdfExportStyleOptions";
import { modalOverlay, modalPanel } from "@/src/lib/crm-ui";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  generating?: boolean;
  title?: string;
  description?: string;
}

export default function KbPdfExportConfirmModal({
  open,
  onClose,
  onConfirm,
  generating = false,
  title = "Exportar a PDF",
  description = "El documento se generará en formato legible.",
}: Props) {
  if (!open) return null;

  return (
    <div className={modalOverlay} onClick={onClose}>
      <div
        className={`${modalPanel} max-w-md`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            <p className="text-xs text-text-secondary mt-0.5">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="p-1.5 rounded-lg text-text-secondary hover:bg-nav-hover transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <KbPdfExportStyleOptions />
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-nav-hover transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={generating}
            className="px-4 py-2 text-sm font-medium bg-accent-charcoal text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {generating ? "Generando..." : "Exportar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
