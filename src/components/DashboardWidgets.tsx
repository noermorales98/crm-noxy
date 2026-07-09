"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { X } from "lucide-react";
import { TAB_MAP } from "@/src/lib/dashboardTabs";
import type { DashboardData } from "@/src/lib/dashboardData";

interface DashboardTabsTableProps {
  tabIds: string[];
  data: DashboardData;
  editMode: boolean;
  onReorder: (nextIds: string[]) => void;
  onRemove: (id: string) => void;
}

export function DashboardTabsTable({ tabIds, data, editMode, onReorder, onRemove }: DashboardTabsTableProps) {
  const tabs = tabIds.map((id) => TAB_MAP[id]).filter(Boolean);
  const [activeTab, setActiveTab] = useState<string | undefined>(tabs[0]?.id);

  useEffect(() => {
    if (!tabs.find((t) => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabIds]);

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const next = Array.from(tabIds);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    onReorder(next);
  }

  if (tabs.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-lg p-10 text-center text-sm text-text-secondary">
        No hay pestañas en la tabla. Activa &quot;Personalizar&quot; para agregar algunas.
      </div>
    );
  }

  const activeTabData = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  return (
    <div className="bg-surface-elevated rounded-lg">
      <div className="flex items-center border-b border-border-subtle px-2">
        {editMode ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="dashboard-tabs" direction="horizontal">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="flex items-center">
                  {tabs.map((tab, index) => (
                    <Draggable key={tab.id} draggableId={tab.id} index={index}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className="flex items-center gap-1.5 px-3 py-4 text-sm font-medium whitespace-nowrap border-b-2 border-transparent text-text-secondary cursor-grab active:cursor-grabbing"
                        >
                          <HugeiconsIcon icon={tab.icon} size={14} />
                          {tab.label}
                          <button
                            onClick={() => onRemove(tab.id)}
                            className="ml-1 w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-600"
                            aria-label={`Quitar pestaña ${tab.label}`}
                          >
                            <X size={11} />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                activeTabData.id === tab.id
                  ? "border-accent-charcoal text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-secondary hover:border-border-subtle"
              }`}
            >
              <HugeiconsIcon icon={tab.icon} size={14} />
              {tab.label}
              {tab.count(data) > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
                    activeTabData.id === tab.id ? "bg-accent-charcoal text-white" : "bg-nav-active text-text-secondary"
                  }`}
                >
                  {tab.count(data)}
                </span>
              )}
            </button>
          ))
        )}
        {!editMode && (
          <div className="ml-auto pr-4 shrink-0">
            <Link href={activeTabData.href} className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors">
              Ver todo
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
            </Link>
          </div>
        )}
      </div>

      {!editMode && activeTabData.render(data)}
    </div>
  );
}
