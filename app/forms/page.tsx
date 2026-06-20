"use client";

import { useState, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { File02Icon, Delete01Icon, CodeIcon, LinkSquare01Icon, Activity01Icon, Cancel01Icon, UserMultipleIcon, PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import Link from "next/link";

type Form = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  companyId: string;
  company: { name: string };
  project?: { name: string };
  createdAt: string;
  _count: { fields: number; contacts?: number };
};

export default function FormsPage() {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState, searchQuery, sortField, sortOrder, activeFilters } = useHeader();

  const [forms, setForms] = useState<Form[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [selectedFormForContacts, setSelectedFormForContacts] = useState<Form | null>(null);
  const [formContacts, setFormContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  useEffect(() => {
    resetState();
    setConfig({
      searchPlaceholder: "Buscar formulario...",
      sortOptions: [
        { label: "Nombre", value: "name" },
        { label: "Fecha de creación", value: "createdAt" },
        { label: "Registrados", value: "contacts" },
      ],
      filterGroups: [
        {
          key: "status",
          label: "Estado",
          options: [
            { label: "Activo", value: "active" },
            { label: "Offline", value: "offline" },
          ],
        },
      ],
      addButton: { label: "Crear formulario", onClick: () => setIsModalOpen(true) },
    });
    return () => setConfig({});
  }, []);

  useEffect(() => {
    fetchForms();
    fetchCompanies();
    fetchProjects();
  }, []);

  const fetchForms = async () => {
    try {
      const res = await fetch("/api/forms");
      if (res.ok) setForms(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const fetchCompanies = async () => {
    try { const res = await fetch("/api/companies"); if (res.ok) setCompanies(await res.json()); } catch (e) { console.error(e); }
  };

  const fetchProjects = async () => {
    try { const res = await fetch("/api/projects"); if (res.ok) setProjects(await res.json()); } catch (e) { console.error(e); }
  };

  const displayed = useMemo(() => {
    let result = [...forms];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.name?.toLowerCase().includes(q) ||
        f.company?.name?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q)
      );
    }

    if (activeFilters.status) {
      result = result.filter(f => activeFilters.status === "active" ? f.isActive : !f.isActive);
    }

    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal: any, bVal: any;
        if (sortField === "name") { aVal = a.name?.toLowerCase() || ""; bVal = b.name?.toLowerCase() || ""; }
        else if (sortField === "createdAt") { aVal = a.createdAt || ""; bVal = b.createdAt || ""; }
        else if (sortField === "contacts") { aVal = a._count.contacts || 0; bVal = b._count.contacts || 0; }
        else { aVal = ""; bVal = ""; }
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [forms, searchQuery, sortField, sortOrder, activeFilters]);

  const handleCreateForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, companyId, projectId: projectId || null }),
      });
      if (res.ok) { setName(""); setDescription(""); setCompanyId(""); setProjectId(""); setIsModalOpen(false); fetchForms(); }
      else { const err = await res.json(); addToast(err.error || "Error al crear el formulario", "error"); }
    } catch (e) { addToast("Error inesperado.", "error"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string, formName: string) => {
    const ok = await confirm({
      title: "Eliminar formulario",
      description: `¿Eliminar permanentemente '${formName}'? Esto deshabilitará cualquier embed activo.`,
      confirmText: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/forms/${id}`, { method: "DELETE" });
      if (res.ok) fetchForms();
      else addToast("Failed to delete form.", "error");
    } catch (e) { addToast("Unexpected error.", "error"); }
  };

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${title} copied to clipboard!`, "success");
  };

  const handleViewContacts = async (form: Form) => {
    setSelectedFormForContacts(form);
    setIsContactsModalOpen(true);
    setIsLoadingContacts(true);
    setFormContacts([]);
    try {
      const res = await fetch(`/api/forms/${form.id}/contacts`);
      if (res.ok) setFormContacts(await res.json());
    } catch (e) { addToast("Failed to load contacts.", "error"); }
    finally { setIsLoadingContacts(false); }
  };

  return (
    <>
      <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-6 py-6 bg-surface-app">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-text-primary">Formularios</h1>
              {!isLoading && <span className="px-2 py-0.5 bg-gray-100 text-text-secondary text-xs font-semibold rounded-full">{forms.length}</span>}
            </div>
            <p className="text-sm text-text-secondary">Crea formularios embebibles para capturar leads desde tu sitio web.</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin"></div></div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg border border-border-subtle">
              <div className="w-16 h-16 bg-surface-sidebar rounded-lg flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon icon={File02Icon} size={28} color="#9ca3af" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1">{searchQuery || activeFilters.status ? "Sin resultados" : "No hay formularios"}</h3>
              <p className="text-sm text-text-secondary">{searchQuery || activeFilters.status ? "Prueba con otros filtros o busca un término diferente." : "Crea tu primer formulario para capturar leads."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayed.map((form) => {
                const formUrl = typeof window !== 'undefined' ? `${window.location.origin}/form/${form.id}` : '';
                const iframeCode = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0"></iframe>`;
                return (
                  <div key={form.id} className="bg-white border text-left border-border-subtle rounded-lg p-6 flex flex-col transition-all hover:border-border-subtle relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-text-primary">{form.name}</h3>
                        <div className="text-xs text-text-secondary font-medium mt-1 flex flex-col gap-0.5">
                          <span>Empresa: {form.company?.name || "Unknown Company"}</span>
                          {form.project && <span className="text-blue-600">Proyecto: {form.project.name}</span>}
                        </div>
                      </div>
                      {form.isActive ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-green-700 bg-green-50 px-2 py-1 rounded-md"><HugeiconsIcon icon={Activity01Icon} size={10} /> Activo</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-text-secondary bg-gray-100 px-2 py-1 rounded-md">Offline</span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mb-6 flex-1 line-clamp-2">{form.description || "Sin descripción."}</p>
                    <div className="flex items-center justify-between text-xs text-text-secondary mb-4 pb-4 border-b border-border-subtle">
                      <span>{form._count.fields} Campos</span>
                      <span className="font-semibold text-text-primary">{form._count.contacts || 0} Registrados</span>
                      <span>{new Date(form.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-auto">
                      <div className="flex gap-2">
                        <button onClick={() => copyToClipboard(formUrl, "Public Link")} className="p-2 text-text-secondary hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Copy Public Link"><HugeiconsIcon icon={LinkSquare01Icon} size={16} /></button>
                        <button onClick={() => copyToClipboard(iframeCode, "Iframe Embed Code")} className="p-2 text-text-secondary hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Copy Iframe Code"><HugeiconsIcon icon={CodeIcon} size={16} /></button>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleDelete(form.id, form.name)} className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Form"><HugeiconsIcon icon={Delete01Icon} size={16} /></button>
                        <button onClick={() => handleViewContacts(form)} title="Ver Registrados" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><HugeiconsIcon icon={UserMultipleIcon} size={14} /> Registrados</button>
                        <Link href={`/forms/${form.id}`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-primary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors"><HugeiconsIcon icon={PencilEdit01Icon} size={14} /> Builder</Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-accent-charcoal/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">Crear formulario</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-text-secondary p-1"><HugeiconsIcon icon={Cancel01Icon} size={20} /></button>
            </div>
            <div className="p-6">
              <form id="createForm" onSubmit={handleCreateForm} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Empresa</label>
                  <select required value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle text-sm">
                    <option value="" disabled>Seleccionar Empresa</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Proyecto (Opcional)</label>
                  <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle text-sm">
                    <option value="">No Project Attached</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Nombre del formulario</label>
                  <input type="text" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Descripción interna (Opcional)</label>
                  <textarea rows={3} maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-1 focus:ring-border-subtle text-sm resize-none"></textarea>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-border-subtle flex justify-end gap-3 bg-surface-sidebar/50">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-text-primary hover:bg-nav-hover">Cancelar</button>
              <button type="submit" form="createForm" disabled={isSubmitting} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent-charcoal hover:opacity-90 disabled:opacity-50">{isSubmitting ? "Creando..." : "Crear formulario"}</button>
            </div>
          </div>
        </div>
      )}

      {isContactsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-accent-charcoal/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border-subtle flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Registrados</h3>
                <p className="text-sm text-text-secondary">Últimos registros en {selectedFormForContacts?.name}</p>
              </div>
              <button onClick={() => setIsContactsModalOpen(false)} className="text-text-secondary hover:text-text-secondary p-1"><HugeiconsIcon icon={Cancel01Icon} size={24} /></button>
            </div>
            <div className="p-0 overflow-y-auto bg-surface-sidebar/30 flex-1">
              {isLoadingContacts ? (
                <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin"></div></div>
              ) : formContacts.length === 0 ? (
                <div className="text-center py-16"><HugeiconsIcon icon={UserMultipleIcon} size={48} color="#d1d5db" className="mx-auto mb-3" /><h3 className="text-[15px] font-medium text-text-primary">Sin leads registrados</h3><p className="text-sm text-text-secondary">Nadie ha llenado este formulario aún.</p></div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {formContacts.map((contact, idx) => {
                    const extraFieldsBody = contact.tasks?.[0]?.description;
                    const variantName = contact.sourceVariant?.name;
                    return (
                      <li key={contact.id || idx} className="p-5 hover:bg-white transition-colors group">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[15px] font-bold text-text-primary">{contact.firstName} {contact.lastName || ""}</p>
                              {variantName && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">🏷️ {variantName}</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
                              {contact.email && <span>📧 {contact.email}</span>}
                              {contact.phone && <span>📞 {contact.phone}</span>}
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-text-secondary bg-gray-100 px-2 py-1 rounded shrink-0 ml-2">{new Date(contact.createdAt).toLocaleDateString()}</span>
                        </div>
                        {extraFieldsBody && extraFieldsBody !== "No additional fields provided." && (
                          <div className="mt-3 text-xs bg-surface-sidebar border border-border-subtle p-3 rounded-lg text-text-secondary whitespace-pre-line group-hover:bg-nav-hover">{extraFieldsBody}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
