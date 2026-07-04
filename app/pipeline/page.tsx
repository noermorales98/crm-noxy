"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useHeader } from "@/src/context/HeaderContext";
import DatePicker from "@/src/components/DatePicker";
import ClientDrawer from "@/src/components/ClientDrawer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  User02Icon,
  CalendarCheckIn01Icon,
  MessageIcon,
  KanbanIcon,
  Search01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Building02Icon,
  DollarCircleIcon,
  RefreshIcon,
  Money02Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { input as inputCls } from "@/src/lib/crm-ui";

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

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function fmtUSD(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v);
}

function fmtMXN(v: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(v);
}

function fmtCurrency(v: number, currency: string) {
  return currency === "MXN" ? fmtMXN(v) : fmtUSD(v);
}

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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40 p-4">
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
                  className={`px-3 py-2.5 text-sm font-bold transition-all ${currency === "USD" ? "bg-accent-charcoal text-white" : "text-text-secondary hover:bg-nav-hover"}`}
                >
                  USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("MXN")}
                  className={`px-3 py-2.5 text-sm font-bold transition-all ${currency === "MXN" ? "bg-accent-charcoal text-white" : "text-text-secondary hover:bg-nav-hover"}`}
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
              className="flex-1 py-2.5 font-semibold text-white bg-accent-charcoal hover:bg-black rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? "Creando..." : "Crear deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── New Client Modal ─────────────────────────────────────────────────────────

function NewClientModal({
  onSuccess,
  onClose,
}: {
  onSuccess: (client: any) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [billingDay, setBillingDay] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !monthlyFee || !startDate) {
      setError("Nombre, cuota y fecha de inicio son requeridos.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, monthlyFee, currency, startDate, billingDay, notes }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Error al crear el cliente.");
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle">
          <h2 className="text-base font-bold text-text-primary">Nuevo cliente</h2>
          <button onClick={onClose} className="p-1 text-text-secondary hover:text-text-secondary rounded-lg">
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg border border-red-100">{error}</div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Nombre del cliente *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Ej. Empresa Ejemplo S.A."
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-primary">Cuota mensual *</label>
              <input
                type="number"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                className={inputCls}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-primary">Moneda</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                <option value="USD">USD — Dólar</option>
                <option value="MXN">MXN — Peso mexicano</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Inicio de contrato *"
              value={startDate}
              onChange={setStartDate}
              placeholder="Seleccionar"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-primary">Día de cobro</label>
              <input
                type="number"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                className={inputCls}
                min="1"
                max="28"
                placeholder="1"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Servicio, condiciones, etc."
            />
          </div>
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
              className="flex-1 py-2.5 font-semibold text-white bg-accent-charcoal hover:bg-black rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Crear cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Client Card ──────────────────────────────────────────────────────────────

function ClientCard({
  client,
  onMarkPaid,
  onClick,
  onDelete,
}: {
  client: any;
  onMarkPaid: (clientId: string, paymentId: string) => void;
  onClick: () => void;
  onDelete?: (clientId: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const currentPayment = client.payments?.find(
    (p: any) => p.month === currentMonth && p.year === currentYear
  );

  const isPaid = currentPayment?.status === "RECIBIDO";
  const isPending = !currentPayment || currentPayment.status === "PENDIENTE";

  const monthsSinceStart = (() => {
    const start = new Date(client.startDate);
    return (
      (currentYear - start.getFullYear()) * 12 +
      (currentMonth - (start.getMonth() + 1))
    );
  })();

  return (
    <div
      onClick={() => !confirming && onClick()}
      className="group relative bg-white border border-border-subtle rounded-lg p-3.5 hover:border-border-subtle transition-all cursor-pointer"
    >
      {onDelete && confirming && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/95 rounded-lg border border-border-subtle"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setConfirming(false)}
            className="text-xs px-3 py-1.5 rounded-lg hover:bg-nav-hover text-text-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onDelete(client.id)}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-semibold transition-colors"
          >
            Eliminar
          </button>
        </div>
      )}

      {onDelete && !confirming && (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
          title="Eliminar cliente"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md text-text-secondary hover:text-red-600 hover:bg-red-50 transition-all z-[1]"
        >
          <HugeiconsIcon icon={Delete02Icon} size={14} />
        </button>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2 pr-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
              {client.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{client.name}</p>
              {client.company && (
                <p className="text-[11px] text-text-secondary truncate">{client.company.name}</p>
              )}
            </div>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ml-1 ${
            client.isActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-gray-100 text-text-secondary border-border-subtle"
          }`}
        >
          {client.isActive ? "Activo" : "Pausado"}
        </span>
      </div>

      {/* Fee */}
      <p className="text-lg font-bold text-text-primary mb-0.5">
        {fmtCurrency(client.monthlyFee, client.currency)}
        <span className="text-xs font-normal text-text-secondary ml-1">/mes</span>
      </p>
      <p className="text-[11px] text-text-secondary mb-3">
        {client.currency} · Día {client.billingDay} ·{" "}
        {monthsSinceStart > 0 ? `${monthsSinceStart} mes${monthsSinceStart !== 1 ? "es" : ""}` : "Nuevo"}
      </p>

      {/* This month payment status */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border-subtle">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary mb-0.5">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </p>
          {isPaid ? (
            <div className="flex items-center gap-1.5 text-emerald-600">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
              <span className="text-xs font-semibold">Pagado</span>
              {currentPayment?.receivedAt && (
                <span className="text-xs text-text-secondary">
                  · {new Date(currentPayment.receivedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-500">
              <HugeiconsIcon icon={DollarCircleIcon} size={14} />
              <span className="text-xs font-semibold">Pendiente</span>
            </div>
          )}
        </div>

        {isPending && client.isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkPaid(client.id, currentPayment?.id); }}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-accent-charcoal text-white hover:bg-black transition-colors"
          >
            Marcar pagado
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  values,
  sub,
  badge,
  badgePositive,
  onHide,
}: {
  label: string;
  value?: string;
  values?: { label: string; amount: string }[];
  sub: string;
  badge?: string;
  badgePositive?: boolean;
  onHide?: () => void;
}) {
  return (
    <div className="group relative bg-white border border-border-subtle rounded-lg p-3 flex-1 min-w-[140px]">
      {onHide && (
        <button
          onClick={onHide}
          title="Ocultar resumen"
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-0.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-nav-hover transition-all"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={12} />
        </button>
      )}
      <p className="text-[10px] font-semibold text-text-secondary mb-1.5 uppercase tracking-wide pr-4">{label}</p>
      {values ? (
        <div className="flex flex-col gap-0.5 mb-0.5">
          {values.map((v) => (
            <div key={v.label} className="flex items-baseline gap-1.5">
              <p className="text-lg font-bold text-text-primary truncate">{v.amount}</p>
              <span className="text-[10px] font-semibold text-text-secondary bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">{v.label}</span>
            </div>
          ))}
          {badge && (
            <span className={`mt-0.5 self-start text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badgePositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {badge}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <p className="text-xl font-bold text-text-primary truncate">{value}</p>
          {badge && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badgePositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {badge}
            </span>
          )}
        </div>
      )}
      <p className="text-[11px] text-text-secondary">{sub}</p>
    </div>
  );
}

// ─── Compact stat chip (minimized summary bar) ────────────────────────────────

function StatChip({
  label,
  value,
  onRestore,
}: {
  label: string;
  value: string;
  onRestore: () => void;
}) {
  return (
    <button
      onClick={onRestore}
      title="Restaurar resumen"
      className="group flex items-center gap-2 shrink-0 bg-white border border-border-subtle rounded-lg px-3 py-1.5 hover:border-gray-300 hover:bg-nav-hover transition-colors"
    >
      <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">{label}</span>
      <span className="text-xs font-bold text-text-primary truncate max-w-[140px]">{value}</span>
      <span className="text-text-secondary group-hover:text-text-primary transition-colors">
        <HugeiconsIcon icon={Add01Icon} size={12} />
      </span>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const { setConfig, resetState } = useHeader();
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(false);
  const [activeTab, setActiveTab] = useState<"pipeline" | "clientes">("pipeline");
  const [showDealModal, setShowDealModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>();
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [search, setSearch] = useState("");
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
      searchPlaceholder: activeTab === "pipeline" ? "Buscar deal..." : "Buscar cliente...",
      addButton: {
        label: activeTab === "pipeline" ? "Nuevo deal" : "Nuevo cliente",
        onClick: () => activeTab === "pipeline" ? setShowDealModal(true) : setShowClientModal(true),
      },
    });
    return () => setConfig({});
  }, [activeTab]);

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

  const fetchClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) setClients(await res.json());
    } catch { console.error("Error cargando clientes"); }
    finally { setLoadingClients(false); }
  }, []);

  useEffect(() => { fetchPipelines(); }, [fetchPipelines]);

  useEffect(() => {
    if (activeTab === "clientes") fetchClients();
  }, [activeTab, fetchClients]);

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

  // ─── Clients: mark paid ───────────────────────────────────────────────────

  const handleMarkPaid = async (clientId: string, paymentId?: string) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    if (paymentId) {
      // Update existing payment
      await fetch(`/api/clients/${clientId}/payments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, status: "RECIBIDO" }),
      });
    } else {
      // Create new payment as received
      const client = clients.find((c) => c.id === clientId);
      await fetch(`/api/clients/${clientId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          amount: client?.monthlyFee,
          currency: client?.currency,
          status: "RECIBIDO",
        }),
      });
      // Then mark as received
      const res = await fetch(`/api/clients/${clientId}/payments`);
      if (res.ok) {
        const payments = await res.json();
        const p = payments.find((x: any) => x.month === month && x.year === year);
        if (p) {
          await fetch(`/api/clients/${clientId}/payments`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId: p.id, status: "RECIBIDO" }),
          });
        }
      }
    }

    fetchClients();
  };

  const handleDeleteClient = async (clientId: string) => {
    const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    if (!res.ok) return;
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    if (selectedClient?.id === clientId) setSelectedClient(null);
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

  // Client stats
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const activeClients = clients.filter((c) => c.isActive);
  const mrrUSD = activeClients
    .filter((c) => c.currency === "USD")
    .reduce((s, c) => s + c.monthlyFee, 0);
  const mrrMXN = activeClients
    .filter((c) => c.currency === "MXN")
    .reduce((s, c) => s + c.monthlyFee, 0);
  const pendingThisMonth = activeClients.filter(
    (c) => !c.payments?.some((p: any) => p.month === currentMonth && p.year === currentYear && p.status === "RECIBIDO")
  ).length;

  // ─── Stat card definitions (support hide/restore) ──────────────────────────

  type StatDef = {
    id: string;
    label: string;
    value?: string;
    values?: { label: string; amount: string }[];
    sub: string;
    badge?: string;
    badgePositive?: boolean;
    chipValue: string;
  };

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

  const clientStats: StatDef[] = [
    {
      id: "active_clients",
      label: "Clientes activos",
      value: String(activeClients.length),
      sub: `${clients.length} clientes en total`,
      chipValue: String(activeClients.length),
    },
    {
      id: "mrr_usd",
      label: "MRR en USD",
      value: fmtUSD(mrrUSD),
      sub: "Ingresos mensuales recurrentes",
      badge: mrrUSD > 0 ? "Activo" : undefined,
      badgePositive: true,
      chipValue: fmtUSD(mrrUSD),
    },
    {
      id: "mrr_mxn",
      label: "MRR en MXN",
      value: fmtMXN(mrrMXN),
      sub: "Ingresos mensuales recurrentes",
      badge: mrrMXN > 0 ? "Activo" : undefined,
      badgePositive: true,
      chipValue: fmtMXN(mrrMXN),
    },
    {
      id: "pending_month",
      label: "Pendientes este mes",
      value: String(pendingThisMonth),
      sub: `de ${activeClients.length} clientes activos`,
      badge: pendingThisMonth > 0 ? `${pendingThisMonth} pendientes` : undefined,
      badgePositive: false,
      chipValue: String(pendingThisMonth),
    },
  ];

  const currentStats = activeTab === "pipeline" ? pipelineStats : clientStats;
  const visibleStats = currentStats.filter((s) => !hiddenStats.has(s.id));
  const minimizedStats = currentStats.filter((s) => hiddenStats.has(s.id));

  // ─── Filtered deals for search ────────────────────────────────────────────

  const activePipeline = pipelines[selectedPipelineIdx] || pipelines[0];
  const filteredPipeline = activePipeline
    ? {
        ...activePipeline,
        stages: activePipeline.stages.map((stage: any) => ({
          ...stage,
          deals: search
            ? stage.deals.filter(
                (d: any) =>
                  d.title.toLowerCase().includes(search.toLowerCase()) ||
                  d.company?.name?.toLowerCase().includes(search.toLowerCase())
              )
            : stage.deals,
        })),
      }
    : null;

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
          <div className="px-5 pt-3 pb-0 bg-white border-b border-border-subtle">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={KanbanIcon} size={18} color="#9ca3af" />
                <h1 className="text-lg font-bold text-text-primary">Pipeline de ventas</h1>
              </div>
            </div>

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
              </div>
            )}

            {/* Minimized summary bar */}
            {minimizedStats.length > 0 && (
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
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

            {visibleStats.length > 0 && minimizedStats.length === 0 && <div className="mb-1" />}

            {/* Tabs */}
            <div className="flex gap-0.5">
              <button
                onClick={() => setActiveTab("pipeline")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                  activeTab === "pipeline"
                    ? "border-accent-charcoal text-text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                <HugeiconsIcon icon={KanbanIcon} size={15} />
                Pipeline
              </button>
              <button
                onClick={() => setActiveTab("clientes")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                  activeTab === "clientes"
                    ? "border-accent-charcoal text-text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                <HugeiconsIcon icon={Money02Icon} size={15} />
                Clientes
                {activeClients.length > 0 && (
                  <span className="bg-gray-100 text-text-secondary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {activeClients.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ── Content ── */}
          {activeTab === "pipeline" ? (
            // ── Pipeline tab ──────────────────────────────────────────────────
            <div>
              {/* Toolbar */}
              <div className="px-5 py-2 flex items-center gap-3 bg-surface-app">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={15}
                    color="#9ca3af"
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar deal o empresa..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-secondary"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={14} />
                    </button>
                  )}
                </div>

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
          ) : (
            // ── Clientes tab ──────────────────────────────────────────────────
            <div className="px-5 py-3">
              {loadingClients ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-7 h-7 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
                </div>
              ) : clients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-3 border border-border-subtle">
                    <HugeiconsIcon icon={RefreshIcon} size={22} color="#9ca3af" />
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary mb-1">Sin clientes recurrentes</h3>
                  <p className="text-xs text-text-secondary mb-3 max-w-xs">
                    Agrega tus clientes establecidos que pagan mensualmente para llevar el control de sus pagos.
                  </p>
                  <button
                    onClick={() => setShowClientModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-accent-charcoal text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors"
                  >
                    <HugeiconsIcon icon={Add01Icon} size={15} />
                    Agregar primer cliente
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {clients.map((client) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      onMarkPaid={handleMarkPaid}
                      onClick={() => setSelectedClient(client)}
                      onDelete={handleDeleteClient}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

      {/* Deal modal */}
      {showDealModal && (
        <NewDealModal
          pipelines={pipelines.map((p) => ({ id: p.id, name: p.name, stages: p.stages }))}
          defaultStageId={defaultStageId}
          onSuccess={(deal) => { setShowDealModal(false); fetchPipelines(); }}
          onClose={() => setShowDealModal(false)}
        />
      )}

      {/* Client modal */}
      {showClientModal && (
        <NewClientModal
          onSuccess={(client) => { setShowClientModal(false); fetchClients(); }}
          onClose={() => setShowClientModal(false)}
        />
      )}

      {/* Client drawer */}
      {selectedClient && (
        <ClientDrawer
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onUpdate={(updated) => {
            setClients((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
            setSelectedClient((prev: any) => prev?.id === updated.id ? { ...prev, ...updated } : prev);
          }}
        />
      )}
    </>
  );
}
