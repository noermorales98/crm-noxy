"use client";

import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, DragDropVerticalIcon } from "@hugeicons/core-free-icons";
import { EmptyState } from "@/src/components/ui";
import { WIDGET_MAP, widgetSizeClass } from "@/src/lib/dashboardWidgets";
import type { DashboardData } from "@/src/lib/dashboardData";

interface DashboardGridProps {
  widgetIds: string[];
  data: DashboardData;
  editMode: boolean;
  onReorder: (nextIds: string[]) => void;
  onRemove: (id: string) => void;
}

export function DashboardGrid({ widgetIds, data, editMode, onReorder, onRemove }: DashboardGridProps) {
  const widgets = widgetIds.map((id) => WIDGET_MAP[id]).filter(Boolean);

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const next = Array.from(widgetIds);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    onReorder(next);
  }

  if (widgets.length === 0) {
    return (
      <div className="rounded-surface border border-line bg-surface-elevated">
        <EmptyState title="No hay widgets en tu dashboard" body="Pulsa «Personalizar» para agregar los que necesites." />
      </div>
    );
  }

  if (!editMode) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {widgets.map((w) => (
          <div key={w.id} className={widgetSizeClass(w.size)}>
            {w.render(data)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dashboard-widgets" direction="horizontal">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {widgets.map((w, index) => (
              <Draggable key={w.id} draggableId={w.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    className={`${widgetSizeClass(w.size)} relative group ${dragSnapshot.isDragging ? "z-10" : ""}`}
                  >
                    <div className="absolute inset-0 rounded-surface ring-2 ring-action-primary/20 pointer-events-none" />
                    <div
                      {...dragProvided.dragHandleProps}
                      className="absolute left-2 top-2 z-20 flex size-8 cursor-grab items-center justify-center rounded-[8px] border border-line bg-surface-elevated text-text-secondary hover:text-text-primary active:cursor-grabbing"
                      aria-label={`Mover ${w.label}`}
                    >
                      <HugeiconsIcon icon={DragDropVerticalIcon} size={14} />
                    </div>
                    <button
                      onClick={() => onRemove(w.id)}
                      className="absolute right-2 top-2 z-20 flex size-8 items-center justify-center rounded-[8px] border border-line bg-surface-elevated text-text-secondary hover:border-danger/40 hover:text-danger"
                      aria-label={`Quitar ${w.label}`}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={14} />
                    </button>
                    <div className="opacity-90 pointer-events-none h-full">{w.render(data)}</div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
