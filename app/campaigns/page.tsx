"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import { Mail, Plus, Send, Clock, CheckCircle2, XCircle, RefreshCw, Trash2, Eye, Code2 } from "lucide-react";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";

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
  const { addToast, showConfirm } = useToast();
  const { confirm } = useConfirm();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleDelete = async (campaign: Campaign) => {
    const isConfirmed = await confirm({
      title: "Eliminar campaña",
      description: `¿Estás seguro de que quieres eliminar la campaña '${campaign.subject}'? Todo el historial de envíos asociado se perderá.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger"
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== campaign.id));
        addToast("Campaña eliminada exitosamente.", "success");
      } else {
        const err = await res.json();
        addToast(err.error || "Error al eliminar la campaña.", "error");
      }
    } catch (e) {
      addToast("Error de conexión al eliminar.", "error");
    }
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [companies, setCompanies] = useState<any[]>([]);

  // Advanced Targeting
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
    fetchCampaigns();
    fetchCompanies();
    fetchProjects();
    fetchForms();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) setProjects(await res.json());
    } catch (e) { }
  };

  const fetchForms = async () => {
    try {
      const res = await fetch("/api/forms");
      if (res.ok) setForms(await res.json());
    } catch (e) { }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (error) {
      console.error("Failed to fetch campaigns");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body: htmlBody,
          companyId,
          projectId: targetType === "PROJECT" ? projectId : null,
          targetFormId: targetType === "FORM" ? targetFormId : null
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create draft");
      }

      setSubject("");
      setHtmlBody("");
      setTargetType("ALL");
      setProjectId("");
      setTargetFormId("");
      setIsPreviewMode(false);
      setIsModalOpen(false);
      fetchCampaigns(); // refresh list
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    const ok = await showConfirm("¿Enviar esta campaña a todos tus contactos?", {
      title: "Enviar campaña",
      confirmLabel: "Enviar",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });

      if (!res.ok) {
        const data = await res.json();
        addToast(data.error || "Failed to schedule campaign", "error");
        return;
      }

      const result = await res.json();
      addToast(`Success! ${result.totalScheduled} emails have been scheduled for dispatch.`, "success");
      fetchCampaigns(); // refresh list to see SENDING status
    } catch (error) {
      addToast("An unexpected error occurred.", "error");
    }
  };

  const handleProcessQueue = async () => {
    setIsProcessingQueue(true);
    try {
      const res = await fetch("/api/cron/process-emails");
      const data = await res.json();

      if (res.ok) {
        if (data.message === "No pending emails to process") {
          addToast("Queue is empty. No pending emails to process.", "info");
        } else {
          addToast("Queue processing triggered successfully! Check campaigns status.", "success");
        }
        fetchCampaigns();
      } else {
        addToast(data.error || "Failed to process queue.", "error");
      }
    } catch (error) {
      console.error(error);
      addToast("Error contacting the cron dispatcher.", "error");
    } finally {
      setIsProcessingQueue(false);
    }
  };

  return (
    <div className="flex h-screen bg-background font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 py-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <Mail className="text-gray-400" size={28} />
              Email Marketing
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={handleProcessQueue}
                disabled={isProcessingQueue}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={isProcessingQueue ? "animate-spin" : ""} />
                {isProcessingQueue ? "Procesando..." : "Procesar cola"}
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                <Plus size={18} />
                Nueva campaña
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
              <Mail className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No campaigns yet</h3>
              <p className="text-gray-500 text-sm mb-4">Start by creating your first email newsletter draft.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors"
              >
                <Plus size={16} /> Create Draft
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Asunto</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Destinatarios</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Creado</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {campaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{camp.subject}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="font-semibold text-gray-900 border-b border-gray-100 pb-1 mb-1">{camp.company?.name || "Unknown"}</div>
                        {camp.project ? (
                          <div className="text-[11px] text-blue-600 font-medium tracking-wide">💼 PROYECTO: {camp.project.name}</div>
                        ) : camp.targetForm ? (
                          <div className="text-[11px] text-purple-600 font-medium tracking-wide">📝 FORMULARIO: {camp.targetForm.name}</div>
                        ) : (
                          <div className="text-[11px] text-gray-400 font-medium tracking-wide">🏢 TODA LA EMPRESA</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {camp.status === "DRAFT" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <Clock size={12} /> Draft
                          </span>
                        )}
                        {camp.status === "SENDING" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            <Send size={12} /> Sending...
                          </span>
                        )}
                        {camp.status === "COMPLETED" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            <CheckCircle2 size={12} /> Completed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {camp._count.logs > 0 ? camp._count.logs : "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(camp.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {camp.status === "DRAFT" ? (
                            <button
                              onClick={() => handleSendCampaign(camp.id)}
                              className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                              Enviar
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs font-medium bg-gray-100 px-2 py-1 rounded">Locked</span>
                          )}
                          <button
                            onClick={() => setPreviewCampaign(camp)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Previsualizar correo"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(camp)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar campaña"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </main>
      </div>

      {/* PREVIEW MODAL */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex items-start justify-between shrink-0">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Eye size={16} className="text-gray-400" />
                  Previsualización del correo
                </h3>
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">Asunto:</span> {previewCampaign.subject}
                </p>
                <p className="text-xs text-gray-400">
                  {previewCampaign.company?.name}
                  {previewCampaign.project ? ` · 💼 ${previewCampaign.project.name}` : previewCampaign.targetForm ? ` · 📝 ${previewCampaign.targetForm.name}` : " · 🏢 Toda la empresa"}
                </p>
              </div>
              <button onClick={() => setPreviewCampaign(null)} className="text-gray-400 hover:text-gray-600 p-1 shrink-0">
                <XCircle size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-4">
              <div className="w-full h-full rounded-xl border border-gray-200 overflow-hidden bg-white" style={{ minHeight: "420px" }}>
                {previewCampaign.body?.trim() ? (
                  <iframe
                    srcDoc={previewCampaign.body}
                    sandbox="allow-same-origin"
                    className="w-full border-0"
                    style={{ height: "420px" }}
                    title="Previsualización del correo"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400 gap-2">
                    <Eye size={32} className="opacity-30" />
                    <span className="text-sm">Esta campaña no tiene cuerpo HTML</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end shrink-0 bg-gray-50/50">
              <button
                onClick={() => setPreviewCampaign(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Crear campaña de correo</h3>
              <button onClick={() => { setIsModalOpen(false); setIsPreviewMode(false); }} className="text-gray-400 hover:text-gray-600 p-1">
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="createCampaignForm" onSubmit={handleCreateDraft} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">Empresa (Identidad del remitente)</label>
                  <select
                    required
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm"
                  >
                    <option value="" disabled>Seleccionar empresa</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">The campaign will map to this company's external settings (SMTP).</p>
                </div>

                {companyId && (
                  <div className="flex flex-col gap-2 p-3 border border-gray-200 rounded-xl bg-gray-50/50">
                    <label className="text-sm font-semibold text-gray-900">Destinatarios:</label>
                    <div className="flex flex-col gap-3">

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="targetType"
                          checked={targetType === "ALL"}
                          onChange={() => setTargetType("ALL")}
                          className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                        />
                        <span className="text-sm font-medium text-gray-700">🏢 Toda la Empresa (Todos los contactos)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="targetType"
                          checked={targetType === "PROJECT"}
                          onChange={() => setTargetType("PROJECT")}
                          className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                        />
                        <span className="text-sm font-medium text-gray-700">💼 Un Proyecto Específico</span>
                      </label>
                      {targetType === "PROJECT" && (
                        <select
                          required
                          value={projectId}
                          onChange={(e) => setProjectId(e.target.value)}
                          className="w-full px-3 py-2 ml-6 rounded-lg border border-gray-200 bg-white text-sm w-[calc(100%-1.5rem)]"
                        >
                          <option value="" disabled>Seleccionar Proyecto</option>
                          {projects.filter(p => p.organizationId === companies.find(c => c.id === companyId)?.organizationId).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      )}

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="targetType"
                          checked={targetType === "FORM"}
                          onChange={() => setTargetType("FORM")}
                          className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                        />
                        <span className="text-sm font-medium text-gray-700">📝 Un Formulario Específico</span>
                      </label>
                      {targetType === "FORM" && (
                        <select
                          required
                          value={targetFormId}
                          onChange={(e) => setTargetFormId(e.target.value)}
                          className="w-full px-3 py-2 ml-6 rounded-lg border border-gray-200 bg-white text-sm w-[calc(100%-1.5rem)]"
                        >
                          <option value="" disabled>Seleccionar Formulario</option>
                          {forms.filter(f => f.companyId === companyId).map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      )}

                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">Asunto</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Noticias emocionantes de nuestro equipo!"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">Cuerpo del correo (HTML soportado)</label>
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setIsPreviewMode(false)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!isPreviewMode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        <Code2 size={13} />
                        Código
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPreviewMode(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isPreviewMode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        <Eye size={13} />
                        Previsualizar
                      </button>
                    </div>
                  </div>

                  {!isPreviewMode ? (
                    <textarea
                      required
                      placeholder="<p>Hola! Queríamos contactarte...</p>"
                      rows={10}
                      value={htmlBody}
                      onChange={(e) => setHtmlBody(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm resize-y font-mono"
                    />
                  ) : (
                    <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white" style={{ minHeight: "260px" }}>
                      {htmlBody.trim() ? (
                        <iframe
                          srcDoc={htmlBody}
                          sandbox="allow-same-origin"
                          className="w-full border-0"
                          style={{ minHeight: "260px", height: "260px" }}
                          title="Previsualización del correo"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400 gap-2">
                          <Eye size={28} className="opacity-40" />
                          <span className="text-sm">Escribe HTML en el editor para previsualizar</span>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-400">Puedes usar HTML sin procesar aquí para formatear tu boletín.</p>
                </div>

                {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
              </form>
            </div>

            <div className="p-6 border-t border-gray-50 flex justify-end gap-3 shrink-0 bg-gray-50/50">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setIsPreviewMode(false); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="createCampaignForm"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Guardando..." : "Guardar borrador"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
