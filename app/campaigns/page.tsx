"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, SentIcon, Clock01Icon, CheckmarkCircle01Icon, Cancel01Icon, Refresh01Icon, Delete01Icon, ViewIcon, CodeIcon, Briefcase01Icon, Note01Icon, RepeatIcon, Building04Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import { DataTable, EmptyState, Enter, ErrorState, PageHeader, Skeleton, useDialog, type DataColumn } from "@/src/components/ui";

const primaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary disabled:opacity-50 lg:min-h-10";
const secondaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface-elevated px-4 text-sm font-semibold text-text-primary hover:bg-surface-sidebar disabled:opacity-50 lg:min-h-10";
const iconAction =
  "crm-press flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-surface-sidebar hover:text-text-primary lg:size-9";
const shortDateTime = (iso: string) => new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

type Campaign = {
  id: string;
  subject: string;
  body: string;
  status: "DRAFT" | "SENDING" | "COMPLETED";
  sentAt: string | null;
  createdAt: string;
  companyId: string;
  scheduledAt: string | null;
  nextScheduledAt?: string | null;
  steps?: { order: number; delayDays: number; subject: string }[];
  company: { name: string };
  project?: { name: string };
  targetForm?: { name: string };
  _count: { logs: number };
  logsByStatus?: Record<string, number>;
};

function formatDispatchToast(data: {
  successful?: number;
  failed?: number;
  pending?: number;
  processed?: number;
  message?: string;
}) {
  const successful = data.successful ?? 0;
  const failed = data.failed ?? 0;
  const pending = data.pending ?? 0;
  if ((data.processed ?? 0) === 0 && successful === 0 && failed === 0) {
    return pending > 0
      ? `No hay correos vencidos por enviar. Quedan ${pending} en cola.`
      : "No hay correos pendientes en la cola.";
  }
  return `Se enviaron ${successful}. Fallaron ${failed}. Quedan ${pending} en cola.`;
}

type StepDraft = { delayDays: string; subject: string; body: string };

export default function CampaignsPage() {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState, sortField, sortOrder, activeFilters } = useHeader();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [companies, setCompanies] = useState<any[]>([]);
  const [targetType, setTargetType] = useState<"ALL" | "PROJECT" | "FORM">("ALL");
  const [projectId, setProjectId] = useState("");
  const [targetFormId, setTargetFormId] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const previewDialogRef = useRef<HTMLDivElement>(null);
  const createDialogRef = useRef<HTMLDivElement>(null);
  useDialog(previewDialogRef, Boolean(previewCampaign), () => setPreviewCampaign(null));
  // resetForm se declara más abajo; el cierre solo se ejecuta después del render.
  useDialog(createDialogRef, isModalOpen, () => { setIsModalOpen(false); resetForm(); });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([]);

  useEffect(() => {
    resetState();
  }, []);

  useEffect(() => {
    setConfig({
      title: "Email Marketing",
      titleBadge: isLoading ? undefined : campaigns.length,
      sortOptions: [
        { label: "Asunto", value: "subject" },
        { label: "Fecha de creación", value: "createdAt" },
        { label: "Estado", value: "status" },
        { label: "Destinatarios", value: "recipients" },
      ],
      filterGroups: [
        {
          key: "status",
          label: "Estado",
          options: [
            { label: "Borrador", value: "DRAFT" },
            { label: "Enviando", value: "SENDING" },
            { label: "Completada", value: "COMPLETED" },
          ],
        },
      ],
      pageHeader: true,
    });
    return () => setConfig({});
  }, [isLoading, campaigns.length]);

  useEffect(() => {
    fetchCampaigns();
    fetchCompanies();
    fetchProjects();
    fetchForms();
  }, []);

  const fetchCompanies = async () => { try { const res = await fetch("/api/companies"); if (res.ok) setCompanies(await res.json()); } catch (e) { console.error(e); } };
  const fetchProjects = async () => { try { const res = await fetch("/api/projects"); if (res.ok) setProjects(await res.json()); } catch (e) {} };
  const fetchForms = async () => { try { const res = await fetch("/api/forms"); if (res.ok) setForms(await res.json()); } catch (e) {} };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        setCampaigns(await res.json());
        setLoadError(false);
      } else setLoadError(true);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const displayed = useMemo(() => {
    let result = [...campaigns];

    if (activeFilters.status) {
      result = result.filter(c => c.status === activeFilters.status);
    }

    if (sortField) {
      result.sort((a, b) => {
        let aVal: any, bVal: any;
        if (sortField === "subject") { aVal = a.subject?.toLowerCase() || ""; bVal = b.subject?.toLowerCase() || ""; }
        else if (sortField === "createdAt") { aVal = a.createdAt || ""; bVal = b.createdAt || ""; }
        else if (sortField === "status") { aVal = a.status || ""; bVal = b.status || ""; }
        else if (sortField === "recipients") { aVal = a._count.logs; bVal = b._count.logs; }
        else { aVal = ""; bVal = ""; }
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [campaigns, sortField, sortOrder, activeFilters]);

  const handleDelete = async (campaign: Campaign) => {
    const isConfirmed = await confirm({ title: "Eliminar campaña", description: `¿Estás seguro de que quieres eliminar la campaña '${campaign.subject}'? Todo el historial de envíos asociado se perderá.`, confirmText: "Eliminar", cancelText: "Cancelar", variant: "danger" });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
      if (res.ok) { setCampaigns(prev => prev.filter(c => c.id !== campaign.id)); addToast("Campaña eliminada exitosamente.", "success"); }
      else { const err = await res.json(); addToast(err.error || "Error al eliminar la campaña.", "error"); }
    } catch (e) { addToast("Error de conexión al eliminar.", "error"); }
  };

  const resetForm = () => {
    setSubject(""); setHtmlBody(""); setTargetType("ALL"); setProjectId(""); setTargetFormId("");
    setIsPreviewMode(false); setScheduledAt(""); setSteps([]); setErrorMsg(null);
  };

  const addStep = () => {
    setSteps(prev => (prev.length >= 10 ? prev : [...prev, { delayDays: "1", subject: "", body: "" }]));
  };
  const updateStep = (index: number, patch: Partial<StepDraft>) => {
    setSteps(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };
  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateDraft = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true); setErrorMsg(null);
    try {
      const invalidStep = steps.findIndex(s => !s.subject.trim() || !s.body.trim());
      if (invalidStep >= 0) throw new Error(`El mensaje ${invalidStep + 2} de la secuencia necesita asunto y cuerpo.`);
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body: htmlBody,
          companyId,
          projectId: targetType === "PROJECT" ? projectId : null,
          targetFormId: targetType === "FORM" ? targetFormId : null,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          steps: steps.map(s => ({
            delayDays: parseInt(s.delayDays, 10) || 0,
            subject: s.subject.trim(),
            body: s.body,
          })),
        }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "No se pudo crear el borrador"); }
      resetForm(); setIsModalOpen(false);
      fetchCampaigns();
    } catch (err: any) { setErrorMsg(err.message); }
    finally { setIsSubmitting(false); }
  };

  const handleSendCampaign = async (campaignId: string) => {
    const ok = await confirm({
      title: "Enviar campaña",
      description: "¿Enviar esta campaña a todos tus contactos?",
      confirmText: "Enviar",
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/campaigns/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId }) });
      if (!res.ok) { const data = await res.json(); addToast(data.error || "No se pudo programar la campaña", "error"); return; }
      const result = await res.json();
      addToast(
        `Se enviaron ${result.successful ?? 0}. Fallaron ${result.failed ?? 0}. Quedan ${result.pending ?? 0} en cola.`,
        result.failed > 0 && result.successful === 0 ? "error" : "success"
      );
      fetchCampaigns();
    } catch (error) { addToast("Ocurrió un error inesperado.", "error"); }
  };

  const handleProcessQueue = async () => {
    setIsProcessingQueue(true);
    try {
      const res = await fetch("/api/cron/process-emails");
      const data = await res.json();
      if (res.ok) {
        addToast(
          formatDispatchToast(data),
          data.failed > 0 && data.successful === 0 ? "error" : "success"
        );
        fetchCampaigns();
      } else {
        addToast(
          data.error === "Unauthorized"
            ? "No autorizado para procesar la cola."
            : (data.error || "No se pudo procesar la cola."),
          "error"
        );
      }
    } catch (error) { addToast("Error al contactar el despachador de la cola.", "error"); }
    finally { setIsProcessingQueue(false); }
  };

  const sentCount = (c: Campaign) => c.logsByStatus?.SENT ?? c._count.logs;

  // Funciones de render (no componentes): así React no remonta las filas en cada render.
  const statusBadge = (camp: Campaign) => (
    <span className="flex flex-col items-start gap-1">
      {camp.status === "DRAFT" && <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-surface-sidebar px-2.5 text-xs font-semibold text-text-secondary"><HugeiconsIcon icon={Clock01Icon} size={12} /> Borrador</span>}
      {camp.status === "SENDING" && <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-nav-hover px-2.5 text-xs font-semibold text-action-primary"><HugeiconsIcon icon={SentIcon} size={12} /> Enviando</span>}
      {camp.status === "COMPLETED" && <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-success-soft px-2.5 text-xs font-semibold text-success"><HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} /> Completada</span>}
      {camp.status === "SENDING" && (
        <span className="text-xs text-text-secondary">
          {camp.logsByStatus?.PENDING ?? 0} pendientes · {camp.logsByStatus?.SENT ?? 0} enviados · {camp.logsByStatus?.FAILED ?? 0} fallidos
        </span>
      )}
    </span>
  );

  const target = (camp: Campaign) => (
    <span className="flex flex-col gap-0.5 text-xs">
      <span className="text-sm font-semibold text-text-primary">{camp.company?.name || "Sin empresa"}</span>
      {camp.project ? (
        <span className="flex items-center gap-1 font-medium text-action-primary"><HugeiconsIcon icon={Briefcase01Icon} size={12} /> {camp.project.name}</span>
      ) : camp.targetForm ? (
        <span className="flex items-center gap-1 font-medium text-purple-700"><HugeiconsIcon icon={Note01Icon} size={12} /> {camp.targetForm.name}</span>
      ) : (
        <span className="flex items-center gap-1 text-text-secondary"><HugeiconsIcon icon={Building04Icon} size={12} /> Toda la empresa</span>
      )}
      {camp.steps && camp.steps.length > 0 && (
        <span className="flex items-center gap-1 font-medium text-text-secondary"><HugeiconsIcon icon={RepeatIcon} size={12} /> {camp.steps.length + 1} mensajes</span>
      )}
      {camp.status === "DRAFT" && camp.scheduledAt && new Date(camp.scheduledAt).getTime() > Date.now() && (
        <span className="flex items-center gap-1 font-medium text-amber-800"><HugeiconsIcon icon={Clock01Icon} size={12} /> Inicia: {shortDateTime(camp.scheduledAt)}</span>
      )}
      {camp.status === "SENDING" && camp.nextScheduledAt && (
        <span className="flex items-center gap-1 font-medium text-action-primary"><HugeiconsIcon icon={Clock01Icon} size={12} /> Próximo envío: {shortDateTime(camp.nextScheduledAt)}</span>
      )}
    </span>
  );

  const actions = (camp: Campaign) => (
    <span className="flex items-center justify-end gap-1">
      {camp.status === "DRAFT" ? (
        <button type="button" onClick={() => handleSendCampaign(camp.id)} className={primaryAction}>Enviar</button>
      ) : (
        <span className="rounded-full bg-surface-sidebar px-2.5 py-0.5 text-xs font-semibold text-text-secondary">Bloqueado</span>
      )}
      <button type="button" onClick={() => setPreviewCampaign(camp)} className={iconAction} aria-label={`Previsualizar ${camp.subject}`} title="Previsualizar">
        <HugeiconsIcon icon={ViewIcon} size={16} />
      </button>
      <button type="button" onClick={() => handleDelete(camp)} className={`${iconAction} hover:bg-danger-soft hover:text-danger`} aria-label={`Eliminar ${camp.subject}`} title="Eliminar">
        <HugeiconsIcon icon={Delete01Icon} size={16} />
      </button>
    </span>
  );

  const columns: DataColumn<Campaign>[] = [
    { key: "subject", header: "Asunto", render: (c) => <span className="block max-w-[260px] truncate font-semibold text-text-primary">{c.subject}</span> },
    { key: "target", header: "Empresa / destino", render: (c) => target(c) },
    { key: "status", header: "Estado", render: (c) => statusBadge(c) },
    { key: "sent", header: "Enviados", align: "right", render: (c) => <span className="text-text-secondary">{sentCount(c) > 0 ? sentCount(c).toLocaleString("es-MX") : "0"}</span> },
    { key: "created", header: "Creado", render: (c) => <span className="text-text-secondary">{new Date(c.createdAt).toLocaleDateString("es-MX")}</span> },
    { key: "actions", header: "Acciones", align: "right", render: (c) => actions(c) },
  ];

  return (
    <>
      <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        <Enter index={0}>
          <PageHeader
            title="Email Marketing"
            subtitle="Crea y gestiona campañas de correo para tus contactos."
            actions={
              <>
                <button type="button" onClick={handleProcessQueue} disabled={isProcessingQueue} className={secondaryAction}>
                  <HugeiconsIcon icon={Refresh01Icon} size={16} className={isProcessingQueue ? "motion-safe:animate-spin" : ""} />
                  {isProcessingQueue ? "Procesando..." : "Procesar cola"}
                </button>
                <button type="button" onClick={() => setIsModalOpen(true)} className={primaryAction}>
                  <HugeiconsIcon icon={Add01Icon} size={16} />
                  Nueva campaña
                </button>
              </>
            }
          />
        </Enter>

        <Enter index={1}>
          <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
            {isLoading ? (
              <Skeleton shape="rows" count={4} label="Cargando campañas" />
            ) : loadError && campaigns.length === 0 ? (
              <ErrorState title="No se pudieron cargar las campañas" onRetry={() => { setIsLoading(true); fetchCampaigns(); }} />
            ) : (
              <DataTable
                label="Campañas"
                columns={columns}
                rows={displayed}
                getKey={(c) => c.id}
                mobileRow={(c) => (
                  <div className="flex w-full min-w-0 flex-col gap-2 py-1">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 truncate font-semibold text-text-primary">{c.subject}</span>
                      <span className="shrink-0 text-xs text-text-secondary">{new Date(c.createdAt).toLocaleDateString("es-MX")}</span>
                    </div>
                    {target(c)}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {statusBadge(c)}
                      {actions(c)}
                    </div>
                  </div>
                )}
                empty={
                  activeFilters.status ? (
                    <EmptyState title="No se encontraron campañas" body="Prueba con otro filtro de estado." />
                  ) : (
                    <EmptyState
                      title="Todavía no hay campañas"
                      body="Empieza creando el borrador de tu primer correo."
                      action={
                        <button type="button" onClick={() => setIsModalOpen(true)} className={primaryAction}>
                          <HugeiconsIcon icon={Add01Icon} size={16} />
                          Nueva campaña
                        </button>
                      }
                    />
                  )
                }
              />
            )}
          </section>
        </Enter>
      </main>

      {/* PREVIEW MODAL */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4">
          <div ref={previewDialogRef} role="dialog" aria-modal="true" aria-labelledby="campaign-preview-title" className="bg-surface-elevated rounded-surface w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
            <div className="p-5 border-b border-line flex items-start justify-between shrink-0">
              <div className="flex flex-col gap-1">
                <h3 id="campaign-preview-title" className="text-base font-semibold text-text-primary flex items-center gap-2"><HugeiconsIcon icon={ViewIcon} size={16} className="text-text-secondary" />Previsualización del correo</h3>
                <p className="text-sm text-text-secondary"><span className="font-medium text-text-primary">Asunto:</span> {previewCampaign.subject}</p>
                <p className="text-xs text-text-secondary">{previewCampaign.company?.name}{previewCampaign.project ? ` · Proyecto: ${previewCampaign.project.name}` : previewCampaign.targetForm ? ` · Formulario: ${previewCampaign.targetForm.name}` : " · Toda la empresa"}</p>
              </div>
              <button type="button" onClick={() => setPreviewCampaign(null)} aria-label="Cerrar" className={iconAction}><HugeiconsIcon icon={Cancel01Icon} size={20} /></button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              {/* Blanco literal a propósito: el HTML del correo asume fondo blanco. */}
              <div className="w-full h-full rounded-lg border border-line overflow-hidden bg-[#ffffff]" style={{ minHeight: "420px" }}>
                {previewCampaign.body?.trim() ? (
                  <iframe srcDoc={previewCampaign.body} sandbox="allow-same-origin" className="w-full border-0" style={{ height: "420px" }} title="Previsualización del correo" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-text-secondary gap-2"><HugeiconsIcon icon={ViewIcon} size={32} className="opacity-30" /><span className="text-sm">Esta campaña no tiene cuerpo HTML</span></div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-line flex justify-end shrink-0 bg-surface-sidebar/50">
              <button type="button" onClick={() => setPreviewCampaign(null)} className={secondaryAction}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4">
          <div ref={createDialogRef} role="dialog" aria-modal="true" aria-labelledby="campaign-create-title" className="bg-surface-elevated rounded-surface w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
            <div className="p-6 border-b border-line flex items-center justify-between shrink-0">
              <h3 id="campaign-create-title" className="text-lg font-semibold text-text-primary">Crear campaña de correo</h3>
              <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} aria-label="Cerrar" className={iconAction}><HugeiconsIcon icon={Cancel01Icon} size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="createCampaignForm" onSubmit={handleCreateDraft} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="cmp-field-1" className="text-sm font-semibold text-text-primary">Empresa (Identidad del remitente)</label>
                  <select id="cmp-field-1" required value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full min-h-11 px-4 py-2.5 rounded-control border border-line bg-surface-sidebar focus:bg-surface-elevated focus:outline-none focus:ring-1 focus:ring-focus/40 transition-all text-sm">
                    <option value="" disabled>Seleccionar empresa</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <p className="text-xs text-text-secondary">La campaña usará la configuración de correo (SMTP) de esta empresa.</p>
                </div>
                {companyId && (
                  <div className="flex flex-col gap-2 p-3 border border-line rounded-lg bg-surface-sidebar/50">
                    <label className="text-sm font-semibold text-text-primary">Destinatarios:</label>
                    <div className="flex flex-col gap-3">
                      <label data-check-ignore-tap className="flex min-h-11 items-center gap-2 cursor-pointer lg:min-h-9">
                        <input type="radio" name="targetType" checked={targetType === "ALL"} onChange={() => setTargetType("ALL")} className="size-4 accent-action-primary border-line focus:ring-action-primary" />
                        <span className="text-sm font-medium text-text-primary">Toda la empresa</span>
                      </label>
                      <label data-check-ignore-tap className="flex min-h-11 items-center gap-2 cursor-pointer lg:min-h-9">
                        <input type="radio" name="targetType" checked={targetType === "PROJECT"} onChange={() => setTargetType("PROJECT")} className="size-4 accent-action-primary border-line focus:ring-action-primary" />
                        <span className="text-sm font-medium text-text-primary">Un proyecto específico</span>
                      </label>
                      {targetType === "PROJECT" && (
                        <select required value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full min-h-11 px-3 py-2 ml-6 rounded-control border border-line bg-surface-elevated text-sm">
                          <option value="" disabled>Seleccionar Proyecto</option>
                          {projects.filter(p => p.organizationId === companies.find((c: any) => c.id === companyId)?.organizationId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      )}
                      <label data-check-ignore-tap className="flex min-h-11 items-center gap-2 cursor-pointer lg:min-h-9">
                        <input type="radio" name="targetType" checked={targetType === "FORM"} onChange={() => setTargetType("FORM")} className="size-4 accent-action-primary border-line focus:ring-action-primary" />
                        <span className="text-sm font-medium text-text-primary">Un formulario específico</span>
                      </label>
                      {targetType === "FORM" && (
                        <select required value={targetFormId} onChange={(e) => setTargetFormId(e.target.value)} className="w-full min-h-11 px-3 py-2 ml-6 rounded-control border border-line bg-surface-elevated text-sm">
                          <option value="" disabled>Seleccionar Formulario</option>
                          {forms.filter((f: any) => f.companyId === companyId).map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label htmlFor="cmp-field-2" className="text-sm font-semibold text-text-primary">Programar inicio (opcional)</label>
                  <input id="cmp-field-2" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full min-h-11 px-4 py-2.5 rounded-control border border-line bg-surface-sidebar focus:bg-surface-elevated focus:outline-none focus:ring-1 focus:ring-focus/40 transition-all text-sm" />
                  <p className="text-xs text-text-secondary">Vacío = se envía al procesar la cola.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-text-primary">Asunto</label>
                    <span className="text-xs font-semibold text-text-secondary">Mensaje 1: al inicio</span>
                  </div>
                  <input type="text" required placeholder="Ej. ¡Noticias de nuestro equipo!" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full min-h-11 px-4 py-2.5 rounded-control border border-line bg-surface-sidebar focus:bg-surface-elevated focus:outline-none focus:ring-1 focus:ring-focus/40 transition-all text-sm" />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-text-primary">Cuerpo del correo (HTML soportado)</label>
                    <div className="flex items-center gap-1 bg-surface-sidebar p-1 rounded-lg">
                      <button type="button" onClick={() => setIsPreviewMode(false)} className={`flex min-h-11 items-center gap-1.5 px-3 rounded-control text-sm font-medium transition-colors lg:min-h-8 ${!isPreviewMode ? "bg-surface-elevated text-text-primary" : "text-text-secondary hover:text-text-primary"}`}><HugeiconsIcon icon={CodeIcon} size={13} />Código</button>
                      <button type="button" onClick={() => setIsPreviewMode(true)} className={`flex min-h-11 items-center gap-1.5 px-3 rounded-control text-sm font-medium transition-colors lg:min-h-8 ${isPreviewMode ? "bg-surface-elevated text-text-primary" : "text-text-secondary hover:text-text-primary"}`}><HugeiconsIcon icon={ViewIcon} size={13} />Previsualizar</button>
                    </div>
                  </div>
                  {!isPreviewMode ? (
                    <textarea required placeholder="<p>Hola! Queríamos contactarte...</p>" rows={10} value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-line bg-surface-sidebar focus:bg-surface-elevated focus:outline-none focus:ring-1 focus:ring-focus/40 transition-all text-sm resize-y font-mono" />
                  ) : (
                    <div className="w-full rounded-lg border border-line overflow-hidden bg-[#ffffff]" style={{ minHeight: "260px" }}>
                      {htmlBody.trim() ? (
                        <iframe srcDoc={htmlBody} sandbox="allow-same-origin" className="w-full border-0" style={{ minHeight: "260px", height: "260px" }} title="Previsualización del correo" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-16 text-text-secondary gap-2"><HugeiconsIcon icon={ViewIcon} size={28} className="opacity-40" /><span className="text-sm">Escribe HTML en el editor para previsualizar</span></div>
                      )}
                    </div>
                  )}
                </div>
                {/* ── Secuencia de mensajes (seguimientos automáticos) ── */}
                <div className="flex flex-col gap-3 border-t border-line pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-semibold text-text-primary">Secuencia de mensajes</label>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Mensajes de seguimiento automáticos después del primero. Máximo 10.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addStep}
                      disabled={steps.length >= 10}
                      className="shrink-0 min-h-11 px-3 rounded-control text-sm font-semibold text-action-primary bg-nav-hover hover:bg-nav-active transition-colors disabled:opacity-40 lg:min-h-8"
                    >
                      + Agregar seguimiento
                    </button>
                  </div>
                  {steps.map((step, i) => (
                    <div key={i} className="flex flex-col gap-2.5 p-3.5 border border-line rounded-lg bg-surface-sidebar/40">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-text-primary">
                          Mensaje {i + 2}: {step.delayDays || "0"} {parseInt(step.delayDays, 10) === 1 ? "día" : "días"} después
                        </p>
                        <button
                          type="button"
                          onClick={() => removeStep(i)}
                          className="flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-danger-soft hover:text-danger lg:size-8"
                          title="Quitar mensaje"
                          aria-label={`Quitar mensaje ${i + 2}`}
                        >
                          <HugeiconsIcon icon={Delete01Icon} size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label htmlFor="cmp-field-3" className="text-xs font-medium text-text-secondary shrink-0">Días después del anterior</label>
                        <input id="cmp-field-3"
                          type="number" min="0" max="365" step="1"
                          value={step.delayDays}
                          onChange={(e) => updateStep(i, { delayDays: e.target.value })}
                          className="w-24 min-h-11 px-3 py-2 rounded-control border border-line bg-surface-elevated focus:outline-none focus:ring-1 focus:ring-focus/40 transition-all text-sm"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Asunto del seguimiento"
                        value={step.subject}
                        onChange={(e) => updateStep(i, { subject: e.target.value })}
                        className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-elevated focus:outline-none focus:ring-1 focus:ring-focus/40 transition-all text-sm"
                      />
                      <textarea
                        placeholder="<p>Hola de nuevo…</p>"
                        rows={4}
                        value={step.body}
                        onChange={(e) => updateStep(i, { body: e.target.value })}
                        className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-elevated focus:outline-none focus:ring-1 focus:ring-focus/40 transition-all text-sm resize-y font-mono"
                      />
                    </div>
                  ))}
                </div>
                {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
              </form>
            </div>
            <div className="p-6 border-t border-line flex justify-end gap-3 shrink-0 bg-surface-sidebar/50">
              <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className={secondaryAction}>Cancelar</button>
              <button type="submit" form="createCampaignForm" disabled={isSubmitting} className={primaryAction}>{isSubmitting ? "Guardando..." : "Guardar borrador"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
