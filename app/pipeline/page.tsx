"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Cancel01Icon,
  Building02Icon,
  Folder01Icon,
} from "@hugeicons/core-free-icons";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { input as inputCls, selectInline } from "@/src/lib/crm-ui";
import { fmtUSD, fmtMXN, StatCard, StatChip, type StatDef } from "@/src/components/pipeline/PipelineShared";
import {
  Board,
  BoardCard,
  BoardColumn,
  Chip,
  EmptyState,
  Enter,
  ErrorState,
  PageHeader,
  Segmented,
  Skeleton,
  useDialog,
} from "@/src/components/ui";
import { visiblePipelines } from "@/src/lib/pipeline-categories";
import { addStageFor, buildBoardColumns, dealsForColumn, dropStageFor, type BoardColumn as BoardColumnDef } from "@/src/lib/pipeline-board";
import { readCache, writeCache } from "@/src/lib/client-cache";

const DEALS_CACHE_KEY = "pipeline:deals";
const DEALS_CACHE_MS = 5 * 60_000;

// Colores de la fuente del deal: categorías de datos, se conservan (DESIGN.md).
const SOURCE_COLORS: Record<string, string> = {
  WHATSAPP: "bg-green-50 text-green-700",
  REFERIDO: "bg-purple-50 text-purple-700",
  LINKEDIN: "bg-blue-50 text-blue-700",
  VISITA: "bg-amber-50 text-amber-800",
  EMAIL_FRIO: "bg-surface-sidebar text-text-secondary",
  FORMULARIO: "bg-teal-50 text-teal-700",
  INSTAGRAM: "bg-pink-50 text-pink-700",
  TIKTOK: "bg-cyan-50 text-cyan-700",
  FACEBOOK: "bg-indigo-50 text-indigo-700",
  OTRO: "bg-surface-sidebar text-text-secondary",
};

const SOURCE_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  REFERIDO: "Referido",
  LINKEDIN: "LinkedIn",
  VISITA: "Visita",
  EMAIL_FRIO: "Email frío",
  FORMULARIO: "Formulario",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  FACEBOOK: "Facebook",
  OTRO: "Otro",
};

const secondaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface-elevated px-4 text-sm font-semibold text-text-primary hover:bg-surface-sidebar lg:min-h-10";
const primaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary disabled:opacity-50 lg:min-h-10";

function DealCard({ deal, index, category }: { deal: any; index: number; category?: string }) {
  const router = useRouter();
  const isOverdue = deal.followUpAt && new Date(deal.followUpAt) < new Date();
  const open = () => router.push(`/pipeline/${deal.id}`);

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={open}
          onKeyDown={(e) => {
            // Durante un arrastre con teclado, Intro no navega (el sensor de dnd no detiene la propagación).
            if (e.key === "Enter" && !snapshot.isDragging && !e.defaultPrevented) open();
          }}
          aria-label={[
            deal.title,
            deal.company?.name,
            deal.currency === "MXN" ? fmtMXN(deal.value ?? 0) : fmtUSD(deal.value ?? 0),
            isOverdue ? "Necesita atención" : "En camino",
          ].filter(Boolean).join(", ")}
          className="cursor-pointer select-none rounded-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-ink"
        >
          <BoardCard dragging={snapshot.isDragging}>
            <p className="mb-1.5 line-clamp-2 text-sm font-semibold leading-snug text-text-primary">{deal.title}</p>

            {deal.company && (
              <div className="mb-2 flex items-center gap-1.5 text-xs text-text-secondary">
                <HugeiconsIcon icon={Building02Icon} size={12} />
                <span className="truncate">{deal.company.name}</span>
              </div>
            )}

            <p className="mb-2 text-base font-semibold tabular-nums text-text-primary">
              {deal.currency === "MXN" ? fmtMXN(deal.value ?? 0) : fmtUSD(deal.value ?? 0)}
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              {category && <Chip tone="neutral">{category}</Chip>}
              {deal.source && (
                <span className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold ${SOURCE_COLORS[deal.source] || SOURCE_COLORS.OTRO}`}>
                  {SOURCE_LABELS[deal.source] || deal.source}
                </span>
              )}
              <Chip tone={isOverdue ? "hot" : "neutral"}>{isOverdue ? "Necesita atención" : "En camino"}</Chip>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
              {deal.contact ? (
                <div className="flex min-w-0 items-center gap-1.5">
                  {/* Avatar con el color de contacto de los datos. */}
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                    {deal.contact.firstName?.[0]?.toUpperCase() || "?"}
                  </span>
                  <span className="truncate text-xs text-text-secondary">
                    {deal.contact.firstName} {deal.contact.lastName || ""}
                  </span>
                </div>
              ) : (
                <span className="text-text-secondary" aria-label="Sin contacto">
                  <HugeiconsIcon icon={User02Icon} size={14} />
                </span>
              )}
              {deal._count?.activities > 0 && (
                <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-text-secondary">
                  <HugeiconsIcon icon={MessageIcon} size={12} />
                  {deal._count.activities}
                </span>
              )}
            </div>

            {deal.followUpAt && (
              <div className={`mt-2 flex items-center gap-1.5 text-xs ${isOverdue ? "font-semibold text-danger" : "text-text-secondary"}`}>
                <HugeiconsIcon icon={CalendarCheckIn01Icon} size={12} />
                <span>
                  {new Date(deal.followUpAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                {isOverdue && <Chip tone="late">Vencido</Chip>}
              </div>
            )}
          </BoardCard>
        </div>
      )}
    </Draggable>
  );
}

function KanbanColumn({
  column,
  deals,
  categoryOf,
  onAddDeal,
}: {
  column: BoardColumnDef;
  deals: any[];
  /** Nombre de la categoría (pipeline) de cada deal; solo se muestra cuando el tablero junta varias. */
  categoryOf?: (deal: any) => string | undefined;
  onAddDeal: (column: BoardColumnDef) => void;
}) {
  return (
    <BoardColumn
      title={column.name}
      accent={column.color || "#6B7280"}
      collapsed={deals.length === 0}
      footer={
        deals.length === 0 ? (
          <button
            type="button"
            onClick={() => onAddDeal(column)}
            aria-label={`Agregar deal en ${column.name}`}
            title="Agregar deal"
            className="flex size-11 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary lg:size-9"
          >
            <HugeiconsIcon icon={Add01Icon} size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAddDeal(column)}
            className="flex min-h-11 w-full items-center gap-1.5 rounded-control px-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary lg:min-h-9"
          >
            <HugeiconsIcon icon={Add01Icon} size={14} />
            Agregar deal
          </button>
        )
      }
    >
      <Droppable droppableId={column.key}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex min-h-24 flex-1 flex-col gap-2 rounded-control transition-colors ${
              snapshot.isDraggingOver ? "bg-surface-elevated/60 ring-2 ring-line" : ""
            }`}
          >
            {deals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} index={index} category={categoryOf?.(deal)} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </BoardColumn>
  );
}

const SOURCE_OPTIONS = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "REFERIDO", label: "Referido" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "VISITA", label: "Visita" },
  { value: "EMAIL_FRIO", label: "Email frío" },
  { value: "FORMULARIO", label: "Formulario" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "FACEBOOK", label: "Facebook" },
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
  const allStages = pipelines.flatMap((p) => p.stages.map((s: any) => ({ ...s, pipelineName: p.name })));
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [stageId, setStageId] = useState(defaultStageId || allStages[0]?.id || "");
  const [source, setSource] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, true, onClose);

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

  const currencyButton = (code: string) =>
    `min-h-11 px-3 text-sm font-semibold transition-colors ${
      currency === code ? "bg-action-primary text-action-primary-foreground" : "text-text-secondary hover:bg-surface-elevated"
    }`;

  return (
    /* Sin overflow-hidden para que el DatePicker portal no quede tapado */
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-brand-obsidian/35 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-deal-title"
        className="w-full max-w-md rounded-surface bg-surface-elevated shadow-[0_8px_8px_rgba(11,11,24,0.10)]"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="new-deal-title" className="text-base font-semibold text-text-primary">Nuevo deal</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar hover:text-text-primary lg:size-9"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {error && (
            <div role="alert" className="rounded-control bg-danger-soft px-4 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="deal-title" className="text-sm font-semibold text-text-primary">Título *</label>
            <input
              id="deal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="Ej. Proyecto de branding para Acme"
            />
          </div>

          {/* Valor + moneda */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="deal-value" className="text-sm font-semibold text-text-primary">Valor</label>
            <div className="flex gap-2">
              <div className="flex shrink-0 overflow-hidden rounded-control border border-line bg-surface-sidebar" role="group" aria-label="Moneda">
                <button type="button" aria-pressed={currency === "USD"} onClick={() => setCurrency("USD")} className={currencyButton("USD")}>
                  USD
                </button>
                <button type="button" aria-pressed={currency === "MXN"} onClick={() => setCurrency("MXN")} className={currencyButton("MXN")}>
                  MXN
                </button>
              </div>
              <input
                id="deal-value"
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="deal-stage" className="text-sm font-semibold text-text-primary">Etapa</label>
              <select id="deal-stage" value={stageId} onChange={(e) => setStageId(e.target.value)} className={inputCls}>
                {allStages.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="deal-source" className="text-sm font-semibold text-text-primary">Fuente</label>
              <select id="deal-source" value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
                <option value="">Sin fuente</option>
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <DatePicker label="Seguimiento" value={followUpAt} onChange={setFollowUpAt} placeholder="Sin fecha" />

          <div className="mt-2 flex gap-3 border-t border-line pt-4">
            <button type="button" onClick={onClose} className={`${secondaryAction} flex-1`}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={`${primaryAction} flex-1`}>
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
  // Al volver a la pantalla se pinta al instante con lo último visto y se actualiza en segundo plano.
  const [pipelines, setPipelines] = useState<any[]>(() => readCache<any[]>(DEALS_CACHE_KEY, DEALS_CACHE_MS) ?? []);
  const [loading, setLoading] = useState(() => readCache<any[]>(DEALS_CACHE_KEY, DEALS_CACHE_MS) === undefined);
  const [loadError, setLoadError] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>();
  // Categoría (pipeline) elegida: «all» = todo el pipeline junto. Se recuerda entre visitas.
  const [selectedPipeline, setSelectedPipeline] = useState("all");
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [hiddenStats, setHiddenStats] = useState<Set<string>>(new Set());

  // ─── Hidden stat cards (persisted) ─────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pipeline_hidden_stats");
      if (raw) setHiddenStats(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pipeline_category");
      if (saved) setSelectedPipeline(saved);
    } catch { /* ignore */ }
  }, []);

  const chooseCategory = useCallback((value: string) => {
    setSelectedPipeline(value);
    try { localStorage.setItem("pipeline_category", value); } catch { /* ignore */ }
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
    setConfig({ title: "Pipeline de ventas", pageHeader: true });
    return () => setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchPipelines = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch("/api/deals");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setPipelines(list);
        writeCache(DEALS_CACHE_KEY, list);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPipelines(); }, [fetchPipelines]);

  // Mantiene la copia en caché al día con los cambios locales (p. ej. al arrastrar un deal).
  useEffect(() => {
    if (!loading && pipelines.length > 0) writeCache(DEALS_CACHE_KEY, pipelines);
  }, [pipelines, loading]);

  const retry = () => {
    setLoading(true);
    fetchPipelines();
  };

  // ─── Drag & Drop ─────────────────────────────────────────────────────────

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    // Las columnas juntan varios pipelines: el deal va a la etapa de SU pipeline con ese nombre; si no la tiene, no se mueve.
    const column = buildBoardColumns(pipelines).find((c) => c.key === destination.droppableId);
    const deal = pipelines.flatMap((p: any) => p.stages.flatMap((s: any) => s.deals)).find((d: any) => d.id === draggableId);
    const newStageId = column && deal ? dropStageFor(column, deal.pipelineId) : null;
    if (!newStageId) return;

    setPipelines((prev) =>
      prev.map((pipeline) => ({
        ...pipeline,
        stages: pipeline.stages.map((stage: any) => ({
          ...stage,
          deals:
            stage.id === newStageId
              ? [{ ...deal, stageId: newStageId }, ...stage.deals.filter((d: any) => d.id !== draggableId)]
              : stage.deals.filter((d: any) => d.id !== draggableId),
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

  const shownPipelines = visiblePipelines(pipelines, selectedPipeline);
  const showHeadings = shownPipelines.length > 1;

  const createCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingCategory(true);
    setCategoryError(null);
    try {
      const res = await fetch("/api/pipelines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: categoryName }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo crear la categoría");
      setCategoryName("");
      setAddingCategory(false);
      chooseCategory(data.id);
      await fetchPipelines();
    } catch (e) {
      setCategoryError(e instanceof Error ? e.message : "Error");
    } finally {
      setCreatingCategory(false);
    }
  };

  const openNewDeal = (stageId?: string) => {
    setDefaultStageId(stageId);
    setShowDealModal(true);
  };

  // Un solo tablero: las columnas de todos los pipelines (o del elegido) juntas.
  const boardColumns = buildBoardColumns(shownPipelines);
  const pipelineNames = new Map(pipelines.map((p: any) => [p.id, p.name]));
  const categoryOf = showHeadings ? (deal: any) => pipelineNames.get(deal.pipelineId) : undefined;
  const addDealIn = (column: BoardColumnDef) => openNewDeal(addStageFor(column, shownPipelines.length === 1 ? shownPipelines[0].id : null));

  return (
    <>
      <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        <Enter index={0}>
          <PageHeader
            title="Pipeline de ventas"
            subtitle={loading ? "Cargando pipeline…" : `${activeDeals.length} deals en proceso · ${overdueDeals.length} necesitan atención`}
            actions={
              <>
                <Link href="/pipeline/historial" className={secondaryAction}>
                  <HugeiconsIcon icon={Folder01Icon} size={16} />
                  Historial
                </Link>
                <button type="button" onClick={() => openNewDeal()} disabled={loading || pipelines.length === 0} className={primaryAction}>
                  <HugeiconsIcon icon={Add01Icon} size={16} />
                  Nuevo deal
                </button>
              </>
            }
          />
        </Enter>

        {loading ? (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
              <Skeleton shape="stats" count={4} label="Cargando resumen" />
            </div>
            <Skeleton shape="board" count={4} label="Cargando tablero" />
          </div>
        ) : loadError && pipelines.length === 0 ? (
          <div className="rounded-surface border border-line bg-surface-elevated">
            <ErrorState title="No se pudo cargar el pipeline" onRetry={retry} />
          </div>
        ) : (
          <>
            {/* Resumen: cada cifra se puede ocultar; las ocultas quedan como chips para restaurarlas. */}
            {visibleStats.length > 0 && (
              <Enter index={1}>
                <section aria-label="Resumen del pipeline" className="mb-3 flex overflow-x-auto rounded-surface border border-line bg-surface-elevated">
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
                </section>
              </Enter>
            )}

            {minimizedStats.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                {minimizedStats.map((s) => (
                  <StatChip key={s.id} label={s.label} value={s.chipValue} onRestore={() => restoreStat(s.id)} />
                ))}
              </div>
            )}

            {pipelines.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Segmented
                  label="Categoría del pipeline"
                  value={pipelines.some((p) => p.id === selectedPipeline) ? selectedPipeline : "all"}
                  onChange={chooseCategory}
                  options={[{ value: "all", label: "Todos" }, ...pipelines.map((p) => ({ value: p.id, label: p.name }))]}
                />
                {addingCategory ? (
                  <form onSubmit={createCategory} className="flex items-center gap-1">
                    <label htmlFor="new-category" className="sr-only">Nombre de la categoría</label>
                    <input
                      id="new-category"
                      autoFocus
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") { setAddingCategory(false); setCategoryError(null); } }}
                      placeholder="Nombre de la categoría"
                      maxLength={60}
                      className={`${inputCls} min-h-11 w-52 lg:min-h-9`}
                    />
                    <button type="submit" disabled={creatingCategory || !categoryName.trim()} className={primaryAction}>
                      {creatingCategory ? "Creando…" : "Crear"}
                    </button>
                  </form>
                ) : (
                  <button type="button" onClick={() => setAddingCategory(true)} className="crm-press inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-text-secondary-strong hover:bg-nav-hover hover:text-text-primary lg:min-h-9">
                    <HugeiconsIcon icon={Add01Icon} size={14} aria-hidden="true" />
                    Nueva categoría
                  </button>
                )}
                {categoryError && <p role="alert" className="w-full text-xs text-danger">{categoryError}</p>}
              </div>
            )}

            <Enter index={2}>
              {pipelines.length === 0 ? (
                <div className="rounded-surface border border-line bg-surface-elevated">
                  <EmptyState title="Sin pipelines configurados" body="Crea un pipeline desde configuración para comenzar." />
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Board label={shownPipelines.length > 1 ? "Tablero del pipeline (todas las categorías)" : `Tablero ${shownPipelines[0]?.name ?? "del pipeline"}`}>
                    {boardColumns.map((column) => (
                      <KanbanColumn key={column.key} column={column} deals={dealsForColumn(shownPipelines, column)} categoryOf={categoryOf} onAddDeal={addDealIn} />
                    ))}
                  </Board>
                </DragDropContext>
              )}
            </Enter>
          </>
        )}
      </main>

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
