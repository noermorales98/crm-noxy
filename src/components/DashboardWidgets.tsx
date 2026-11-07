"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { TAB_MAP } from "@/src/lib/dashboardTabs";
import { EmptyState } from "@/src/components/ui";
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
      <div className="rounded-surface border border-line bg-surface-elevated">
        <EmptyState title="No hay pestañas en la tabla" body="Pulsa «Personalizar» para agregar las que necesites." />
      </div>
    );
  }

  const activeTabData = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  return (
    <div className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
      <div className="flex items-center overflow-x-auto border-b border-line px-2">
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
                            type="button"
                            className="-my-2 ml-0.5 flex size-11 items-center justify-center rounded-full text-text-secondary hover:bg-danger-soft hover:text-danger lg:size-7"
                            aria-label={`Quitar pestaña ${tab.label}`}
                          >
                            <HugeiconsIcon icon={Cancel01Icon} size={12} />
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
                  ? "border-action-primary text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-secondary hover:border-line"
              }`}
            >
              <HugeiconsIcon icon={tab.icon} size={14} />
              {tab.label}
              {tab.count(data) > 0 && (
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
                    activeTabData.id === tab.id ? "bg-action-primary text-action-primary-foreground" : "bg-nav-active text-text-secondary"
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

      {!editMode && (
        <div className="crm-table-scroll">
          <div className="crm-table-min">{activeTabData.render(data)}</div>
        </div>
      )}
    </div>
  );
}
