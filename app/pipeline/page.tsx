"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import NewDealModal from "@/src/components/NewDealModal";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  User02Icon,
  CalendarCheckIn01Icon,
  MessageIcon,
  KanbanIcon,
} from "@hugeicons/core-free-icons";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const SOURCE_COLORS: Record<string, string> = {
  WHATSAPP: "bg-green-50 text-green-700 border-green-100",
  REFERIDO: "bg-purple-50 text-purple-700 border-purple-100",
  LINKEDIN: "bg-blue-50 text-blue-700 border-blue-100",
  VISITA: "bg-amber-50 text-amber-700 border-amber-100",
  EMAIL_FRIO: "bg-gray-100 text-gray-600 border-gray-200",
  FORMULARIO: "bg-teal-50 text-teal-700 border-teal-100",
  INSTAGRAM: "bg-pink-50 text-pink-700 border-pink-100",
  OTRO: "bg-gray-100 text-gray-500 border-gray-200",
};

const SOURCE_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  REFERIDO: "Referido",
  LINKEDIN: "LinkedIn",
  VISITA: "Visita",
  EMAIL_FRIO: "Email frío",
  FORMULARIO: "Formulario",
  INSTAGRAM: "Instagram",
  OTRO: "Otro",
};

function formatCurrency(value: number | null | undefined) {
  if (!value) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value);
}

function DealCard({ deal, index }: { deal: any; index: number }) {
  const router = useRouter();
  const isFollowUpOverdue = deal.followUpAt && new Date(deal.followUpAt) < new Date();

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => router.push(`/pipeline/${deal.id}`)}
          className={`bg-white border rounded-xl p-4 cursor-pointer hover:shadow-md transition-all select-none ${
            snapshot.isDragging ? "shadow-lg ring-2 ring-gray-900/10 rotate-1" : "border-gray-100 hover:border-gray-200"
          }`}
        >
          {/* Title */}
          <p className="text-sm font-semibold text-gray-900 leading-snug mb-2 line-clamp-2">{deal.title}</p>

          {/* Value */}
          <p className="text-base font-bold text-gray-900 mb-3">{formatCurrency(deal.value)}</p>

          {/* Source badge */}
          {deal.source && (
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border mb-2 ${SOURCE_COLORS[deal.source] || SOURCE_COLORS.OTRO}`}>
              {SOURCE_LABELS[deal.source] || deal.source}
            </span>
          )}

          {/* Contact */}
          {deal.contact && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <HugeiconsIcon icon={User02Icon} size={12} />
              <span>{deal.contact.firstName} {deal.contact.lastName || ""}</span>
            </div>
          )}

          {/* Follow-up */}
          {deal.followUpAt && (
            <div className={`flex items-center gap-1.5 text-xs mb-1.5 ${isFollowUpOverdue ? "text-red-600 font-semibold" : "text-gray-400"}`}>
              <HugeiconsIcon icon={CalendarCheckIn01Icon} size={12} />
              <span>{new Date(deal.followUpAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</span>
              {isFollowUpOverdue && <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[9px] font-bold border border-red-100">VENCIDO</span>}
            </div>
          )}

          {/* Activity count */}
          {deal._count?.activities > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <HugeiconsIcon icon={MessageIcon} size={12} />
              <span>{deal._count.activities} actividades</span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

function KanbanColumn({
  stage,
  deals,
  onAddDeal,
}: {
  stage: any;
  deals: any[];
  onAddDeal: (stageId: string) => void;
}) {
  const stageValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color || "#6B7280" }} />
        <span className="text-sm font-bold text-gray-900 flex-1 truncate">{stage.name}</span>
        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{deals.length}</span>
        {stageValue > 0 && (
          <span className="text-[10px] font-bold text-gray-500">{formatCurrency(stageValue)}</span>
        )}
      </div>

      {/* Droppable area */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2.5 flex-1 min-h-[80px] rounded-2xl p-2 transition-colors ${
              snapshot.isDraggingOver ? "bg-gray-100/80" : "bg-gray-50/60"
            }`}
          >
            {deals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add button */}
      <button
        onClick={() => onAddDeal(stage.id)}
        className="mt-2 w-full flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 py-2 px-3 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <HugeiconsIcon icon={Add01Icon} size={14} />
        Agregar deal
      </button>
    </div>
  );
}

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>();

  const fetchPipelines = useCallback(async () => {
    try {
      const res = await fetch("/api/deals");
      if (res.ok) {
        const data = await res.json();
        setPipelines(Array.isArray(data) ? data : []);
      }
    } catch { console.error("Error loading pipeline"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPipelines(); }, [fetchPipelines]);

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStageId = destination.droppableId;

    // Optimistic update
    setPipelines((prev) =>
      prev.map((pipeline) => ({
        ...pipeline,
        stages: pipeline.stages.map((stage: any) => ({
          ...stage,
          deals:
            stage.id === source.droppableId
              ? stage.deals.filter((d: any) => d.id !== draggableId)
              : stage.id === newStageId
              ? [
                  ...stage.deals.slice(0, destination.index),
                  prev
                    .flatMap((p: any) => p.stages)
                    .flatMap((s: any) => s.deals)
                    .find((d: any) => d.id === draggableId),
                  ...stage.deals.slice(destination.index),
                ].filter(Boolean)
              : stage.deals,
        })),
      }))
    );

    // Persist
    await fetch("/api/deals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draggableId, stageId: newStageId }),
    });
  };

  const openModal = (stageId?: string) => {
    setDefaultStageId(stageId);
    setShowModal(true);
  };

  const handleDealCreated = (deal: any) => {
    setShowModal(false);
    fetchPipelines();
  };

  const allStages = pipelines.flatMap((p) => p.stages.map((s: any) => ({ ...s, pipelineName: p.name })));

  if (loading) {
    return (
      <div className="flex h-screen bg-[#f5f4ef]">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f5f4ef] font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Page header */}
          <div className="px-6 py-5 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-3 mb-0.5">
                <HugeiconsIcon icon={KanbanIcon} size={20} color="#9ca3af" />
                <h1 className="text-xl font-bold text-gray-900">Pipeline de ventas</h1>
              </div>
              <p className="text-sm text-gray-500 ml-9">
                {pipelines.reduce((acc, p) => acc + p.stages.reduce((a: number, s: any) => a + s.deals.length, 0), 0)} deals activos
              </p>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-black transition-colors"
            >
              <HugeiconsIcon icon={Add01Icon} size={16} />
              Nuevo deal
            </button>
          </div>

          {/* Kanban board */}
          {pipelines.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <HugeiconsIcon icon={KanbanIcon} size={28} color="#9ca3af" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">No hay pipelines configurados</h3>
                <p className="text-sm text-gray-500">Crea un pipeline desde la configuración para comenzar.</p>
              </div>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex-1 overflow-x-auto overflow-y-hidden">
                {pipelines.map((pipeline) => (
                  <div key={pipeline.id} className="h-full">
                    {pipelines.length > 1 && (
                      <div className="px-6 pt-4 pb-2">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{pipeline.name}</h2>
                      </div>
                    )}
                    <div className="flex gap-4 px-6 py-4 h-full items-start">
                      {pipeline.stages.map((stage: any) => (
                        <KanbanColumn
                          key={stage.id}
                          stage={stage}
                          deals={stage.deals}
                          onAddDeal={openModal}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DragDropContext>
          )}
        </main>
      </div>

      {showModal && (
        <NewDealModal
          pipelines={pipelines.map((p) => ({
            id: p.id,
            name: p.name,
            stages: p.stages,
          }))}
          defaultStageId={defaultStageId}
          onSuccess={handleDealCreated}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
