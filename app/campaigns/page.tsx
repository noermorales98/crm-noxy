"use client";

import { useState, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, SentIcon, Clock01Icon, CheckmarkCircle01Icon, Cancel01Icon, Refresh01Icon, Delete01Icon, ViewIcon, CodeIcon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";

type Campaign = {
  id: string;
  subject: string;
  body: string;
  status: "DRAFT" | "SENDING" | "COMPLETED";
  sentAt: string | null;
  createdAt: string;
  companyId: string;
  company: { name: string };
  project?: { name: string };
  targetForm?: { name: string };
  _count: { logs: number };
};

export default function CampaignsPage() {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState, sortField, sortOrder, activeFilters } = useHeader();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      addButton: { label: "Nueva campaña", onClick: () => setIsModalOpen(true) },
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
      if (res.ok) setCampaigns(await res.json());
    } catch (error) { console.error("Failed to fetch campaigns"); }
    finally { setIsLoading(false); }
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

  const handleCreateDraft = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true); setErrorMsg(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body: htmlBody, companyId, projectId: targetType === "PROJECT" ? projectId : null, targetFormId: targetType === "FORM" ? targetFormId : null }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to create draft"); }
      setSubject(""); setHtmlBody(""); setTargetType("ALL"); setProjectId(""); setTargetFormId(""); setIsPreviewMode(false); setIsModalOpen(false);
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
      if (!res.ok) { const data = await res.json(); addToast(data.error || "Failed to schedule campaign", "error"); return; }
      const result = await res.json();
      addToast(`Success! ${result.totalScheduled} emails have been scheduled for dispatch.`, "success");
      fetchCampaigns();
    } catch (error) { addToast("An unexpected error occurred.", "error"); }
  };

  const handleProcessQueue = async () => {
    setIsProcessingQueue(true);
    try {
      const res = await fetch("/api/cron/process-emails");
      const data = await res.json();
      if (res.ok) {
        addToast(data.message === "No pending emails to process" ? "Queue is empty. No pending emails to process." : "Queue processing triggered successfully!", "success");
        fetchCampaigns();
      } else { addToast(data.error || "Failed to process queue.", "error"); }
    } catch (error) { addToast("Error contacting the cron dispatcher.", "error"); }
    finally { setIsProcessingQueue(false); }
  };

  return (
    <>
      <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-6 py-6 bg-surface-app">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm text-text-secondary">Crea y gestiona campañas de correo para tus contactos.</p>
            </div>
            <button onClick={handleProcessQueue} disabled={isProcessingQueue} className="flex items-center gap-2 bg-white border border-border-subtle hover:bg-surface-sidebar text-text-secondary px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
              <HugeiconsIcon icon={Refresh01Icon} size={15} className={isProcessingQueue ? "animate-spin" : ""} />
              {isProcessingQueue ? "Procesando..." : "Procesar cola"}
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin"></div></div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg border border-border-subtle">
              <HugeiconsIcon icon={Mail01Icon} size={48} color="#d1d5db" className="mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-1">{activeFilters.status ? "No se encontraron campañas." : "No campaigns yet"}</h3>
              {!activeFilters.status && <p className="text-text-secondary text-sm mb-4">Start by creating your first email newsletter draft.</p>}
            </div>
          ) : (
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-sidebar/60">
                    <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Asunto</th>
                    <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Empresa / Destino</th>
                    <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Estado</th>
                    <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Enviados</th>
                    <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Creado</th>
                    <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {displayed.map((camp) => (
                    <tr key={camp.id} className="hover:bg-surface-sidebar/50 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-text-primary max-w-[220px] truncate">{camp.subject}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-text-primary">{camp.company?.name || "—"}</div>
                        {camp.project ? <div className="text-[11px] text-blue-600 font-medium mt-0.5">💼 {camp.project.name}</div>
                          : camp.targetForm ? <div className="text-[11px] text-purple-600 font-medium mt-0.5">📝 {camp.targetForm.name}</div>
                          : <div className="text-[11px] text-text-secondary mt-0.5">Toda la empresa</div>}
                      </td>
                      <td className="px-6 py-4">
                        {camp.status === "DRAFT" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-text-secondary"><HugeiconsIcon icon={Clock01Icon} size={11} /> Borrador</span>}
                        {camp.status === "SENDING" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700"><HugeiconsIcon icon={SentIcon} size={11} /> Enviando</span>}
                        {camp.status === "COMPLETED" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-700"><HugeiconsIcon icon={CheckmarkCircle01Icon} size={11} /> Completada</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary font-medium">{camp._count.logs > 0 ? camp._count.logs.toLocaleString() : "—"}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{new Date(camp.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {camp.status === "DRAFT" ? (
                            <button onClick={() => handleSendCampaign(camp.id)} className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">Enviar</button>
                          ) : (
                            <span className="text-text-secondary text-[11px] font-semibold bg-gray-100 px-2 py-1 rounded-lg">Bloqueado</span>
                          )}
                          <button onClick={() => setPreviewCampaign(camp)} className="p-1.5 text-text-secondary hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Previsualizar"><HugeiconsIcon icon={ViewIcon} size={15} /></button>
                          <button onClick={() => handleDelete(camp)} className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><HugeiconsIcon icon={Delete01Icon} size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

      {/* PREVIEW MODAL */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-accent-charcoal/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border-subtle flex items-start justify-between shrink-0">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2"><HugeiconsIcon icon={ViewIcon} size={16} color="#9ca3af" />Previsualización del correo</h3>
                <p className="text-sm text-text-secondary"><span className="font-medium text-text-primary">Asunto:</span> {previewCampaign.subject}</p>
                <p className="text-xs text-text-secondary">{previewCampaign.company?.name}{previewCampaign.project ? ` · 💼 ${previewCampaign.project.name}` : previewCampaign.targetForm ? ` · 📝 ${previewCampaign.targetForm.name}` : " · 🏢 Toda la empresa"}</p>
              </div>
              <button onClick={() => setPreviewCampaign(null)} className="text-text-secondary hover:text-text-secondary p-1 shrink-0"><HugeiconsIcon icon={Cancel01Icon} size={24} /></button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <div className="w-full h-full rounded-lg border border-border-subtle overflow-hidden bg-white" style={{ minHeight: "420px" }}>
                {previewCampaign.body?.trim() ? (
                  <iframe srcDoc={previewCampaign.body} sandbox="allow-same-origin" className="w-full border-0" style={{ height: "420px" }} title="Previsualización del correo" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-text-secondary gap-2"><HugeiconsIcon icon={ViewIcon} size={32} className="opacity-30" /><span className="text-sm">Esta campaña no tiene cuerpo HTML</span></div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-border-subtle flex justify-end shrink-0 bg-surface-sidebar/50">
              <button onClick={() => setPreviewCampaign(null)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-text-primary hover:bg-nav-hover transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-accent-charcoal/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border-subtle flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-text-primary">Crear campaña de correo</h3>
              <button onClick={() => { setIsModalOpen(false); setIsPreviewMode(false); }} className="text-text-secondary hover:text-text-secondary p-1"><HugeiconsIcon icon={Cancel01Icon} size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="createCampaignForm" onSubmit={handleCreateDraft} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-text-primary">Empresa (Identidad del remitente)</label>
                  <select required value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all text-sm">
                    <option value="" disabled>Seleccionar empresa</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <p className="text-xs text-text-secondary">The campaign will map to this company's external settings (SMTP).</p>
                </div>
                {companyId && (
                  <div className="flex flex-col gap-2 p-3 border border-border-subtle rounded-lg bg-surface-sidebar/50">
                    <label className="text-sm font-semibold text-text-primary">Destinatarios:</label>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="targetType" checked={targetType === "ALL"} onChange={() => setTargetType("ALL")} className="w-4 h-4 text-text-primary border-border-subtle focus:ring-gray-900" />
                        <span className="text-sm font-medium text-text-primary">🏢 Toda la Empresa</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="targetType" checked={targetType === "PROJECT"} onChange={() => setTargetType("PROJECT")} className="w-4 h-4 text-text-primary border-border-subtle focus:ring-gray-900" />
                        <span className="text-sm font-medium text-text-primary">💼 Un Proyecto Específico</span>
                      </label>
                      {targetType === "PROJECT" && (
                        <select required value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full px-3 py-2 ml-6 rounded-lg border border-border-subtle bg-white text-sm">
                          <option value="" disabled>Seleccionar Proyecto</option>
                          {projects.filter(p => p.organizationId === companies.find((c: any) => c.id === companyId)?.organizationId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="targetType" checked={targetType === "FORM"} onChange={() => setTargetType("FORM")} className="w-4 h-4 text-text-primary border-border-subtle focus:ring-gray-900" />
                        <span className="text-sm font-medium text-text-primary">📝 Un Formulario Específico</span>
                      </label>
                      {targetType === "FORM" && (
                        <select required value={targetFormId} onChange={(e) => setTargetFormId(e.target.value)} className="w-full px-3 py-2 ml-6 rounded-lg border border-border-subtle bg-white text-sm">
                          <option value="" disabled>Seleccionar Formulario</option>
                          {forms.filter((f: any) => f.companyId === companyId).map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-text-primary">Asunto</label>
                  <input type="text" required placeholder="e.g. Noticias emocionantes de nuestro equipo!" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all text-sm" />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-text-primary">Cuerpo del correo (HTML soportado)</label>
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                      <button type="button" onClick={() => setIsPreviewMode(false)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!isPreviewMode ? "bg-white text-text-primary" : "text-text-secondary hover:text-text-primary"}`}><HugeiconsIcon icon={CodeIcon} size={13} />Código</button>
                      <button type="button" onClick={() => setIsPreviewMode(true)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isPreviewMode ? "bg-white text-text-primary" : "text-text-secondary hover:text-text-primary"}`}><HugeiconsIcon icon={ViewIcon} size={13} />Previsualizar</button>
                    </div>
                  </div>
                  {!isPreviewMode ? (
                    <textarea required placeholder="<p>Hola! Queríamos contactarte...</p>" rows={10} value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle transition-all text-sm resize-y font-mono" />
                  ) : (
                    <div className="w-full rounded-lg border border-border-subtle overflow-hidden bg-white" style={{ minHeight: "260px" }}>
                      {htmlBody.trim() ? (
                        <iframe srcDoc={htmlBody} sandbox="allow-same-origin" className="w-full border-0" style={{ minHeight: "260px", height: "260px" }} title="Previsualización del correo" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-16 text-text-secondary gap-2"><HugeiconsIcon icon={ViewIcon} size={28} className="opacity-40" /><span className="text-sm">Escribe HTML en el editor para previsualizar</span></div>
                      )}
                    </div>
                  )}
                </div>
                {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
              </form>
            </div>
            <div className="p-6 border-t border-border-subtle flex justify-end gap-3 shrink-0 bg-surface-sidebar/50">
              <button type="button" onClick={() => { setIsModalOpen(false); setIsPreviewMode(false); }} className="px-5 py-2.5 rounded-lg text-sm font-medium text-text-primary hover:bg-nav-hover transition-colors">Cancelar</button>
              <button type="submit" form="createCampaignForm" disabled={isSubmitting} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-accent-charcoal hover:opacity-90 transition-colors disabled:opacity-50">{isSubmitting ? "Guardando..." : "Guardar borrador"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
