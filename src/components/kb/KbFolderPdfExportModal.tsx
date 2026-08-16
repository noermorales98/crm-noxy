"use client";

import { useState, useEffect, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { GripVertical, X } from "lucide-react";
import type { KbTreeNodeDto } from "@/src/components/kb/KbFolderView";
import KbPdfExportStyleOptions from "@/src/components/kb/KbPdfExportStyleOptions";
import { flattenKbDocuments, slugifyPdfFilename, type KbPdfDoc } from "@/src/lib/kb-pdf-tree";
import { fetchPagesForExport, renderPagesToPdf } from "@/src/lib/kb-pdf-export";
import { useToast } from "@/src/context/ToastContext";
import { modalOverlay, modalPanel } from "@/src/lib/crm-ui";

type ExportItem = KbPdfDoc & { selected: boolean };

interface Props {
  open: boolean;
  onClose: () => void;
  folderTitle: string;
  tree: KbTreeNodeDto[];
}

export default function KbFolderPdfExportModal({ open, onClose, folderTitle, tree }: Props) {
  const { addToast } = useToast();
  const [items, setItems] = useState<ExportItem[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItems(flattenKbDocuments(tree).map((doc) => ({ ...doc, selected: true })));
  }, [open, tree]);

  const selectedCount = useMemo(() => items.filter((i) => i.selected).length, [items]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const setAllSelected = (selected: boolean) => {
    setItems((prev) => prev.map((i) => ({ ...i, selected })));
  };

  const handleGenerate = async () => {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) {
      addToast("Selecciona al menos un documento.", "warning");
      return;
    }

    setGenerating(true);
    try {
      const pages = await fetchPagesForExport(selected.map((i) => i.id));
      const filename = `${slugifyPdfFilename(folderTitle)}-export.pdf`;
      await renderPagesToPdf(pages, filename);
      addToast("PDF generado correctamente.", "success");
      onClose();
    } catch (err) {
      console.error("[KbFolderPdfExport]", err);
      addToast("Error al generar PDF.", "error");
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  return (
    <div className={modalOverlay} onClick={onClose}>
      <div
        className={`${modalPanel} max-w-lg max-h-[85vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Exportar carpeta a PDF</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {selectedCount} de {items.length} documentos seleccionados
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:bg-nav-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-text-secondary">
            Esta carpeta no contiene documentos para exportar.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-5 py-2 border-b border-border-subtle bg-surface-sidebar">
              <button
                type="button"
                onClick={() => setAllSelected(true)}
                className="text-xs text-text-secondary hover:text-text-primary"
              >
                Seleccionar todo
              </button>
              <span className="text-text-secondary">·</span>
              <button
                type="button"
                onClick={() => setAllSelected(false)}
                className="text-xs text-text-secondary hover:text-text-primary"
              >
                Ninguno
              </button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="kb-pdf-export">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="overflow-y-auto max-h-[50vh] px-3 py-2"
                  >
                    {items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(dragProvided, snapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={`flex items-center gap-2 px-2 py-2 rounded-lg mb-1 ${
                              snapshot.isDragging ? "bg-nav-active shadow-sm" : "hover:bg-nav-hover"
                            }`}
                            style={{ paddingLeft: 8 + item.depth * 16 }}
                          >
                            <div
                              {...dragProvided.dragHandleProps}
                              className="text-text-secondary cursor-grab shrink-0"
                            >
                              <GripVertical size={14} />
                            </div>
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((i) =>
                                    i.id === item.id ? { ...i, selected: e.target.checked } : i
                                  )
                                )
                              }
                              className="shrink-0"
                            />
                            <span className="text-sm text-text-primary truncate flex-1">
                              {item.title}
                            </span>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </>
        )}

        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-border-subtle">
            <KbPdfExportStyleOptions />
          </div>
        )}

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-nav-hover transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || items.length === 0 || selectedCount === 0}
            className="px-4 py-2 text-sm font-medium bg-action-primary text-action-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {generating ? "Generando..." : "Generar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
