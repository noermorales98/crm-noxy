"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
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
} from "@hugeicons/core-free-icons";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
          className={`bg-white border rounded-2xl p-4 cursor-pointer transition-all select-none group ${
            snapshot.isDragging
              ? "shadow-2xl ring-2 ring-gray-900/10 rotate-1 scale-105"
              : "border-gray-100 hover:border-gray-200 hover:shadow-md"
          }`}
        >
          {/* Title */}
          <p className="text-sm font-semibold text-gray-900 leading-snug mb-1.5 line-clamp-2">
            {deal.title}
          </p>

          {/* Company */}
          {deal.company && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
              <HugeiconsIcon icon={Building02Icon} size={11} />
              <span className="truncate">{deal.company.name}</span>
            </div>
          )}

          {/* Value */}
          <p className="text-base font-bold text-gray-900 mb-3">
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
          <div className="flex items-center justify-between mt-2 pt-2.5 border-t border-gray-50">
            {/* Contact avatar */}
            {deal.contact ? (
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[9px] font-bold">
                  {deal.contact.firstName?.[0]?.toUpperCase() || "?"}
                </div>
                <span className="text-[11px] text-gray-500 truncate max-w-[100px]">
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
                isOverdue ? "text-red-500 font-semibold" : "text-gray-400"
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
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1.5">
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
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: stage.color || "#6B7280" }}
        />
        <span className="text-sm font-bold text-gray-900 flex-1 truncate">{stage.name}</span>
        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
          {deals.length}
        </span>
        <div className="flex flex-col items-end gap-0.5">
          {totalMXN > 0 && (
            <span className="text-[10px] font-bold text-gray-500">{fmtMXN(totalMXN)}</span>
          )}
          {totalUSD > 0 && (
            <span className="text-[10px] font-bold text-gray-500">{fmtUSD(totalUSD)}</span>
          )}
        </div>
      </div>

      {/* Droppable */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2.5 flex-1 min-h-[80px] rounded-2xl p-2 transition-colors ${
              snapshot.isDraggingOver ? "bg-gray-100/80 ring-2 ring-gray-200" : "bg-gray-50/60"
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

const inputCls =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm";

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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Nuevo deal</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Título *</label>
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
            <label className="text-sm font-semibold text-gray-700">Valor</label>
            <div className="flex gap-2">
              <div className="flex rounded-xl border border-gray-200 bg-gray-50 overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={`px-3 py-2.5 text-sm font-bold transition-all ${currency === "USD" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  USD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("MXN")}
                  className={`px-3 py-2.5 text-sm font-bold transition-all ${currency === "MXN" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}
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
              <label className="text-sm font-semibold text-gray-700">Etapa</label>
              <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={inputCls}>
                {allStages.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Fuente</label>
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

          <div className="flex gap-3 pt-2 border-t border-gray-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 font-semibold text-white bg-gray-900 hover:bg-black rounded-xl text-sm transition-colors disabled:opacity-50"
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Nuevo cliente</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">{error}</div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Nombre del cliente *</label>
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
              <label className="text-sm font-semibold text-gray-700">Cuota mensual *</label>
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
              <label className="text-sm font-semibold text-gray-700">Moneda</label>
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
              <label className="text-sm font-semibold text-gray-700">Día de cobro</label>
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
            <label className="text-sm font-semibold text-gray-700">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Servicio, condiciones, etc."
            />
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 font-semibold text-white bg-gray-900 hover:bg-black rounded-xl text-sm transition-colors disabled:opacity-50"
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
}: {
  client: any;
  onMarkPaid: (clientId: string, paymentId: string) => void;
  onClick: () => void;
}) {
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
    <div onClick={onClick} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold shrink-0">
              {client.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{client.name}</p>
              {client.company && (
                <p className="text-xs text-gray-500 truncate">{client.company.name}</p>
              )}
            </div>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ml-2 ${
            client.isActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-gray-100 text-gray-500 border-gray-200"
          }`}
        >
          {client.isActive ? "Activo" : "Pausado"}
        </span>
      </div>

      {/* Fee */}
      <p className="text-xl font-bold text-gray-900 mb-1">
        {fmtCurrency(client.monthlyFee, client.currency)}
        <span className="text-sm font-normal text-gray-400 ml-1">/mes</span>
      </p>
      <p className="text-xs text-gray-400 mb-4">
        {client.currency} · Día {client.billingDay} de cada mes ·{" "}
        {monthsSinceStart > 0 ? `${monthsSinceStart} mes${monthsSinceStart !== 1 ? "es" : ""} activo` : "Nuevo"}
      </p>

      {/* This month payment status */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </p>
          {isPaid ? (
            <div className="flex items-center gap-1.5 text-emerald-600">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
              <span className="text-xs font-semibold">Pagado</span>
              {currentPayment?.receivedAt && (
                <span className="text-xs text-gray-400">
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
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-900 text-white hover:bg-black transition-colors"
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
}: {
  label: string;
  value?: string;
  values?: { label: string; amount: string }[];
  sub: string;
  badge?: string;
  badgePositive?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex-1 min-w-0">
      <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">{label}</p>
      {values ? (
        <div className="flex flex-col gap-0.5 mb-1">
          {values.map((v) => (
            <div key={v.label} className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-gray-900 truncate">{v.amount}</p>
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">{v.label}</span>
            </div>
          ))}
          {badge && (
            <span className={`mt-1 self-start text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badgePositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {badge}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-baseline gap-2 mb-1">
          <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badgePositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {badge}
            </span>
          )}
        </div>
      )}
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
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

          {/* ── Page header ── */}
          <div className="px-6 pt-5 pb-0 bg-white border-b border-gray-100 shrink-0">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <HugeiconsIcon icon={KanbanIcon} size={20} color="#9ca3af" />
                <h1 className="text-xl font-bold text-gray-900">Pipeline de ventas</h1>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex gap-4 mb-5 overflow-x-auto">
              {activeTab === "pipeline" ? (
                <>
                  <StatCard
                    label="Valor del pipeline"
                    values={[
                      ...(pipelineUSD > 0 ? [{ label: "USD", amount: fmtUSD(pipelineUSD) }] : []),
                      ...(pipelineMXN > 0 ? [{ label: "MXN", amount: fmtMXN(pipelineMXN) }] : []),
                      ...((pipelineUSD === 0 && pipelineMXN === 0) ? [{ label: "USD", amount: fmtUSD(0) }] : []),
                    ]}
                    sub={`${activeDeals.length} deals activos`}
                  />
                  <StatCard
                    label="Total deals"
                    value={String(allDeals.length)}
                    sub={`${overdueDeals.length} necesitan atención`}
                    badge={overdueDeals.length > 0 ? `${overdueDeals.length} vencidos` : undefined}
                    badgePositive={false}
                  />
                  <StatCard
                    label="Ganados"
                    values={[
                      ...(wonUSD > 0 ? [{ label: "USD", amount: fmtUSD(wonUSD) }] : []),
                      ...(wonMXN > 0 ? [{ label: "MXN", amount: fmtMXN(wonMXN) }] : []),
                      ...((wonUSD === 0 && wonMXN === 0) ? [{ label: "USD", amount: fmtUSD(0) }] : []),
                    ]}
                    sub={`${wonDeals.length} deals cerrados`}
                    badge={wonDeals.length > 0 ? `+${wonDeals.length}` : undefined}
                    badgePositive={true}
                  />
                  <StatCard
                    label="En proceso"
                    value={String(activeDeals.length)}
                    sub="Deals sin cerrar"
                  />
                </>
              ) : (
                <>
                  <StatCard
                    label="Clientes activos"
                    value={String(activeClients.length)}
                    sub={`${clients.length} clientes en total`}
                  />
                  <StatCard
                    label="MRR en USD"
                    value={fmtUSD(mrrUSD)}
                    sub="Ingresos mensuales recurrentes"
                    badge={mrrUSD > 0 ? "Activo" : undefined}
                    badgePositive={true}
                  />
                  <StatCard
                    label="MRR en MXN"
                    value={fmtMXN(mrrMXN)}
                    sub="Ingresos mensuales recurrentes"
                    badge={mrrMXN > 0 ? "Activo" : undefined}
                    badgePositive={true}
                  />
                  <StatCard
                    label="Pendientes este mes"
                    value={String(pendingThisMonth)}
                    sub={`de ${activeClients.length} clientes activos`}
                    badge={pendingThisMonth > 0 ? `${pendingThisMonth} pendientes` : undefined}
                    badgePositive={false}
                  />
                </>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("pipeline")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                  activeTab === "pipeline"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                <HugeiconsIcon icon={KanbanIcon} size={15} />
                Pipeline
              </button>
              <button
                onClick={() => setActiveTab("clientes")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                  activeTab === "clientes"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                <HugeiconsIcon icon={Money02Icon} size={15} />
                Clientes
                {activeClients.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {activeClients.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ── Content ── */}
          {activeTab === "pipeline" ? (
            // ── Pipeline tab ──────────────────────────────────────────────────
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Toolbar */}
              <div className="px-6 py-3 flex items-center gap-3 shrink-0 bg-[#f5f4ef]">
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
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                    className="text-sm border border-gray-200 bg-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all"
                  >
                    {pipelines.map((p, i) => (
                      <option key={p.id} value={i}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Kanban */}
              {pipelines.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                      <HugeiconsIcon icon={KanbanIcon} size={28} color="#9ca3af" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Sin pipelines configurados</h3>
                    <p className="text-sm text-gray-500">Crea un pipeline desde configuración para comenzar.</p>
                  </div>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <div className="flex-1 overflow-x-auto overflow-y-hidden">
                    {filteredPipeline && (
                      <div className="flex gap-4 px-6 py-4 h-full items-start">
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
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loadingClients ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                </div>
              ) : clients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                    <HugeiconsIcon icon={RefreshIcon} size={28} color="#9ca3af" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Sin clientes recurrentes</h3>
                  <p className="text-sm text-gray-500 mb-4 max-w-xs">
                    Agrega tus clientes establecidos que pagan mensualmente para llevar el control de sus pagos.
                  </p>
                  <button
                    onClick={() => setShowClientModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-black transition-colors"
                  >
                    <HugeiconsIcon icon={Add01Icon} size={16} />
                    Agregar primer cliente
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {clients.map((client) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      onMarkPaid={handleMarkPaid}
                      onClick={() => setSelectedClient(client)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

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
    </div>
  );
}
