"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHeader } from "@/src/context/HeaderContext";
import DatePicker from "@/src/components/DatePicker";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  User02Icon,
  CalendarCheckIn01Icon,
  MessageIcon,
  KanbanIcon,
  Cancel01Icon,
  Building02Icon,
  Folder01Icon,
} from "@hugeicons/core-free-icons";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { input as inputCls } from "@/src/lib/crm-ui";
import { fmtUSD, fmtMXN, StatCard, StatChip, type StatDef } from "@/src/components/pipeline/PipelineShared";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  WHATSAPP: "bg-green-50 text-green-700 border-green-100",
  REFERIDO: "bg-purple-50 text-purple-700 border-purple-100",
  LINKEDIN: "bg-blue-50 text-blue-700 border-blue-100",
  VISITA: "bg-amber-50 text-amber-700 border-amber-100",
  EMAIL_FRIO: "bg-gray-100 text-text-secondary border-border-subtle",
  FORMULARIO: "bg-teal-50 text-teal-700 border-teal-100",
  INSTAGRAM: "bg-pink-50 text-pink-700 border-pink-100",
  OTRO: "bg-gray-100 text-text-secondary border-border-subtle",
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

// ─── Deal Card ───────────────────────────────────────────────────────────────

function DealCard({ deal, index }: { deal: any; index: number }) {
  const router = useRouter();
  const isOverdue = deal.followUpAt && new Date(deal.followUpAt) < new Date();
  const statusLabel = isOverdue ? "Necesita atención" : "En camino";
  const statusCls = isOverdue
    ? "bg-orange-50 text-orange-600 border-orange-100"
    : "bg-emerald-50 text-emerald-700 border-emerald-100";

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => router.push(`/pipeline/${deal.id}`)}
          className={`bg-surface-elevated rounded-lg p-4 cursor-pointer transition-colors select-none group ${
            snapshot.isDragging
              ? "ring-2 ring-black/5 rotate-1 scale-105 opacity-90"
              : "hover:bg-nav-hover"
          }`}
        >
          {/* Title */}
          <p className="text-sm font-semibold text-text-primary leading-snug mb-1.5 line-clamp-2">
            {deal.title}
          </p>

          {/* Company */}
          {deal.company && (
            <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-2">
              <HugeiconsIcon icon={Building02Icon} size={11} />
              <span className="truncate">{deal.company.name}</span>
            </div>
          )}

          {/* Value */}
          <p className="text-base font-bold text-text-primary mb-3">
            {deal.currency === "MXN" ? fmtMXN(deal.value ?? 0) : fmtUSD(deal.value ?? 0)}
          </p>

          {/* Source badge */}
          {deal.source && (
            <span
              className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border mb-2 ${
                SOURCE_COLORS[deal.source] || SOURCE_COLORS.OTRO
              }`}
            >
              {SOURCE_LABELS[deal.source] || deal.source}
            </span>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between mt-2 pt-2.5 border-t border-border-subtle">
            {/* Contact avatar */}
            {deal.contact ? (
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[9px] font-bold">
                  {deal.contact.firstName?.[0]?.toUpperCase() || "?"}
                </div>
                <span className="text-[11px] text-text-secondary truncate max-w-[100px]">
                  {deal.contact.firstName} {deal.contact.lastName || ""}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-300">
                <HugeiconsIcon icon={User02Icon} size={14} />
              </div>
            )}

            {/* Status badge */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCls}`}>
              {statusLabel}
            </span>
          </div>

          {/* Follow-up date */}
          {deal.followUpAt && (
            <div
              className={`flex items-center gap-1.5 text-[11px] mt-2 ${
                isOverdue ? "text-red-500 font-semibold" : "text-text-secondary"
              }`}
            >
              <HugeiconsIcon icon={CalendarCheckIn01Icon} size={11} />
              <span>
                {new Date(deal.followUpAt).toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              {isOverdue && (
                <span className="bg-red-50 text-red-500 px-1.5 py-0.5 rounded text-[9px] font-bold border border-red-100">
                  VENCIDO
                </span>
              )}
            </div>
          )}

          {deal._count?.activities > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-text-secondary mt-1.5">
              <HugeiconsIcon icon={MessageIcon} size={11} />
              <span>{deal._count.activities} actividades</span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  deals,
  onAddDeal,
}: {
  stage: any;
  deals: any[];
  onAddDeal: (stageId: string) => void;
}) {
  const totalMXN = deals.filter(d => d.currency === "MXN").reduce((sum, d) => sum + (d.value ?? 0), 0);
  const totalUSD = deals.filter(d => d.currency !== "MXN").reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: stage.color || "#6B7280" }}
        />
        <span className="text-sm font-bold text-text-primary flex-1 truncate">{stage.name}</span>
        <span className="text-[10px] font-semibold text-text-secondary bg-gray-100 px-1.5 py-0.5 rounded-full">
          {deals.length}
        </span>
        <div className="flex flex-col items-end gap-0.5">
          {totalMXN > 0 && (
            <span className="text-[10px] font-bold text-text-secondary">{fmtMXN(totalMXN)}</span>
          )}
          {totalUSD > 0 && (
            <span className="text-[10px] font-bold text-text-secondary">{fmtUSD(totalUSD)}</span>
          )}
        </div>
      </div>

      {/* Droppable */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2 flex-1 min-h-[60px] rounded-lg p-1.5 transition-colors ${
              snapshot.isDraggingOver ? "bg-gray-100/80 ring-2 ring-gray-200" : "bg-surface-sidebar/60"
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
        className="mt-2 w-full flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary py-2 px-3 rounded-lg hover:bg-nav-hover transition-colors"
      >
        <HugeiconsIcon icon={Add01Icon} size={14} />
        Agregar deal
      </button>
    </div>
  );
}

// ─── New Deal Modal ───────────────────────────────────────────────────────────

const SOURCE_OPTIONS = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "REFERIDO", label: "Referido" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "VISITA", label: "Visita" },
  { value: "EMAIL_FRIO", label: "Email frío" },
  { value: "FORMULARIO", label: "Formulario" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "OTRO", label: "Otro" },
];

function NewDealModal({
  pipelines,
  defaultStageId,
  onSuccess,
  onClose,
}: {
  pipelines: any[];
  defaultStageId?: string;
  onSuccess: (deal: any) => void;
  onClose: () => void;
}) {
  const allStages = pipelines.flatMap((p) =>
    p.stages.map((s: any) => ({ ...s, pipelineName: p.name }))
  );
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [stageId, setStageId] = useState(defaultStageId || allStages[0]?.id || "");
  const [source, setSource] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("El título es requerido."); return; }
    if (!stageId) { setError("Selecciona una etapa."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          value: value ? parseFloat(value) : 0,
          currency,
          stageId,
          source: source || null,
          followUpAt: followUpAt || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al crear el deal.");
        return;
      }
      onSuccess(await res.json());
    } catch {
      setError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  }

  return (
    /* Sin overflow-hidden para que el DatePicker portal no quede tapado */
    <div className="fixed inset-0 bg-brand-obsidian/35 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle">
          <h2 className="text-base font-bold text-text-primary">Nuevo deal</h2>
          <button onClick={onClose} className="p-1.5 text-text-secondary hover:text-text-secondary hover:bg-nav-hover rounded-lg transition-colors">
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="Ej. Proyecto de branding para Acme"
              autoFocus
            />
          </div>

          {/* Valor + moneda */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Valor</label>
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-border-subtle bg-surface-sidebar overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={`px-3 py-2.5 text-sm font-bold transition-all ${currency === "USD" ? "bg-action-primary text-action-primary-foreground" : "text-text-secondary hover:bg-nav-hover"}`}
                >
                  USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("MXN")}
                  className={`px-3 py-2.5 text-sm font-bold transition-all ${currency === "MXN" ? "bg-action-primary text-action-primary-foreground" : "text-text-secondary hover:bg-nav-hover"}`}
                >
                  MXN
                </button>
              </div>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={`${inputCls} flex-1`}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-primary">Etapa</label>
              <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={inputCls}>
                {allStages.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-primary">Fuente</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
                <option value="">— Sin fuente —</option>
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <DatePicker
            label="Seguimiento"
            value={followUpAt}
            onChange={setFollowUpAt}
            placeholder="Sin fecha"
          />

          <div className="flex gap-3 pt-2 border-t border-border-subtle mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 font-semibold text-action-primary-foreground bg-action-primary hover:bg-black rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? "Creando..." : "Crear deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const { setConfig, resetState } = useHeader();
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDealModal, setShowDealModal] = useState(false);
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>();
  const [selectedPipelineIdx, setSelectedPipelineIdx] = useState(0);
  const [hiddenStats, setHiddenStats] = useState<Set<string>>(new Set());

  // ─── Hidden stat cards (persisted) ─────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pipeline_hidden_stats");
      if (raw) setHiddenStats(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, []);

  const hideStat = useCallback((id: string) => {
    setHiddenStats((prev) => {
      const next = new Set(prev).add(id);
      try { localStorage.setItem("pipeline_hidden_stats", JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const restoreStat = useCallback((id: string) => {
    setHiddenStats((prev) => {
      const next = new Set(prev);
      next.delete(id);
      try { localStorage.setItem("pipeline_hidden_stats", JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // ─── Header config ────────────────────────────────────────────────────────

  useEffect(() => {
    resetState();
    setConfig({
      title: "Pipeline de ventas",
      addButton: {
        label: "Nuevo deal",
        onClick: () => setShowDealModal(true),
      },
    });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchPipelines = useCallback(async () => {
    try {
      const res = await fetch("/api/deals");
      if (res.ok) {
        const data = await res.json();
        setPipelines(Array.isArray(data) ? data : []);
      }
    } catch { console.error("Error cargando pipeline"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPipelines(); }, [fetchPipelines]);

  // ─── Drag & Drop ─────────────────────────────────────────────────────────

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStageId = destination.droppableId;

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

    await fetch("/api/deals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draggableId, stageId: newStageId }),
    });
  };

  // ─── Stats ────────────────────────────────────────────────────────────────

  const allDeals = pipelines.flatMap((p) => p.stages.flatMap((s: any) => s.deals));
  const allStages = pipelines.flatMap((p) => p.stages);
  const wonStages = allStages.filter((s: any) => s.isWon);
  const wonDeals = allDeals.filter((d: any) => wonStages.some((s: any) => s.id === d.stageId));
  const activeDeals = allDeals.filter(
    (d: any) => !wonStages.some((s: any) => s.id === d.stageId) &&
    !allStages.filter((s: any) => s.isLost).some((s: any) => s.id === d.stageId)
  );

  const pipelineMXN = activeDeals.filter(d => d.currency === "MXN").reduce((s, d) => s + (d.value ?? 0), 0);
  const pipelineUSD = activeDeals.filter(d => d.currency !== "MXN").reduce((s, d) => s + (d.value ?? 0), 0);
  const wonMXN = wonDeals.filter(d => d.currency === "MXN").reduce((s, d) => s + (d.value ?? 0), 0);
  const wonUSD = wonDeals.filter(d => d.currency !== "MXN").reduce((s, d) => s + (d.value ?? 0), 0);
  const activeDealsUSD = activeDeals.filter((d) => d.currency !== "MXN");
  const activeDealsMXN = activeDeals.filter((d) => d.currency === "MXN");
  const wonDealsUSD = wonDeals.filter((d) => d.currency !== "MXN");
  const wonDealsMXN = wonDeals.filter((d) => d.currency === "MXN");
  const overdueDeals = activeDeals.filter((d) => d.followUpAt && new Date(d.followUpAt) < new Date());

  // ─── Stat card definitions (support hide/restore) ──────────────────────────

  const pipelineStats: StatDef[] = [
    {
      id: "total_deals",
      label: "Total deals",
      value: String(allDeals.length),
      sub: `${overdueDeals.length} necesitan atención`,
      badge: overdueDeals.length > 0 ? `${overdueDeals.length} vencidos` : undefined,
      badgePositive: false,
      chipValue: String(allDeals.length),
    },
    {
      id: "pipeline_usd",
      label: "Pipeline en USD",
      value: fmtUSD(pipelineUSD),
      sub: `${activeDealsUSD.length} deals activos`,
      badge: pipelineUSD > 0 ? "Activo" : undefined,
      badgePositive: true,
      chipValue: fmtUSD(pipelineUSD),
    },
    {
      id: "pipeline_mxn",
      label: "Pipeline en MXN",
      value: fmtMXN(pipelineMXN),
      sub: `${activeDealsMXN.length} deals activos`,
      badge: pipelineMXN > 0 ? "Activo" : undefined,
      badgePositive: true,
      chipValue: fmtMXN(pipelineMXN),
    },
    {
      id: "won_usd",
      label: "Ganados en USD",
      value: fmtUSD(wonUSD),
      sub: `${wonDealsUSD.length} deals cerrados`,
      badge: wonDealsUSD.length > 0 ? `+${wonDealsUSD.length}` : undefined,
      badgePositive: true,
      chipValue: fmtUSD(wonUSD),
    },
    {
      id: "won_mxn",
      label: "Ganados en MXN",
      value: fmtMXN(wonMXN),
      sub: `${wonDealsMXN.length} deals cerrados`,
      badge: wonDealsMXN.length > 0 ? `+${wonDealsMXN.length}` : undefined,
      badgePositive: true,
      chipValue: fmtMXN(wonMXN),
    },
    {
      id: "in_progress",
      label: "En proceso",
      value: String(activeDeals.length),
      sub: "Deals sin cerrar",
      chipValue: String(activeDeals.length),
    },
  ];

  const visibleStats = pipelineStats.filter((s) => !hiddenStats.has(s.id));
  const minimizedStats = pipelineStats.filter((s) => hiddenStats.has(s.id));

  // ─── Filtered deals for search ────────────────────────────────────────────

  const activePipeline = pipelines[selectedPipelineIdx] || pipelines[0];
  const filteredPipeline = activePipeline || null;

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-surface-app">
        <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <main className="flex-1 min-h-0 overflow-y-auto bg-surface-app font-sans">

          {/* ── Page header ── */}
          <div className="px-5 pt-3 pb-2 bg-white border-b border-border-subtle">

            {/* Stats row */}
            {visibleStats.length > 0 && (
              <div className="flex gap-2.5 mb-2 overflow-x-auto pb-0.5">
                {visibleStats.map((s) => (
                  <StatCard
                    key={s.id}
                    label={s.label}
                    value={s.value}
                    values={s.values}
                    sub={s.sub}
                    badge={s.badge}
                    badgePositive={s.badgePositive}
                    onHide={() => hideStat(s.id)}
                  />
                ))}
                
                {/* Historial link embedded in stats row */}
                <Link 
                  href="/pipeline/historial"
                  className="flex items-center gap-3 px-5 py-3 bg-white border border-border-subtle rounded-xl hover:bg-gray-50 transition-colors shrink-0 min-w-[200px]"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={Folder01Icon} size={20} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-bold text-text-primary whitespace-nowrap">Historial</span>
                    <span className="text-xs text-text-secondary whitespace-nowrap truncate">Ver ventas archivadas</span>
                  </div>
                </Link>
              </div>
            )}

            {/* Minimized summary bar */}
            {minimizedStats.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {minimizedStats.map((s) => (
                  <StatChip
                    key={s.id}
                    label={s.label}
                    value={s.chipValue}
                    onRestore={() => restoreStat(s.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Content ── */}
          <div>
            {/* Toolbar */}
            <div className="px-5 py-2 flex items-center gap-3 bg-surface-app">
              {/* Pipeline selector */}
              {pipelines.length > 1 && (
                <select
                  value={selectedPipelineIdx}
                  onChange={(e) => setSelectedPipelineIdx(parseInt(e.target.value))}
                  className="text-sm border border-border-subtle bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all"
                >
                  {pipelines.map((p, i) => (
                    <option key={p.id} value={i}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Kanban */}
            {pipelines.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-3 border border-border-subtle">
                    <HugeiconsIcon icon={KanbanIcon} size={22} color="#9ca3af" />
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary mb-1">Sin pipelines configurados</h3>
                  <p className="text-xs text-text-secondary">Crea un pipeline desde configuración para comenzar.</p>
                </div>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="overflow-x-auto">
                  {filteredPipeline && (
                    <div className="flex gap-3 px-5 py-3 items-start">
                      {filteredPipeline.stages.map((stage: any) => (
                        <KanbanColumn
                          key={stage.id}
                          stage={stage}
                          deals={stage.deals}
                          onAddDeal={(stageId) => {
                            setDefaultStageId(stageId);
                            setShowDealModal(true);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </DragDropContext>
            )}
          </div>
        </main>

      {/* Deal modal */}
      {showDealModal && (
        <NewDealModal
          pipelines={pipelines.map((p) => ({ id: p.id, name: p.name, stages: p.stages }))}
          defaultStageId={defaultStageId}
          onSuccess={() => { setShowDealModal(false); fetchPipelines(); }}
          onClose={() => setShowDealModal(false)}
        />
      )}
    </>
  );
}
