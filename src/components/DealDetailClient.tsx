"use client";

import { useState, useTransition, useRef } from "react";
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
  Delete02Icon,
  Building02Icon,
  CallIcon,
  Mail01Icon,
  Location01Icon,
  NoteIcon,
  UserGroup03Icon,
  MoreHorizontalIcon,
  Link01Icon,
} from "@hugeicons/core-free-icons";
import DownloadProposalButton from "./DownloadProposalButton";
import DatePicker from "./DatePicker";

// ─── Constants ────────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm";

const ACTIVITY_TYPES = [
  { value: "LLAMADA",           label: "Llamada",          icon: CallIcon },
  { value: "WHATSAPP",          label: "WhatsApp",         icon: Message01Icon },
  { value: "VISITA",            label: "Visita",           icon: Location01Icon },
  { value: "EMAIL",             label: "Email",            icon: Mail01Icon },
  { value: "NOTA",              label: "Nota",             icon: NoteIcon },
  { value: "PROPUESTA_ENVIADA", label: "Propuesta",        icon: FileAttachmentIcon },
  { value: "REUNION",           label: "Reunión",          icon: UserGroup03Icon },
  { value: "OTRO",              label: "Otro",             icon: Link01Icon },
];

const SOURCE_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp", REFERIDO: "Referido", LINKEDIN: "LinkedIn",
  VISITA: "Visita", EMAIL_FRIO: "Email frío", FORMULARIO: "Formulario",
  INSTAGRAM: "Instagram", OTRO: "Otro",
};

const PROPOSAL_STATUS: Record<string, { label: string; cls: string }> = {
  BORRADOR:  { label: "Borrador",  cls: "bg-gray-100 text-gray-600" },
  ENVIADA:   { label: "Enviada",   cls: "bg-blue-50 text-blue-700" },
  ACEPTADA:  { label: "Aceptada",  cls: "bg-green-50 text-green-700" },
  RECHAZADA: { label: "Rechazada", cls: "bg-red-50 text-red-600" },
};

const ACTIVITY_COLORS: Record<string, string> = {
  LLAMADA: "bg-blue-100 text-blue-600",
  WHATSAPP: "bg-green-100 text-green-600",
  VISITA: "bg-amber-100 text-amber-600",
  EMAIL: "bg-purple-100 text-purple-600",
  NOTA: "bg-gray-100 text-gray-500",
  PROPUESTA_ENVIADA: "bg-indigo-100 text-indigo-600",
  REUNION: "bg-pink-100 text-pink-600",
  OTRO: "bg-gray-100 text-gray-500",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(value: number | null | undefined, currency = "USD") {
  if (!value) return currency === "MXN" ? "$0 MXN" : "$0";
  if (currency === "MXN")
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value);
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return fmtDate(d);
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────

function ConfirmModal({
  title,
  description,
  confirmLabel = "Eliminar",
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
            <HugeiconsIcon icon={Delete02Icon} size={22} color="#dc2626" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Eliminando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DealDetailClient({ deal: initialDeal }: { deal: any }) {
  const router = useRouter();
  const [deal, setDeal] = useState(initialDeal);
  const [, startTransition] = useTransition();

  // Title
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(deal.title);

  // Value
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState(String(deal.value ?? ""));
  const [currency, setCurrency] = useState(deal.currency || "USD");
  const valueRef = useRef<HTMLInputElement>(null);

  // Stage
  const [savingStage, setSavingStage] = useState(false);

  // Activity
  const [activityType, setActivityType] = useState("NOTA");
  const [activityDesc, setActivityDesc] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);
  const [deletingActivity, setDeletingActivity] = useState<string | null>(null);
  const [confirmDeleteActivity, setConfirmDeleteActivity] = useState<string | null>(null);
  const activityRef = useRef<HTMLTextAreaElement>(null);

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
  const [deletingProposal, setDeletingProposal] = useState<string | null>(null);
  const [confirmDeleteProposal, setConfirmDeleteProposal] = useState<string | null>(null);

  // Delete deal
  const [showDeleteDeal, setShowDeleteDeal] = useState(false);
  const [deletingDeal, setDeletingDeal] = useState(false);

  const stages = deal.stage?.pipeline?.stages || [];
  const isFollowUpOverdue = deal.followUpAt && new Date(deal.followUpAt) < new Date();

  // ─── API helpers ─────────────────────────────────────────────────────────

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

  // ─── Title ───────────────────────────────────────────────────────────────

  async function saveTitle() {
    if (!titleValue.trim()) return;
    await patchDeal({ title: titleValue.trim() });
    setEditingTitle(false);
  }

  // ─── Value ───────────────────────────────────────────────────────────────

  async function saveValue() {
    const val = parseFloat(valueInput) || 0;
    await patchDeal({ value: val, currency });
    setDeal((prev: any) => ({ ...prev, value: val, currency }));
    setEditingValue(false);
  }

  // ─── Stage ───────────────────────────────────────────────────────────────

  async function changeStage(stageId: string) {
    setSavingStage(true);
    await patchDeal({ stageId });
    setSavingStage(false);
    startTransition(() => router.refresh());
  }

  // ─── Notes / Info ─────────────────────────────────────────────────────────

  async function saveInfo() {
    setSavingNotes(true);
    await patchDeal({ notes, probability, followUpAt: followUpAt || null, lostReason: lostReason || null });
    setSavingNotes(false);
  }

  // ─── Activity ────────────────────────────────────────────────────────────

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

  async function deleteActivity(activityId: string) {
    setDeletingActivity(activityId);
    const res = await fetch(`/api/deals/${deal.id}/activities`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId }),
    });
    if (res.ok) {
      setDeal((prev: any) => ({
        ...prev,
        activities: prev.activities.filter((a: any) => a.id !== activityId),
      }));
    }
    setDeletingActivity(null);
    setConfirmDeleteActivity(null);
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
        proposals: prev.proposals.map((p: any) => p.id === proposalId ? { ...p, status } : p),
      }));
    }
  }

  async function deleteProposal(proposalId: string) {
    setDeletingProposal(proposalId);
    const res = await fetch(`/api/deals/${deal.id}/proposals`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId }),
    });
    if (res.ok) {
      setDeal((prev: any) => ({
        ...prev,
        proposals: prev.proposals.filter((p: any) => p.id !== proposalId),
      }));
    }
    setDeletingProposal(null);
    setConfirmDeleteProposal(null);
  }

  // ─── Delete deal ──────────────────────────────────────────────────────────

  async function deleteDeal() {
    setDeletingDeal(true);
    const res = await fetch(`/api/deals/${deal.id}`, { method: "DELETE" });
    if (res.ok) router.push("/pipeline");
    else setDeletingDeal(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const currentStage = stages.find((s: any) => s.id === deal.stage?.id) || deal.stage;

  return (
    <main className="flex-1 overflow-y-auto bg-[#f5f4ef]">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push("/pipeline")}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-1 min-w-0">
            <span className="font-medium hover:text-gray-600 cursor-pointer" onClick={() => router.push("/pipeline")}>
              Pipeline
            </span>
            <span>/</span>
            <span className="font-medium text-gray-600 truncate">{deal.stage?.pipeline?.name}</span>
          </div>

          {/* Delete deal */}
          <button
            onClick={() => setShowDeleteDeal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
          >
            <HugeiconsIcon icon={Delete02Icon} size={14} />
            Eliminar deal
          </button>
        </div>

        {/* Title row */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setEditingTitle(false); setTitleValue(deal.title); } }}
                  className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-gray-900 outline-none flex-1"
                  autoFocus
                />
                <button onClick={saveTitle} className="p-1.5 text-green-600 hover:bg-green-50 rounded-xl">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} />
                </button>
                <button onClick={() => { setEditingTitle(false); setTitleValue(deal.title); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-xl">
                  <HugeiconsIcon icon={Cancel01Icon} size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2 group mb-3">
                <h1 className="text-2xl font-bold text-gray-900 leading-snug">{deal.title}</h1>
                <button
                  onClick={() => setEditingTitle(true)}
                  className="mt-1 p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-gray-600 rounded-lg transition-all shrink-0"
                >
                  <HugeiconsIcon icon={Edit01Icon} size={15} />
                </button>
              </div>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Value */}
              {editingValue ? (
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="text-xs font-bold text-gray-500 bg-transparent outline-none cursor-pointer"
                  >
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                  </select>
                  <input
                    ref={valueRef}
                    type="number"
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveValue(); if (e.key === "Escape") setEditingValue(false); }}
                    className="w-28 text-sm font-bold text-gray-900 bg-transparent outline-none"
                    autoFocus
                    min={0}
                    step={0.01}
                  />
                  <button onClick={saveValue} className="text-green-600 hover:bg-green-50 rounded-lg p-0.5">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
                  </button>
                  <button onClick={() => setEditingValue(false)} className="text-gray-400 hover:bg-gray-100 rounded-lg p-0.5">
                    <HugeiconsIcon icon={Cancel01Icon} size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingValue(true); setValueInput(String(deal.value ?? "")); setTimeout(() => valueRef.current?.select(), 50); }}
                  className="flex items-center gap-1 text-xl font-bold text-gray-900 hover:bg-gray-100 px-2 py-1 rounded-xl transition-colors group/val"
                >
                  {fmt(deal.value, deal.currency)}
                  <HugeiconsIcon icon={Edit01Icon} size={13} color="#9ca3af" className="opacity-0 group-hover/val:opacity-100 transition-opacity" />
                </button>
              )}

              {/* Stage pill */}
              <div className="relative">
                <select
                  value={deal.stage?.id || ""}
                  onChange={(e) => changeStage(e.target.value)}
                  disabled={savingStage}
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-full text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50 bg-white transition-all"
                  style={{ borderColor: currentStage?.color || "#e5e7eb", color: currentStage?.color || "#6b7280" }}
                >
                  {stages.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                  <HugeiconsIcon icon={ChevronDown} size={11} color="#9ca3af" />
                </div>
              </div>

              {deal.source && (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                  {SOURCE_LABELS[deal.source] || deal.source}
                </span>
              )}
              {deal.stage?.isWon && (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-100">
                  Ganado
                </span>
              )}
              {deal.stage?.isLost && (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-600 px-2 py-1 rounded-full border border-red-100">
                  Perdido
                </span>
              )}

              <span className="text-xs text-gray-400 ml-1">
                Creado {fmtDate(deal.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex gap-5 p-6 items-start max-w-6xl">

        {/* ── LEFT: Activity ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Add activity */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-900 mb-3">Registrar actividad</p>

            {/* Type tabs */}
            <div className="flex gap-1.5 flex-wrap mb-3">
              {ACTIVITY_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setActivityType(t.value)}
                  className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border transition-all ${
                    activityType === t.value
                      ? "bg-gray-900 text-white border-gray-900"
                      : "text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
                  }`}
                >
                  <HugeiconsIcon icon={t.icon} size={12} />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <textarea
                ref={activityRef}
                value={activityDesc}
                onChange={(e) => setActivityDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addActivity(); }}
                placeholder="Describe la actividad... (Ctrl+Enter para agregar)"
                className={`${inputCls} resize-none flex-1`}
                rows={2}
              />
              <button
                onClick={addActivity}
                disabled={savingActivity || !activityDesc.trim()}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-40 shrink-0 self-end transition-colors"
              >
                {savingActivity ? "..." : "Agregar"}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Message01Icon} size={16} color="#9ca3af" />
                <p className="text-sm font-bold text-gray-900">
                  Actividad
                  <span className="ml-1.5 text-[11px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {deal.activities.length}
                  </span>
                </p>
              </div>
            </div>

            {deal.activities.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <HugeiconsIcon icon={Message01Icon} size={18} color="#9ca3af" />
                </div>
                <p className="text-sm text-gray-400">Sin actividad registrada aún.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {deal.activities.map((act: any) => {
                  const aType = ACTIVITY_TYPES.find((t) => t.value === act.type);
                  const colorCls = ACTIVITY_COLORS[act.type] || ACTIVITY_COLORS.OTRO;

                  return (
                    <div key={act.id} className="px-5 py-4 flex gap-3 group/act hover:bg-gray-50/50 transition-colors">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${colorCls}`}>
                        {aType && <HugeiconsIcon icon={aType.icon} size={14} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                            {aType?.label || act.type}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {act.createdBy?.name || "Usuario"} · {timeAgo(act.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed">{act.description}</p>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => setConfirmDeleteActivity(act.id)}
                        className="shrink-0 p-1.5 text-gray-300 opacity-0 group-hover/act:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Eliminar actividad"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Info + Proposals ── */}
        <div className="w-80 shrink-0 flex flex-col gap-4">

          {/* Info card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-900 mb-4">Información</p>
            <div className="flex flex-col gap-3.5">

              {/* Contact */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={User02Icon} size={13} color="#9ca3af" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Contacto</p>
                  {deal.contact ? (
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {deal.contact.firstName} {deal.contact.lastName || ""}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">—</p>
                  )}
                </div>
              </div>

              {/* Company */}
              {deal.company && (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={Building02Icon} size={13} color="#9ca3af" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Empresa</p>
                    <p className="text-xs font-semibold text-gray-900 truncate">{deal.company.name}</p>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-50 pt-3 flex flex-col gap-3">
                {/* Follow-up */}
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1.5 ${isFollowUpOverdue ? "text-red-500" : "text-gray-400"}`}>
                    Seguimiento {isFollowUpOverdue && "· VENCIDO"}
                  </p>
                  <DatePicker
                    value={followUpAt}
                    onChange={setFollowUpAt}
                    placeholder="Sin fecha"
                    compact
                    align="right"
                  />
                </div>

                {/* Probability */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Probabilidad</p>
                    <span className="text-xs font-bold text-gray-900">{probability}%</span>
                  </div>
                  <div className="relative">
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
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Motivo de pérdida</p>
                    <input
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value)}
                      placeholder="¿Por qué se perdió?"
                      className={`${inputCls} text-xs`}
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Notas</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Agrega notas sobre este deal..."
                    rows={3}
                    className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl border border-gray-200 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={saveInfo}
                disabled={savingNotes}
                className="w-full py-2 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-50 transition-colors"
              >
                {savingNotes ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>

          {/* Proposals */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={FileAttachmentIcon} size={16} color="#9ca3af" />
                <p className="text-sm font-bold text-gray-900">
                  Propuestas
                  {deal.proposals.length > 0 && (
                    <span className="ml-1.5 text-[11px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {deal.proposals.length}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setShowProposalModal(true)}
                className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 px-2 py-1.5 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <HugeiconsIcon icon={Add01Icon} size={13} />
                Nueva
              </button>
            </div>

            {deal.proposals.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-400">Sin propuestas aún.</p>
                <button
                  onClick={() => setShowProposalModal(true)}
                  className="mt-2 text-xs font-semibold text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors"
                >
                  Crear primera propuesta
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {deal.proposals.map((p: any) => {
                  const { label, cls } = PROPOSAL_STATUS[p.status] || PROPOSAL_STATUS.BORRADOR;
                  return (
                    <div key={p.id} className="px-5 py-4 group/prop hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm font-semibold text-gray-900 flex-1 leading-snug">{p.title}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
                          <button
                            onClick={() => setConfirmDeleteProposal(p.id)}
                            className="text-gray-300 opacity-0 group-hover/prop:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-lg p-0.5 transition-all"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={13} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-900 mb-2.5">{fmt(p.total, deal.currency)}</p>
                      {p.createdAt && (
                        <p className="text-[10px] text-gray-400 mb-2">{fmtDate(p.createdAt)}</p>
                      )}
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
        </div>
      </div>

      {/* ── Proposal Modal ── */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Nueva propuesta</h2>
              <button onClick={() => setShowProposalModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl">
                <HugeiconsIcon icon={Cancel01Icon} size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Título *</label>
                <input
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  className={inputCls}
                  placeholder="Propuesta de servicios"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Ítems</label>
                  <button
                    onClick={() => setProposalItems([...proposalItems, { description: "", quantity: 1, unitPrice: 0 }])}
                    className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
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
                <div className="text-right text-sm font-bold text-gray-900 mt-3 pt-2 border-t border-gray-100">
                  Total: {fmt(proposalItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0), currency)}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Notas</label>
                <textarea
                  value={proposalNotes}
                  onChange={(e) => setProposalNotes(e.target.value)}
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Condiciones, términos, vigencia..."
                />
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

      {/* ── Confirm: delete activity ── */}
      {confirmDeleteActivity && (
        <ConfirmModal
          title="Eliminar actividad"
          description="Esta acción no se puede deshacer. La actividad se eliminará permanentemente."
          onConfirm={() => deleteActivity(confirmDeleteActivity)}
          onCancel={() => setConfirmDeleteActivity(null)}
          loading={deletingActivity === confirmDeleteActivity}
        />
      )}

      {/* ── Confirm: delete proposal ── */}
      {confirmDeleteProposal && (
        <ConfirmModal
          title="Eliminar propuesta"
          description="Esta acción no se puede deshacer. La propuesta y sus ítems se eliminarán permanentemente."
          onConfirm={() => deleteProposal(confirmDeleteProposal)}
          onCancel={() => setConfirmDeleteProposal(null)}
          loading={deletingProposal === confirmDeleteProposal}
        />
      )}

      {/* ── Confirm: delete deal ── */}
      {showDeleteDeal && (
        <ConfirmModal
          title={`Eliminar "${deal.title}"`}
          description="Se eliminarán también todas las actividades y propuestas asociadas a este deal. Esta acción no se puede deshacer."
          confirmLabel="Sí, eliminar deal"
          onConfirm={deleteDeal}
          onCancel={() => setShowDeleteDeal(false)}
          loading={deletingDeal}
        />
      )}
    </main>
  );
}
