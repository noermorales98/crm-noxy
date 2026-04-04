"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Edit01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Add01Icon,
  User02Icon,
  CalendarCheckIn01Icon,
  Message01Icon,
  FileAttachmentIcon,
  DollarCircleIcon,
  ChevronDown,
} from "@hugeicons/core-free-icons";
import DownloadProposalButton from "./DownloadProposalButton";

const inputCls =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm";

const ACTIVITY_TYPES = [
  { value: "LLAMADA", label: "Llamada" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "VISITA", label: "Visita" },
  { value: "EMAIL", label: "Email" },
  { value: "NOTA", label: "Nota" },
  { value: "PROPUESTA_ENVIADA", label: "Propuesta enviada" },
  { value: "REUNION", label: "Reunión" },
  { value: "OTRO", label: "Otro" },
];

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

const PROPOSAL_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  BORRADOR: { label: "Borrador", cls: "bg-gray-100 text-gray-600" },
  ENVIADA: { label: "Enviada", cls: "bg-blue-50 text-blue-700" },
  ACEPTADA: { label: "Aceptada", cls: "bg-green-50 text-green-700" },
  RECHAZADA: { label: "Rechazada", cls: "bg-red-50 text-red-600" },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDIENTE: { label: "Pendiente", cls: "bg-amber-50 text-amber-700" },
  RECIBIDO: { label: "Recibido", cls: "bg-green-50 text-green-700" },
  CANCELADO: { label: "Cancelado", cls: "bg-gray-100 text-gray-500" },
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  ANTICIPO: "Anticipo",
  SALDO: "Saldo",
  COMPLETO: "Completo",
  MENSUALIDAD: "Mensualidad",
};

function formatCurrency(value: number | null | undefined) {
  if (!value) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value);
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const colors = ["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-pink-100 text-pink-700"];
  const idx = name.charCodeAt(0) % colors.length;
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className={`rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${colors[idx]}`}
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

export default function DealDetailClient({ deal: initialDeal }: { deal: any }) {
  const router = useRouter();
  const [deal, setDeal] = useState(initialDeal);
  const [isPending, startTransition] = useTransition();

  // Title edit
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(deal.title);

  // Stage change
  const [savingStage, setSavingStage] = useState(false);

  // Activity form
  const [activityType, setActivityType] = useState("NOTA");
  const [activityDesc, setActivityDesc] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);

  // Info panel
  const [notes, setNotes] = useState(deal.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [followUpAt, setFollowUpAt] = useState(
    deal.followUpAt ? new Date(deal.followUpAt).toISOString().slice(0, 10) : ""
  );
  const [probability, setProbability] = useState(deal.probability ?? 50);
  const [lostReason, setLostReason] = useState(deal.lostReason || "");

  // Proposal modal
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalNotes, setProposalNotes] = useState("");
  const [proposalItems, setProposalItems] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [savingProposal, setSavingProposal] = useState(false);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState("ANTICIPO");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDesc, setPaymentDesc] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  // Stripe
  const [stripeLoading, setStripeLoading] = useState<string | null>(null);

  const stages = deal.stage?.pipeline?.stages || [];
  const isFollowUpOverdue = deal.followUpAt && new Date(deal.followUpAt) < new Date();

  // ─── Patches ──────────────────────────────────────────────────────────────
  async function patchDeal(body: object) {
    const res = await fetch(`/api/deals`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deal.id, ...body }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDeal((prev: any) => ({ ...prev, ...updated }));
    }
  }

  async function saveTitle() {
    if (!titleValue.trim()) return;
    await patchDeal({ title: titleValue.trim() });
    setEditingTitle(false);
  }

  async function changeStage(stageId: string) {
    setSavingStage(true);
    await patchDeal({ stageId });
    setSavingStage(false);
    startTransition(() => router.refresh());
  }

  async function saveNotes() {
    setSavingNotes(true);
    await patchDeal({ notes, probability, followUpAt: followUpAt || null, lostReason: lostReason || null });
    setSavingNotes(false);
  }

  // ─── Activities ───────────────────────────────────────────────────────────
  async function addActivity() {
    if (!activityDesc.trim()) return;
    setSavingActivity(true);
    const res = await fetch(`/api/deals/${deal.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: activityType, description: activityDesc }),
    });
    if (res.ok) {
      const activity = await res.json();
      setDeal((prev: any) => ({ ...prev, activities: [activity, ...prev.activities] }));
      setActivityDesc("");
    }
    setSavingActivity(false);
  }

  // ─── Proposals ────────────────────────────────────────────────────────────
  async function createProposal() {
    if (!proposalTitle.trim()) return;
    setSavingProposal(true);
    const total = proposalItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const res = await fetch(`/api/deals/${deal.id}/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: proposalTitle, notes: proposalNotes, total, items: proposalItems }),
    });
    if (res.ok) {
      const proposal = await res.json();
      setDeal((prev: any) => ({ ...prev, proposals: [proposal, ...prev.proposals] }));
      setShowProposalModal(false);
      setProposalTitle("");
      setProposalNotes("");
      setProposalItems([{ description: "", quantity: 1, unitPrice: 0 }]);
    }
    setSavingProposal(false);
  }

  async function updateProposalStatus(proposalId: string, status: string) {
    const res = await fetch(`/api/deals/${deal.id}/proposals`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId, status }),
    });
    if (res.ok) {
      setDeal((prev: any) => ({
        ...prev,
        proposals: prev.proposals.map((p: any) => (p.id === proposalId ? { ...p, status } : p)),
      }));
    }
  }

  // ─── Payments ─────────────────────────────────────────────────────────────
  async function createPayment() {
    if (!paymentAmount) return;
    setSavingPayment(true);
    const res = await fetch(`/api/deals/${deal.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: paymentType, amount: parseFloat(paymentAmount), description: paymentDesc }),
    });
    if (res.ok) {
      const payment = await res.json();
      setDeal((prev: any) => ({ ...prev, payments: [payment, ...prev.payments] }));
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentDesc("");
    }
    setSavingPayment(false);
  }

  async function markPaymentReceived(paymentId: string) {
    const res = await fetch(`/api/deals/${deal.id}/payments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, status: "RECIBIDO" }),
    });
    if (res.ok) {
      setDeal((prev: any) => ({
        ...prev,
        payments: prev.payments.map((p: any) =>
          p.id === paymentId ? { ...p, status: "RECIBIDO", receivedAt: new Date().toISOString() } : p
        ),
      }));
    }
  }

  async function generateStripeLink(paymentId: string) {
    setStripeLoading(paymentId);
    const res = await fetch(`/api/deals/${deal.id}/stripe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });
    if (res.ok) {
      const data = await res.json();
      setDeal((prev: any) => ({
        ...prev,
        payments: prev.payments.map((p: any) =>
          p.id === paymentId ? { ...p, stripePaymentLinkUrl: data.url } : p
        ),
      }));
    }
    setStripeLoading(null);
  }

  const totalReceived = deal.payments
    .filter((p: any) => p.status === "RECIBIDO")
    .reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
  const totalPending = deal.payments
    .filter((p: any) => p.status === "PENDIENTE")
    .reduce((s: number, p: any) => s + (p.amount ?? 0), 0);

  return (
    <main className="flex-1 overflow-y-auto">
      {/* Deal header */}
      <div className="px-6 py-5 bg-white border-b border-gray-100 flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-0.5 p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
        </button>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                className="text-xl font-bold text-gray-900 bg-transparent border-b-2 border-gray-900 outline-none flex-1"
                autoFocus
              />
              <button onClick={saveTitle} className="p-1 text-green-600 hover:bg-green-50 rounded-lg">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} />
              </button>
              <button onClick={() => { setEditingTitle(false); setTitleValue(deal.title); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-xl font-bold text-gray-900 truncate">{deal.title}</h1>
              <button onClick={() => setEditingTitle(true)} className="p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-gray-600 rounded-lg transition-all">
                <HugeiconsIcon icon={Edit01Icon} size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(deal.value)}</p>

            {/* Stage selector */}
            <div className="relative">
              <select
                value={deal.stage?.id || ""}
                onChange={(e) => changeStage(e.target.value)}
                disabled={savingStage}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-semibold border border-gray-200 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50"
                style={{ borderColor: deal.stage?.color || "#e5e7eb", color: deal.stage?.color || "#6b7280" }}
              >
                {stages.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                <HugeiconsIcon icon={ChevronDown} size={12} color="#9ca3af" />
              </div>
            </div>

            {deal.source && (
              <span className="text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                {SOURCE_LABELS[deal.source] || deal.source}
              </span>
            )}

            {deal.stage?.isWon && (
              <span className="text-[10px] font-bold uppercase tracking-wide bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-100">
                Ganado
              </span>
            )}
            {deal.stage?.isLost && (
              <span className="text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-600 px-2 py-1 rounded-full border border-red-100">
                Perdido
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5 p-6 items-start">
        {/* LEFT: Activity timeline */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Add activity */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-900 mb-3">Registrar actividad</p>
            <div className="flex gap-2 mb-3">
              {ACTIVITY_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setActivityType(t.value)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    activityType === t.value
                      ? "bg-gray-900 text-white border-gray-900"
                      : "text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={activityDesc}
                onChange={(e) => setActivityDesc(e.target.value)}
                placeholder="Describe la actividad..."
                className={`${inputCls} resize-none`}
                rows={2}
              />
              <button
                onClick={addActivity}
                disabled={savingActivity || !activityDesc.trim()}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-50 shrink-0 self-end transition-colors"
              >
                {savingActivity ? "..." : "Agregar"}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <HugeiconsIcon icon={Message01Icon} size={16} color="#9ca3af" />
              <p className="text-sm font-bold text-gray-900">Actividad ({deal.activities.length})</p>
            </div>
            {deal.activities.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Sin actividad registrada aún.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {deal.activities.map((act: any) => (
                  <div key={act.id} className="px-5 py-4 flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-gray-500">
                      {act.createdBy?.name ? act.createdBy.name.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {ACTIVITY_TYPES.find((t) => t.value === act.type)?.label || act.type}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {act.createdBy?.name || "Usuario"} · {formatDate(act.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Info + Financials */}
        <div className="w-80 shrink-0 flex flex-col gap-4">
          {/* Info panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-900 mb-4">Información</p>
            <div className="flex flex-col gap-3">
              {/* Contact */}
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={User02Icon} size={14} color="#9ca3af" />
                <span className="text-xs text-gray-500 w-20 shrink-0">Contacto</span>
                {deal.contact ? (
                  <span className="text-xs font-semibold text-gray-900 truncate">
                    {deal.contact.firstName} {deal.contact.lastName || ""}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </div>

              {/* Follow-up */}
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={CalendarCheckIn01Icon} size={14} color={isFollowUpOverdue ? "#dc2626" : "#9ca3af"} />
                <span className="text-xs text-gray-500 w-20 shrink-0">Follow-up</span>
                <input
                  type="date"
                  value={followUpAt}
                  onChange={(e) => setFollowUpAt(e.target.value)}
                  className={`text-xs font-semibold flex-1 bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-gray-900 transition-colors ${
                    isFollowUpOverdue ? "text-red-600" : "text-gray-900"
                  }`}
                />
              </div>

              {/* Probability */}
              <div className="flex items-start gap-2">
                <HugeiconsIcon icon={DollarCircleIcon} size={14} color="#9ca3af" className="mt-1" />
                <span className="text-xs text-gray-500 w-20 shrink-0 mt-1">Prob.</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-900">{probability}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={probability}
                    onChange={(e) => setProbability(parseInt(e.target.value))}
                    className="w-full h-1.5 accent-gray-900 cursor-pointer"
                  />
                </div>
              </div>

              {/* Lost reason */}
              {deal.stage?.isLost && (
                <div className="flex items-start gap-2">
                  <HugeiconsIcon icon={Cancel01Icon} size={14} color="#9ca3af" className="mt-1 shrink-0" />
                  <span className="text-xs text-gray-500 w-20 shrink-0 mt-1">Motivo</span>
                  <input
                    value={lostReason}
                    onChange={(e) => setLostReason(e.target.value)}
                    placeholder="Motivo de pérdida..."
                    className="text-xs flex-1 bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-gray-900 transition-colors text-gray-900"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Notas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agrega notas sobre este deal..."
                  rows={3}
                  className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl border border-gray-200 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all"
                />
              </div>

              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="w-full py-2 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-50 transition-colors"
              >
                {savingNotes ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>

          {/* Proposals */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={FileAttachmentIcon} size={16} color="#9ca3af" />
                <p className="text-sm font-bold text-gray-900">Propuestas</p>
              </div>
              <button
                onClick={() => setShowProposalModal(true)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <HugeiconsIcon icon={Add01Icon} size={14} />
              </button>
            </div>
            {deal.proposals.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-gray-400">Sin propuestas.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {deal.proposals.map((p: any) => {
                  const { label, cls } = PROPOSAL_STATUS_LABELS[p.status] || PROPOSAL_STATUS_LABELS.BORRADOR;
                  return (
                    <div key={p.id} className="px-5 py-3.5">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm font-semibold text-gray-900 flex-1 leading-snug">{p.title}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{label}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 mb-2">{formatCurrency(p.total)}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        <DownloadProposalButton proposal={p} dealTitle={deal.title} />
                        {p.status === "BORRADOR" && (
                          <button
                            onClick={() => updateProposalStatus(p.id, "ENVIADA")}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            Marcar enviada
                          </button>
                        )}
                        {p.status === "ENVIADA" && (
                          <>
                            <button onClick={() => updateProposalStatus(p.id, "ACEPTADA")} className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-green-200 text-green-700 hover:bg-green-50 transition-colors">
                              Aceptada
                            </button>
                            <button onClick={() => updateProposalStatus(p.id, "RECHAZADA")} className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                              Rechazada
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payments */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={DollarCircleIcon} size={16} color="#9ca3af" />
                <p className="text-sm font-bold text-gray-900">Pagos</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <HugeiconsIcon icon={Add01Icon} size={14} />
              </button>
            </div>

            {/* Totals */}
            {(totalReceived > 0 || totalPending > 0) && (
              <div className="px-5 py-3 border-b border-gray-50 flex gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Recibido</p>
                  <p className="text-sm font-bold text-green-700">{formatCurrency(totalReceived)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Pendiente</p>
                  <p className="text-sm font-bold text-amber-700">{formatCurrency(totalPending)}</p>
                </div>
              </div>
            )}

            {deal.payments.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-gray-400">Sin pagos registrados.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {deal.payments.map((p: any) => {
                  const { label, cls } = PAYMENT_STATUS_LABELS[p.status] || PAYMENT_STATUS_LABELS.PENDIENTE;
                  return (
                    <div key={p.id} className="px-5 py-3.5">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="text-xs font-semibold text-gray-500">{PAYMENT_TYPE_LABELS[p.type] || p.type}</p>
                          {p.description && <p className="text-xs text-gray-400">{p.description}</p>}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{label}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 mb-2">{formatCurrency(p.amount)}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {p.status === "PENDIENTE" && (
                          <button
                            onClick={() => markPaymentReceived(p.id)}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                          >
                            Marcar recibido
                          </button>
                        )}
                        {p.stripePaymentLinkUrl ? (
                          <a
                            href={p.stripePaymentLinkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors"
                          >
                            Ver link Stripe
                          </a>
                        ) : (
                          p.status === "PENDIENTE" && (
                            <button
                              onClick={() => generateStripeLink(p.id)}
                              disabled={stripeLoading === p.id}
                              className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                              {stripeLoading === p.id ? "..." : "Crear link Stripe"}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proposal Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Nueva propuesta</h2>
              <button onClick={() => setShowProposalModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Título *</label>
                <input value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} className={inputCls} placeholder="Propuesta de servicios" />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Ítems</label>
                  <button
                    onClick={() => setProposalItems([...proposalItems, { description: "", quantity: 1, unitPrice: 0 }])}
                    className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"
                  >
                    <HugeiconsIcon icon={Add01Icon} size={12} /> Agregar ítem
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {proposalItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        value={item.description}
                        onChange={(e) => { const it = [...proposalItems]; it[i].description = e.target.value; setProposalItems(it); }}
                        className={`${inputCls} col-span-6`}
                        placeholder="Descripción"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => { const it = [...proposalItems]; it[i].quantity = parseInt(e.target.value) || 1; setProposalItems(it); }}
                        className={`${inputCls} col-span-2`}
                        placeholder="Cant."
                        min={1}
                      />
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => { const it = [...proposalItems]; it[i].unitPrice = parseFloat(e.target.value) || 0; setProposalItems(it); }}
                        className={`${inputCls} col-span-3`}
                        placeholder="Precio"
                        min={0}
                      />
                      <button
                        onClick={() => setProposalItems(proposalItems.filter((_, j) => j !== i))}
                        className="col-span-1 text-gray-300 hover:text-red-500 transition-colors flex justify-center"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="text-right text-sm font-bold text-gray-900 mt-2">
                  Total: {formatCurrency(proposalItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Notas</label>
                <textarea value={proposalNotes} onChange={(e) => setProposalNotes(e.target.value)} className={`${inputCls} resize-none`} rows={2} placeholder="Condiciones, términos..." />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowProposalModal(false)} className="flex-1 py-2.5 font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={createProposal} disabled={savingProposal || !proposalTitle.trim()} className="flex-1 py-2.5 font-semibold text-white bg-gray-900 hover:bg-black rounded-xl text-sm disabled:opacity-50 transition-colors">
                {savingProposal ? "Creando..." : "Crear propuesta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Nuevo pago</h2>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">Tipo</label>
                  <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className={inputCls}>
                    {Object.entries(PAYMENT_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">Monto *</label>
                  <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className={inputCls} placeholder="0" min="0" step="0.01" />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Descripción</label>
                <input value={paymentDesc} onChange={(e) => setPaymentDesc(e.target.value)} className={inputCls} placeholder="Ej. 50% anticipo" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2.5 font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={createPayment} disabled={savingPayment || !paymentAmount} className="flex-1 py-2.5 font-semibold text-white bg-gray-900 hover:bg-black rounded-xl text-sm disabled:opacity-50 transition-colors">
                {savingPayment ? "Creando..." : "Crear pago"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
