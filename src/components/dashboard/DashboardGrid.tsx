"use client";

import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { GripVertical, X } from "lucide-react";
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
      <div className="bg-surface-elevated rounded-surface p-10 text-center text-sm text-text-secondary">
        No hay widgets en tu dashboard. Activa &quot;Personalizar&quot; para agregar algunos.
      </div>
    );
  }

  if (!editMode) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
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
          <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-2 xl:grid-cols-4 gap-4">
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
                      className="absolute top-2 left-2 z-20 w-6 h-6 rounded-md bg-surface-elevated border border-border-subtle flex items-center justify-center cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary shadow-sm"
                    >
                      <GripVertical size={14} />
                    </div>
                    <button
                      onClick={() => onRemove(w.id)}
                      className="absolute top-2 right-2 z-20 w-6 h-6 rounded-md bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-secondary hover:text-red-600 hover:border-red-200 shadow-sm"
                      aria-label={`Quitar ${w.label}`}
                    >
                      <X size={14} />
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
