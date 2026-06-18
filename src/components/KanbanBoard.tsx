"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon, Calendar01Icon, ConversationIcon, AttachmentIcon, ArrowUpDownIcon } from "@hugeicons/core-free-icons";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export function KanbanBoard() {
  const [pipeline, setPipeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    try {
      const res = await fetch("/api/pipelines");
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setPipeline(data[0]); // We use the first pipeline for now
        }
      }
    } catch (error) {
      console.error("Failed to fetch pipeline", error);
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Optimistic UI update
    const sourceStageId = source.droppableId;
    const destStageId = destination.droppableId;

    const newPipeline = JSON.parse(JSON.stringify(pipeline));
    const sourceStage = newPipeline.stages.find((s: any) => s.id === sourceStageId);
    const destStage = newPipeline.stages.find((s: any) => s.id === destStageId);

    const [movedDeal] = sourceStage.deals.splice(source.index, 1);
    destStage.deals.splice(destination.index, 0, movedDeal);

    setPipeline(newPipeline);

    // Persist to API
    try {
      await fetch("/api/deals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draggableId, stageId: destStageId }),
      });
    } catch (error) {
      console.error("Failed to update deal stage", error);
      // Fallback
      fetchPipeline();
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-secondary">Cargando pipeline...</div>;
  }

  if (!pipeline) {
    return <div className="p-8 text-center text-text-secondary bg-white rounded-lg border border-border-subtle">
      <h3 className="text-lg font-bold text-text-primary mb-2">No active pipeline</h3>
      <p>Log out and create a new Organization account to auto-generate a sales pipeline.</p>
    </div>;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 items-start h-full">
        {pipeline.stages.map((stage: any) => (
          <div key={stage.id} className="w-[300px] shrink-0 flex flex-col h-full max-h-full">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-background z-10 py-2">
              <h3 className="font-semibold text-lg text-text-primary">{stage.name}</h3>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-border-subtle/50">
                <span className="text-sm font-semibold text-text-primary">{stage.deals?.length || 0}</span>
                <HugeiconsIcon icon={ArrowUpDownIcon} size={14} color="#9ca3af" />
              </div>
            </div>

            {/* Cards Container */}
            <Droppable droppableId={stage.id}>
              {(provided, snapshot) => (
                <div
                  className={`flex flex-col gap-4 overflow-y-auto pr-1 flex-1 min-h-[150px] transition-colors rounded-lg ${snapshot.isDraggingOver ? 'bg-gray-100/50' : ''}`}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {stage.deals?.map((deal: any, index: number) => (
                    <Draggable key={deal.id} draggableId={deal.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                          }}
                        >
                          <KanbanCard deal={deal} isDragging={snapshot.isDragging} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}

function KanbanCard({ deal, isDragging }: { deal: any, isDragging: boolean }) {
  const isDark = false; // Note: We can expand this logic later if we want high-value deals to be dark

  return (
    <div className={`p-5 rounded-lg cursor-grab active:cursor-grabbing flex flex-col gap-4 transition-colors ${isDark ? 'bg-[#222222] text-white' : 'bg-surface-elevated text-text-primary'} ${isDragging ? 'ring-2 ring-black/5 opacity-90' : 'hover:bg-nav-hover'}`}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <h4 className="font-bold text-base leading-snug">{deal.title}</h4>
        <button className={`${isDark ? 'text-text-secondary hover:text-white' : 'text-text-secondary hover:text-text-primary'} -mt-1 -mr-2 p-1`}>
          <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
        </button>
      </div>

      {/* Description or value */}
      <p className={`text-sm leading-relaxed font-semibold ${isDark ? 'text-gray-300' : 'text-green-600'}`}>
        ${deal.value?.toLocaleString() || 0}
      </p>

      {(deal.company || deal.contact) && (
        <div className="flex flex-col gap-1 text-xs text-text-secondary">
          {deal.company && <span>🏢 {deal.company.name}</span>}
          {deal.contact && <span>👤 {deal.contact.firstName} {deal.contact.lastName}</span>}
        </div>
      )}

      {/* Footer Metrics */}
      <div className={`flex items-center justify-between mt-auto pt-2 ${isDark ? '' : 'border-t border-border-subtle'}`}>
        {/* Date Badge */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${isDark ? 'bg-[#37352F] text-text-secondary' : 'bg-surface-sidebar text-text-secondary'}`}>
          <HugeiconsIcon icon={Calendar01Icon} size={12} />
          {new Date(deal.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
