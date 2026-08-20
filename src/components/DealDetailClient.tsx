"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Edit01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Add01Icon,
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
  Calendar02Icon,
} from "@hugeicons/core-free-icons";
import DownloadProposalButton from "./DownloadProposalButton";
import DatePicker from "./DatePicker";
import { input as inputCls } from "@/src/lib/crm-ui";
import { useAi } from "@/src/hooks/useAi";

// ─── Constants ────────────────────────────────────────────────────────────────

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
  BORRADOR:  { label: "Borrador",  cls: "bg-gray-100 text-text-secondary" },
  ENVIADA:   { label: "Enviada",   cls: "bg-blue-50 text-blue-700" },
  ACEPTADA:  { label: "Aceptada",  cls: "bg-green-50 text-green-700" },
  RECHAZADA: { label: "Rechazada", cls: "bg-red-50 text-red-600" },
};

const ACTIVITY_COLORS: Record<string, string> = {
  LLAMADA: "bg-blue-100 text-blue-600",
  WHATSAPP: "bg-green-100 text-green-600",
  VISITA: "bg-amber-100 text-amber-600",
  EMAIL: "bg-purple-100 text-purple-600",
  NOTA: "bg-gray-100 text-text-secondary",
  PROPUESTA_ENVIADA: "bg-indigo-100 text-indigo-600",
  REUNION: "bg-pink-100 text-pink-600",
  OTRO: "bg-gray-100 text-text-secondary",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(value: number | null | undefined, currency = "USD") {
  if (currency === "MXN") {
    const formatted = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(value ?? 0);
    return `${formatted} MXN`;
  }
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value ?? 0);
  return `${formatted} USD`;
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
    <div className="fixed inset-0 bg-brand-obsidian/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-sm overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
            <HugeiconsIcon icon={Delete02Icon} size={22} color="#dc2626" />
          </div>
          <h3 className="text-base font-bold text-text-primary mb-1">{title}</h3>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors disabled:opacity-50"
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

  // Contact section
  const [contactSearch, setContactSearch] = useState("");
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [allContacts, setAllContacts] = useState<any[]>([]);

  const stages = deal.stage?.pipeline?.stages || [];
  const isFollowUpOverdue = deal.followUpAt && new Date(deal.followUpAt) < new Date();

  // Appointments
  const [appointmentTypes, setAppointmentTypes] = useState<any[]>([]);
  const [dealAppointments, setDealAppointments] = useState<any[]>(deal.appointments || []);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState<"type" | "date" | "slots" | "confirm">("type");
  const [selectedApptType, setSelectedApptType] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingApptTypes, setLoadingApptTypes] = useState(false);
  const [bookingGuest, setBookingGuest] = useState({ name: "", email: "", phone: "", notes: "" });
  const [savingBooking, setSavingBooking] = useState(false);
  const [cancellingApptId, setCancellingApptId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedLinkTypes, setSelectedLinkTypes] = useState<string[]>(deal.allowedBookingTypes ? deal.allowedBookingTypes.split(",") : []);
  const [savingLinkConfig, setSavingLinkConfig] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"actividad" | "propuestas" | "citas">("actividad");

  // Fetch appointment types immediately if there is a booking token
  useEffect(() => {
    if (deal.bookingToken && appointmentTypes.length === 0) {
      fetchAppointmentTypes();
    }
  }, [deal.bookingToken]);

  useEffect(() => {
    // When deal or appointment types load, sync state
    if (deal.allowedBookingTypes) {
      setSelectedLinkTypes(deal.allowedBookingTypes.split(","));
    } else if (appointmentTypes.length > 0 && selectedLinkTypes.length === 0) {
      setSelectedLinkTypes(appointmentTypes.map((t) => t.id));
    }
  }, [deal.allowedBookingTypes, appointmentTypes]);

  const { setPageContext } = useAi();
  useEffect(() => {
    setPageContext({
      page: "deal",
      id: deal.id,
      label: deal.title,
      data: {
        value: deal.value,
        currency: deal.currency,
        stage: deal.stage?.name,
        pipeline: deal.stage?.pipeline?.name,
        contact: deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName ?? ""}`.trim() : undefined,
      },
    });
    return () => setPageContext(null);
  }, [deal.id, deal.title]);

  // ─── API helpers ─────────────────────────────────────────────────────────

  async function patchDeal(body: object) {
    const res = await fetch(`/api/deals`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deal.id, ...body }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDeal((prev: any) => ({
        ...prev,
        ...updated,
        // Preserve the nested pipeline.stages relation (not returned by PATCH)
        stage: updated.stage
          ? { ...updated.stage, pipeline: prev.stage?.pipeline }
          : prev.stage,
      }));
    }
  }

  async function saveLinkConfig() {
    if (!deal) return;
    setSavingLinkConfig(true);
    try {
      const allowedBookingTypes = selectedLinkTypes.join(",");
      await patchDeal({ allowedBookingTypes });
    } catch {
      alert("Error al guardar la configuración.");
    } finally {
      setSavingLinkConfig(false);
    }
  }

  // ─── Contact search ─────────────────────────────────────────────────────

  async function fetchContacts() {
    setLoadingContacts(true);
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) setAllContacts(await res.json());
    } finally {
      setLoadingContacts(false);
    }
  }

  async function linkContact(contactId: string) {
    await patchDeal({ contactId });
    const linked = allContacts.find((c) => c.id === contactId);
    if (linked) setDeal((prev: any) => ({ ...prev, contact: linked }));
    setShowContactSearch(false);
    setContactSearch("");
  }

  async function unlinkContact() {
    await patchDeal({ contactId: null });
    setDeal((prev: any) => ({ ...prev, contact: null, contactId: null }));
  }

  // ─── Appointments ────────────────────────────────────────────────────────

  async function fetchAppointmentTypes() {
    setLoadingApptTypes(true);
    try {
      const res = await fetch("/api/appointment-types");
      if (res.ok) setAppointmentTypes(await res.json());
    } finally {
      setLoadingApptTypes(false);
    }
  }

  async function fetchSlots(apptTypeId: string, date: string) {
    setLoadingSlots(true);
    setAvailableSlots([]);
    try {
      const res = await fetch(
        `/api/public/appointment-types/${apptTypeId}/slots?date=${date}&tz=America/Mexico_City`
      );
      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data.slots || []);
      }
    } finally {
      setLoadingSlots(false);
    }
  }

  function startBooking() {
    setShowBooking(true);
    setBookingStep("type");
    setSelectedApptType(null);
    setSelectedDate("");
    setSelectedSlot("");
    setAvailableSlots([]);
    // Pre-fill guest from deal contact
    setBookingGuest({
      name: deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName || ""}`.trim() : "",
      email: deal.contact?.email || "",
      phone: deal.contact?.phone || "",
      notes: "",
    });
    if (appointmentTypes.length === 0) fetchAppointmentTypes();
  }

  function selectApptType(apptType: any) {
    setSelectedApptType(apptType);
    setBookingStep("date");
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    setBookingStep("slots");
    fetchSlots(selectedApptType.id, date);
  }

  function selectSlot(slot: string) {
    setSelectedSlot(slot);
    setBookingStep("confirm");
  }

  async function confirmBooking() {
    if (!selectedApptType || !selectedSlot || !bookingGuest.name || !bookingGuest.email) return;
    setSavingBooking(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentTypeId: selectedApptType.id,
          startTime: selectedSlot,
          guestName: bookingGuest.name,
          guestEmail: bookingGuest.email,
          guestPhone: bookingGuest.phone || null,
          notes: bookingGuest.notes || null,
        }),
      });
      if (res.ok) {
        const appt = await res.json();
        setDealAppointments((prev) => [...prev, appt].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
        setShowBooking(false);
      }
    } finally {
      setSavingBooking(false);
    }
  }

  async function cancelAppointment(apptId: string) {
    setCancellingApptId(apptId);
    try {
      const res = await fetch(`/api/deals/${deal.id}/appointments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: apptId }),
      });
      if (res.ok) {
        setDealAppointments((prev) =>
          prev.map((a) => (a.id === apptId ? { ...a, status: "CANCELLED" } : a))
        );
      }
    } finally {
      setCancellingApptId(null);
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

  // ─── Archivar ───────────────────────────────────────────────────────────

  const [archiving, setArchiving] = useState(false);
  async function toggleArchive() {
    setArchiving(true);
    await patchDeal({ isArchived: !deal.isArchived });
    setArchiving(false);
    setDeal((prev: any) => ({ ...prev, isArchived: !prev.isArchived }));
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

  // Initials avatar for the deal (from contact or deal title)
  const avatarInitials = deal.contact
    ? `${deal.contact.firstName?.[0] || ""}${deal.contact.lastName?.[0] || ""}`.toUpperCase() || "?"
    : deal.title?.[0]?.toUpperCase() || "D";

  const TAB_ITEMS = [
    { key: "actividad", label: "Actividad", count: deal.activities.length },
    { key: "propuestas", label: "Propuestas", count: deal.proposals.length },
    { key: "citas", label: "Citas", count: dealAppointments.filter((a: any) => a.status !== "CANCELLED").length },
  ] as const;

  return (
    <main className="flex-1 overflow-y-auto bg-surface-app">

      {/* ── Header ── */}
      <div className="bg-white border-b border-border-subtle">
        {/* Top bar: back + breadcrumb + actions */}
        <div className="flex items-center gap-3 px-6 pt-4 pb-3">
          <button
            onClick={() => router.push("/pipeline")}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-nav-hover transition-colors shrink-0"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </button>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary flex-1 min-w-0">
            <span className="hover:text-text-secondary cursor-pointer" onClick={() => router.push("/pipeline")}>Pipeline</span>
            <span>/</span>
            <span className="text-text-secondary truncate">{deal.stage?.pipeline?.name}</span>
          </div>
          {/* Action buttons: call + sms + whatsapp + email + delete */}
          <div className="flex items-center gap-2">
            {deal.contact?.phone && (() => {
              const rawPhone = deal.contact.phone.replace(/[\s\-().]/g, "");
              const waPhone = rawPhone.startsWith("+") ? rawPhone.slice(1) : rawPhone;
              return (
                <>
                  <a
                    href={`tel:${deal.contact.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors"
                    title="Llamar"
                  >
                    <HugeiconsIcon icon={CallIcon} size={13} />
                    Llamar
                  </a>
                  <a
                    href={`sms:${deal.contact.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors"
                    title="Enviar SMS"
                  >
                    <HugeiconsIcon icon={Message01Icon} size={13} />
                    SMS
                  </a>
                  <a
                    href={`https://wa.me/${waPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#1ebe5d] rounded-lg transition-colors"
                    title="Enviar WhatsApp"
                  >
                    <HugeiconsIcon icon={Message01Icon} size={13} />
                    WhatsApp
                  </a>
                </>
              );
            })()}
            {deal.contact?.email && (
              <a
                href={`mailto:${deal.contact.email}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors"
              >
                <HugeiconsIcon icon={Mail01Icon} size={13} />
                Email
              </a>
            )}
            {/* Archive button */}
            <button
              onClick={toggleArchive}
              disabled={archiving}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                deal.isArchived
                  ? "text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                  : "text-text-secondary bg-gray-100 hover:bg-nav-active border border-transparent"
              }`}
              title={deal.isArchived ? "Desarchivar" : "Archivar"}
            >
              {deal.isArchived ? "Desarchivar" : "Archivar"}
            </button>
            <button
              onClick={() => setShowDeleteDeal(true)}
              className="p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar deal"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
            </button>
          </div>
        </div>

        {/* Deal identity row */}
        <div className="flex items-center gap-4 px-6 pb-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-lg font-bold shrink-0 ring-2 ring-white">
            {avatarInitials}
          </div>

          {/* Title + subtitle + badges */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            {editingTitle ? (
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setEditingTitle(false); setTitleValue(deal.title); } }}
                  className="text-xl font-bold text-text-primary bg-transparent border-b-2 border-action-primary outline-none flex-1"
                  autoFocus
                />
                <button onClick={saveTitle} className="p-1 text-green-600 hover:bg-green-50 rounded-lg">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} />
                </button>
                <button onClick={() => { setEditingTitle(false); setTitleValue(deal.title); }} className="p-1 text-text-secondary hover:bg-nav-hover rounded-lg">
                  <HugeiconsIcon icon={Cancel01Icon} size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group mb-1">
                <h1 className="text-xl font-bold text-text-primary truncate">{deal.title}</h1>
                <button
                  onClick={() => setEditingTitle(true)}
                  className="p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-text-secondary rounded-lg transition-all shrink-0"
                >
                  <HugeiconsIcon icon={Edit01Icon} size={13} />
                </button>
              </div>
            )}

            {/* Subtitle: contact name + email, creation date */}
            <p className="text-xs text-text-secondary mb-2.5 truncate">
              {deal.contact
                ? `${deal.contact.firstName} ${deal.contact.lastName || ""} · ${deal.contact.email || ""}`
                : `Creado ${fmtDate(deal.createdAt)}`}
              {deal.source && ` · vía ${SOURCE_LABELS[deal.source] || deal.source}`}
            </p>

            {/* Badge row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Value editable badge */}
              {editingValue ? (
                <div className="flex items-center gap-1.5 bg-surface-sidebar border border-border-subtle rounded-full px-3 py-1">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="text-xs font-semibold text-text-secondary bg-transparent outline-none cursor-pointer"
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
                    className="w-24 text-sm font-bold text-text-primary bg-transparent outline-none"
                    autoFocus min={0} step={0.01}
                  />
                  <button onClick={saveValue} className="text-green-600 hover:bg-green-50 rounded p-0.5">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
                  </button>
                  <button onClick={() => setEditingValue(false)} className="text-text-secondary hover:bg-nav-hover rounded p-0.5">
                    <HugeiconsIcon icon={Cancel01Icon} size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingValue(true); setValueInput(String(deal.value ?? "")); setTimeout(() => valueRef.current?.select(), 50); }}
                  className="flex items-center gap-1 text-sm font-bold text-text-primary bg-gray-100 hover:bg-nav-active px-3 py-1 rounded-full transition-colors group/val"
                >
                  <HugeiconsIcon icon={DollarCircleIcon} size={13} color="#6b7280" />
                  {fmt(deal.value, deal.currency)}
                  <HugeiconsIcon icon={Edit01Icon} size={11} color="#9ca3af" className="opacity-0 group-hover/val:opacity-100 transition-opacity" />
                </button>
              )}

              {/* Stage select */}
              <div className="relative">
                <select
                  value={deal.stage?.id || ""}
                  onChange={(e) => changeStage(e.target.value)}
                  disabled={savingStage}
                  className="appearance-none pl-3 pr-6 py-1 rounded-full text-xs font-semibold border cursor-pointer focus:outline-none disabled:opacity-50 bg-white transition-all"
                  style={{ borderColor: currentStage?.color || "#e5e7eb", color: currentStage?.color || "#6b7280" }}
                >
                  {stages.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
                  <HugeiconsIcon icon={ChevronDown} size={10} color="#9ca3af" />
                </div>
              </div>

              {/* Probability badge */}
              <span className="text-xs font-semibold text-text-secondary bg-gray-100 px-3 py-1 rounded-full">
                {probability}% prob.
              </span>

              {deal.stage?.isWon && (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
                  Ganado
                </span>
              )}
              {deal.stage?.isLost && (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-600 px-2.5 py-1 rounded-full border border-red-100">
                  Perdido
                </span>
              )}
              {isFollowUpOverdue && (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full border border-amber-100">
                  Seguimiento vencido
                </span>
              )}
            </div>
          </div>
        </div>

        {deal.isArchived && (
          <div className="bg-blue-50 border-t border-b border-blue-100 px-6 py-2 flex items-center justify-between">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              <span>📁</span> Este deal se encuentra archivado y no aparece en tu tablero Kanban.
            </p>
            <button onClick={toggleArchive} disabled={archiving} className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline">
              Desarchivar
            </button>
          </div>
        )}

        {/* ── Details strip ── */}
        <div className="border-t border-border-subtle px-6 py-0 flex items-stretch overflow-x-auto divide-x divide-gray-100">

          {/* Contacto */}
          <div className="flex flex-col justify-center gap-0.5 pr-5 py-3 shrink-0 min-w-0 relative">
            <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Contacto</p>
            {deal.contact ? (
              <div className="flex items-center gap-1.5 group/ct">
                <div className="w-5 h-5 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                  {deal.contact.firstName?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-text-primary truncate max-w-[120px]">
                  {deal.contact.firstName} {deal.contact.lastName || ""}
                </span>
                <button
                  onClick={unlinkContact}
                  className="opacity-0 group-hover/ct:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all rounded"
                  title="Desvincular"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={11} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => { setShowContactSearch(!showContactSearch); if (allContacts.length === 0) fetchContacts(); }}
                  className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  <HugeiconsIcon icon={Add01Icon} size={12} />
                  Vincular
                </button>
                {showContactSearch && (
                  <div className="crm-floating-menu absolute top-full left-0 mt-1 w-64 bg-white border border-border-subtle rounded-lg z-20 p-3 flex flex-col gap-2">
                    <input
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Buscar contacto..."
                      className={`${inputCls} text-xs`}
                      autoFocus
                    />
                    <div className="max-h-36 overflow-y-auto flex flex-col gap-1">
                      {loadingContacts ? (
                        <p className="text-xs text-text-secondary text-center py-2">Cargando...</p>
                      ) : (
                        allContacts
                          .filter((c) => !contactSearch || `${c.firstName} ${c.lastName || ""}`.toLowerCase().includes(contactSearch.toLowerCase()) || c.email?.toLowerCase().includes(contactSearch.toLowerCase()))
                          .slice(0, 8)
                          .map((c) => (
                            <button key={c.id} onClick={() => linkContact(c.id)} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-nav-hover transition-colors">
                              <div className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {c.firstName?.[0]?.toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-text-primary truncate">{c.firstName} {c.lastName || ""}</p>
                                {c.email && <p className="text-[10px] text-text-secondary truncate">{c.email}</p>}
                              </div>
                            </button>
                          ))
                      )}
                      {!loadingContacts && allContacts.filter((c) => !contactSearch || `${c.firstName} ${c.lastName || ""}`.toLowerCase().includes(contactSearch.toLowerCase())).length === 0 && (
                        <p className="text-xs text-text-secondary text-center py-2">Sin resultados.</p>
                      )}
                    </div>
                    <button onClick={() => { setShowContactSearch(false); setContactSearch(""); }} className="text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors text-left">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Teléfono */}
          {deal.contact?.phone && (
            <div className="flex flex-col justify-center gap-0.5 px-5 py-3 shrink-0">
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Teléfono</p>
              <a href={`tel:${deal.contact.phone}`} className="text-sm text-text-primary hover:text-text-primary hover:underline transition-colors truncate max-w-[140px]">
                {deal.contact.phone}
              </a>
            </div>
          )}

          {/* Empresa */}
          {deal.company && (
            <div className="flex flex-col justify-center gap-0.5 px-5 py-3 shrink-0">
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Empresa</p>
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Building02Icon} size={12} color="#9ca3af" />
                <span className="text-sm text-text-primary truncate max-w-[120px]">{deal.company.name}</span>
              </div>
            </div>
          )}

          {/* Etapa */}
          <div className="flex flex-col justify-center gap-0.5 px-5 py-3 shrink-0">
            <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Etapa</p>
            <div className="relative">
              <select
                value={deal.stage?.id || ""}
                onChange={(e) => changeStage(e.target.value)}
                disabled={savingStage}
                className="appearance-none pl-2 pr-5 py-0 rounded-lg text-sm font-semibold border-0 bg-transparent cursor-pointer focus:outline-none disabled:opacity-50"
                style={{ color: currentStage?.color || "#374151" }}
              >
                {stages.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2">
                <HugeiconsIcon icon={ChevronDown} size={10} color="#9ca3af" />
              </div>
            </div>
          </div>

          {/* Seguimiento */}
          <div className="flex flex-col justify-center gap-0.5 px-5 py-3 shrink-0">
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${isFollowUpOverdue ? "text-red-500" : "text-text-secondary"}`}>
              Seguimiento{isFollowUpOverdue && " · vencido"}
            </p>
            <DatePicker value={followUpAt} onChange={setFollowUpAt} placeholder="Sin fecha" compact align="left" />
          </div>

          {/* Probabilidad */}
          <div className="flex flex-col justify-center gap-0.5 px-5 py-3 shrink-0 w-36">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Probabilidad</p>
              <span className="text-[10px] font-bold text-text-primary">{probability}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5} value={probability}
              onChange={(e) => setProbability(parseInt(e.target.value))}
              className="w-full h-1 accent-gray-900 cursor-pointer mt-1"
            />
          </div>

          {/* Origen */}
          {deal.source && (
            <div className="flex flex-col justify-center gap-0.5 px-5 py-3 shrink-0">
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Origen</p>
              <span className="text-sm text-text-primary">{SOURCE_LABELS[deal.source] || deal.source}</span>
            </div>
          )}

          {/* Motivo pérdida */}
          {deal.stage?.isLost && (
            <div className="flex flex-col justify-center gap-0.5 px-5 py-3 shrink-0 w-48">
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">Motivo pérdida</p>
              <input
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="¿Por qué se perdió?"
                className="text-sm text-text-primary bg-transparent border-0 outline-none placeholder:text-gray-300 w-full"
              />
            </div>
          )}

          {/* Save button */}
          <div className="flex items-center pl-5 py-3 ml-auto shrink-0">
            <button
              onClick={saveInfo}
              disabled={savingNotes}
              className="px-3 py-1.5 text-xs font-semibold bg-action-primary text-action-primary-foreground rounded-lg hover:bg-black disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {savingNotes ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-0 px-6 border-t border-border-subtle">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-action-primary text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? "bg-nav-active text-text-primary" : "bg-gray-100 text-text-secondary"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex gap-5 p-6 items-start max-w-6xl">

        {/* ── LEFT: Tabbed content ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* ── TAB: Actividad ── */}
          {activeTab === "actividad" && (
            <>
              {/* Add activity */}
              <div className="bg-white rounded-lg border border-border-subtle p-5">
                <p className="text-sm font-bold text-text-primary mb-3">Registrar actividad</p>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {ACTIVITY_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setActivityType(t.value)}
                      className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                        activityType === t.value
                          ? "bg-nav-active text-text-primary border-border-subtle"
                          : "text-text-secondary border-border-subtle hover:bg-nav-hover hover:text-text-primary"
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
                    className="px-4 py-2 bg-action-primary text-action-primary-foreground rounded-lg text-sm font-semibold hover:bg-black disabled:opacity-40 shrink-0 self-end transition-colors"
                  >
                    {savingActivity ? "..." : "Agregar"}
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-lg border border-border-subtle">
                <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
                  <HugeiconsIcon icon={Message01Icon} size={15} color="#9ca3af" />
                  <p className="text-sm font-bold text-text-primary">Historial</p>
                </div>
                {deal.activities.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <HugeiconsIcon icon={Message01Icon} size={18} color="#9ca3af" />
                    </div>
                    <p className="text-sm text-text-secondary">Sin actividad registrada aún.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {deal.activities.map((act: any) => {
                      const aType = ACTIVITY_TYPES.find((t) => t.value === act.type);
                      const colorCls = ACTIVITY_COLORS[act.type] || ACTIVITY_COLORS.OTRO;
                      return (
                        <div key={act.id} className="px-5 py-4 flex gap-3 group/act hover:bg-surface-sidebar/50 transition-colors">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorCls}`}>
                            {aType && <HugeiconsIcon icon={aType.icon} size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">
                                {aType?.label || act.type}
                              </span>
                              <span className="text-[11px] text-text-secondary">
                                {act.createdBy?.name || "Usuario"} · {timeAgo(act.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-text-primary leading-relaxed">{act.description}</p>
                          </div>
                          <button
                            onClick={() => setConfirmDeleteActivity(act.id)}
                            className="shrink-0 p-1.5 text-gray-300 opacity-0 group-hover/act:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── TAB: Propuestas ── */}
          {activeTab === "propuestas" && (
            <div className="bg-white rounded-lg border border-border-subtle">
              <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={FileAttachmentIcon} size={15} color="#9ca3af" />
                  <p className="text-sm font-bold text-text-primary">Propuestas</p>
                </div>
                <button
                  onClick={() => setShowProposalModal(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary px-2.5 py-1.5 bg-gray-100 hover:bg-nav-active rounded-lg transition-colors"
                >
                  <HugeiconsIcon icon={Add01Icon} size={13} />
                  Nueva propuesta
                </button>
              </div>
              {deal.proposals.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <HugeiconsIcon icon={FileAttachmentIcon} size={18} color="#9ca3af" />
                  </div>
                  <p className="text-sm text-text-secondary mb-2">Sin propuestas aún.</p>
                  <button
                    onClick={() => setShowProposalModal(true)}
                    className="text-xs font-semibold text-text-secondary hover:text-text-primary underline underline-offset-2 transition-colors"
                  >
                    Crear primera propuesta
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {deal.proposals.map((p: any) => {
                    const { label, cls } = PROPOSAL_STATUS[p.status] || PROPOSAL_STATUS.BORRADOR;
                    return (
                      <div key={p.id} className="px-5 py-4 group/prop hover:bg-surface-sidebar/50 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="text-sm font-semibold text-text-primary flex-1 leading-snug">{p.title}</p>
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
                        <p className="text-sm font-bold text-text-primary mb-1">{fmt(p.total, deal.currency)}</p>
                        {p.createdAt && <p className="text-[10px] text-text-secondary mb-2.5">{fmtDate(p.createdAt)}</p>}
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
          )}

          {/* ── TAB: Citas ── */}
          {activeTab === "citas" && (
            <div className="bg-white rounded-lg border border-border-subtle">
              <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={Calendar02Icon} size={15} color="#9ca3af" />
                  <p className="text-sm font-bold text-text-primary">Citas</p>
                </div>
                <button
                  onClick={startBooking}
                  className="flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary px-2.5 py-1.5 bg-gray-100 hover:bg-nav-active rounded-lg transition-colors"
                >
                  <HugeiconsIcon icon={Add01Icon} size={13} />
                  Agendar cita
                </button>
              </div>

              {/* Booking flow */}
              {showBooking && (
                <div className="p-5 border-b border-border-subtle">
                  {bookingStep === "type" && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-1">Tipo de cita</p>
                      {loadingApptTypes ? (
                        <div className="flex justify-center py-4">
                          <div className="w-5 h-5 border-2 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
                        </div>
                      ) : appointmentTypes.length === 0 ? (
                        <p className="text-xs text-text-secondary text-center py-3">No hay tipos de cita configurados. Créalos en Configuración → Calendario.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {appointmentTypes.map((t: any) => (
                            <button
                              key={t.id}
                              onClick={() => selectApptType(t)}
                              className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-sidebar border border-border-subtle hover:border-border-subtle transition-all"
                            >
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color || "#3545D6" }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-text-primary truncate">{t.name}</p>
                                <p className="text-[10px] text-text-secondary">{t.duration} min</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      <button onClick={() => setShowBooking(false)} className="text-[10px] font-semibold text-text-secondary hover:text-text-primary mt-2 transition-colors">
                        Cancelar
                      </button>
                    </div>
                  )}
                  {bookingStep === "date" && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedApptType?.color || "#3545D6" }} />
                        <p className="text-xs font-semibold text-text-primary">{selectedApptType?.name} · {selectedApptType?.duration} min</p>
                      </div>
                      <DatePicker label="Fecha de la cita" value={selectedDate} onChange={(d) => selectDate(d)} placeholder="Seleccionar fecha" align="right" />
                      <div className="flex gap-2">
                        <button onClick={() => setBookingStep("type")} className="text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors">← Cambiar tipo</button>
                        <button onClick={() => setShowBooking(false)} className="text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors ml-auto">Cancelar</button>
                      </div>
                    </div>
                  )}
                  {bookingStep === "slots" && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedApptType?.color || "#3545D6" }} />
                        <p className="text-xs font-semibold text-text-primary">{selectedApptType?.name}</p>
                        <span className="text-[10px] text-text-secondary">·</span>
                        <p className="text-xs text-text-secondary">{new Date(selectedDate + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" })}</p>
                      </div>
                      {loadingSlots ? (
                        <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-border-subtle border-t-gray-900 rounded-full animate-spin" /></div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-xs text-text-secondary">No hay horarios disponibles para esta fecha.</p>
                          <button onClick={() => setBookingStep("date")} className="text-xs font-semibold text-text-secondary hover:text-text-primary mt-2 underline underline-offset-2 transition-colors">Elegir otra fecha</button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
                          {availableSlots.map((slot) => (
                            <button key={slot} onClick={() => selectSlot(slot)} className="px-2 py-2 text-xs font-semibold text-text-primary bg-surface-sidebar border border-border-subtle rounded-lg hover:bg-action-primary hover:text-action-primary-foreground hover:border-action-primary transition-all">
                              {new Date(slot).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => setBookingStep("date")} className="text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors">← Cambiar fecha</button>
                        <button onClick={() => setShowBooking(false)} className="text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors ml-auto">Cancelar</button>
                      </div>
                    </div>
                  )}
                  {bookingStep === "confirm" && (
                    <div className="flex flex-col gap-3">
                      <div className="bg-surface-sidebar rounded-lg p-3 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedApptType?.color || "#3545D6" }} />
                          <p className="text-xs font-bold text-text-primary">{selectedApptType?.name}</p>
                        </div>
                        <p className="text-xs text-text-secondary ml-[18px]">
                          {new Date(selectedSlot).toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long" })}
                          {" · "}{new Date(selectedSlot).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          {" · "}{selectedApptType?.duration} min
                        </p>
                      </div>
                      <input value={bookingGuest.name} onChange={(e) => setBookingGuest((g) => ({ ...g, name: e.target.value }))} className={`${inputCls} text-xs`} placeholder="Nombre del invitado *" />
                      <input type="email" value={bookingGuest.email} onChange={(e) => setBookingGuest((g) => ({ ...g, email: e.target.value }))} className={`${inputCls} text-xs`} placeholder="Email del invitado *" />
                      <input value={bookingGuest.phone} onChange={(e) => setBookingGuest((g) => ({ ...g, phone: e.target.value }))} className={`${inputCls} text-xs`} placeholder="Teléfono (opcional)" />
                      <textarea value={bookingGuest.notes} onChange={(e) => setBookingGuest((g) => ({ ...g, notes: e.target.value }))} className={`${inputCls} text-xs resize-none`} rows={2} placeholder="Notas (opcional)" />
                      <div className="flex gap-2">
                        <button onClick={() => setBookingStep("slots")} className="flex-1 py-2 text-xs font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors">← Atrás</button>
                        <button onClick={confirmBooking} disabled={savingBooking || !bookingGuest.name || !bookingGuest.email} className="flex-1 py-2 text-xs font-semibold text-action-primary-foreground bg-action-primary hover:bg-black rounded-lg disabled:opacity-40 transition-colors">
                          {savingBooking ? "Reservando..." : "Confirmar cita"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {dealAppointments.length === 0 && !showBooking ? (
                <div className="px-5 py-12 text-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <HugeiconsIcon icon={Calendar02Icon} size={18} color="#9ca3af" />
                  </div>
                  <p className="text-sm text-text-secondary mb-2">Sin citas agendadas.</p>
                  <button onClick={startBooking} className="text-xs font-semibold text-text-secondary hover:text-text-primary underline underline-offset-2 transition-colors">
                    Agendar primera cita
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {dealAppointments.map((appt: any) => {
                    const isCancelled = appt.status === "CANCELLED";
                    const isPast = new Date(appt.endTime) < new Date();
                    const isUpcoming = !isCancelled && !isPast;
                    return (
                      <div key={appt.id} className={`px-5 py-4 flex gap-3 group/appt ${isCancelled ? "opacity-50" : "hover:bg-surface-sidebar/50"} transition-colors`}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: (appt.appointmentType?.color || "#3545D6") + "18" }}>
                          <HugeiconsIcon icon={Calendar02Icon} size={14} color={appt.appointmentType?.color || "#3545D6"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-bold text-text-primary">{appt.appointmentType?.name || "Cita"}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isCancelled ? "bg-red-50 text-red-500" : isPast ? "bg-gray-100 text-text-secondary" : "bg-emerald-50 text-emerald-700"}`}>
                              {isCancelled ? "Cancelada" : isPast ? "Pasada" : "Confirmada"}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary">
                            {new Date(appt.startTime).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" })}
                            {" · "}{new Date(appt.startTime).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            {" — "}{new Date(appt.endTime).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </p>
                          <p className="text-[10px] text-text-secondary mt-0.5 truncate">{appt.guestName} · {appt.guestEmail}</p>
                        </div>
                        {isUpcoming && (
                          <button onClick={() => cancelAppointment(appt.id)} disabled={cancellingApptId === appt.id} className="shrink-0 p-1.5 text-gray-300 opacity-0 group-hover/appt:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50">
                            <HugeiconsIcon icon={Cancel01Icon} size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Details sidebar ── */}
        <div className="w-72 shrink-0 flex flex-col gap-4">

          {/* Notes / AI summary card */}
          <div className="bg-white rounded-lg border border-border-subtle p-5">
            <div className="flex items-center gap-2 mb-3">
              <HugeiconsIcon icon={NoteIcon} size={14} color="#9ca3af" />
              <p className="text-sm font-bold text-text-primary">Notas</p>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agrega notas o un resumen sobre este deal..."
              rows={4}
              className="w-full text-sm text-text-primary bg-surface-sidebar rounded-lg border border-border-subtle p-3 resize-none focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all"
            />
          </div>

          {/* Booking link */}
          {deal.bookingToken && (
            <div className="bg-white rounded-lg border border-border-subtle p-5">
              <div className="flex items-center gap-2 mb-3">
                <HugeiconsIcon icon={Link01Icon} size={14} color="#9ca3af" />
                <p className="text-sm font-bold text-text-primary">Link de agendamiento</p>
              </div>
              <p className="text-[11px] text-text-secondary mb-3">Envía este link al lead para que agende su cita automáticamente.</p>
              {appointmentTypes.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase text-text-secondary tracking-wide mb-2">Tipos de cita permitidos</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {appointmentTypes.map((t) => {
                      const isSelected = selectedLinkTypes.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => isSelected ? setSelectedLinkTypes(selectedLinkTypes.filter(id => id !== t.id)) : setSelectedLinkTypes([...selectedLinkTypes, t.id])}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${isSelected ? "bg-nav-active text-text-primary border-border-subtle" : "bg-white text-text-secondary border-border-subtle hover:border-border-subtle hover:bg-surface-sidebar"}`}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={saveLinkConfig}
                    disabled={savingLinkConfig || (deal.allowedBookingTypes === selectedLinkTypes.join(",") || (!deal.allowedBookingTypes && selectedLinkTypes.length === appointmentTypes.length))}
                    className="w-full py-1.5 text-xs font-semibold bg-gray-100 text-text-primary rounded-lg hover:bg-nav-active disabled:opacity-50 transition-colors"
                  >
                    {savingLinkConfig ? "Guardando..." : "Guardar configuración"}
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/book/${deal.bookingToken}`}
                  className="flex-1 text-xs bg-surface-sidebar border border-border-subtle rounded-lg px-3 py-2 text-text-secondary truncate focus:outline-none"
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/book/${deal.bookingToken}`); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg shrink-0 transition-all ${copiedLink ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-action-primary text-action-primary-foreground hover:bg-black"}`}
                >
                  {copiedLink ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          )}

          {/* Delete deal (destructive, at bottom) */}
          <button
            onClick={() => setShowDeleteDeal(true)}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors"
          >
            <HugeiconsIcon icon={Delete02Icon} size={13} />
            Eliminar deal
          </button>
        </div>
      </div>

      {/* ── Proposal Modal ── */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-brand-obsidian/35 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle">
              <h2 className="text-base font-bold text-text-primary">Nueva propuesta</h2>
              <button onClick={() => setShowProposalModal(false)} className="p-1.5 text-text-secondary hover:text-text-secondary hover:bg-nav-hover rounded-lg">
                <HugeiconsIcon icon={Cancel01Icon} size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-sm font-semibold text-text-primary block mb-1.5">Título *</label>
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
                  <label className="text-sm font-semibold text-text-primary">Ítems</label>
                  <button
                    onClick={() => setProposalItems([...proposalItems, { description: "", quantity: 1, unitPrice: 0 }])}
                    className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
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
                <div className="text-right text-sm font-bold text-text-primary mt-3 pt-2 border-t border-border-subtle">
                  Total: {fmt(proposalItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0), currency)}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-text-primary block mb-1.5">Notas</label>
                <textarea
                  value={proposalNotes}
                  onChange={(e) => setProposalNotes(e.target.value)}
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Condiciones, términos, vigencia..."
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border-subtle">
              <button onClick={() => setShowProposalModal(false)} className="flex-1 py-2.5 font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={createProposal} disabled={savingProposal || !proposalTitle.trim()} className="flex-1 py-2.5 font-semibold text-action-primary-foreground bg-action-primary hover:bg-black rounded-lg text-sm disabled:opacity-50 transition-colors">
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
