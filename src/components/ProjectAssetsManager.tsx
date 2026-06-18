"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { LinkSquare01Icon, Cancel01Icon, CheckmarkSquare01Icon, UserMultipleIcon, Building04Icon, BrowserIcon, Mail01Icon, FilterIcon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";

interface ProjectAssetsManagerProps {
  projectId: string;
  initialCounts: {
    contacts: number;
    companies: number;
    forms: number;
    campaigns: number;
    tasks: number;
  };
}

export default function ProjectAssetsManager({ projectId }: ProjectAssetsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"contacts" | "companies" | "forms" | "campaigns" | "tasks">("contacts");
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Data
  const [contacts, setContacts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Selected state per tab
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [selectedForms, setSelectedForms] = useState<Set<string>>(new Set());
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Filters
  const [contactCompanyFilter, setContactCompanyFilter] = useState("");
  const [contactFormFilter, setContactFormFilter] = useState("");
  const [taskCategoryFilter, setTaskCategoryFilter] = useState("");
  const [taskCompanyFilter, setTaskCompanyFilter] = useState("");
  const [taskFormFilter, setTaskFormFilter] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cts, cmps, frms, cmps2, ts, cats, linked] = await Promise.all([
        fetch("/api/contacts").then(r => r.json()),
        fetch("/api/companies").then(r => r.json()),
        fetch("/api/forms").then(r => r.json()),
        fetch("/api/campaigns").then(r => r.json()),
        fetch("/api/tasks").then(r => r.json()),
        fetch("/api/task-categories").then(r => r.json()),
        fetch(`/api/projects/${projectId}`).then(r => r.json()),
      ]);

      setContacts(Array.isArray(cts) ? cts : []);
      setCompanies(Array.isArray(cmps) ? cmps : []);
      setForms(Array.isArray(frms) ? frms : []);
      setCampaigns(Array.isArray(cmps2) ? cmps2 : []);
      setTasks(Array.isArray(ts) ? ts : []);
      setCategories(Array.isArray(cats) ? cats : []);

      // Pre-select linked resource IDs from the dedicated endpoint
      if (linked && !linked.error) {
        setSelectedContacts(new Set(linked.contactIds ?? []));
        setSelectedCompanies(new Set(linked.companyIds ?? []));
        setSelectedForms(new Set(linked.formIds ?? []));
        setSelectedCampaigns(new Set(linked.campaignIds ?? []));
        setSelectedTasks(new Set(linked.taskIds ?? []));
      }
    } catch (e) {
      console.error(e);
      addToast("Error al cargar los datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let resourceIds: string[] = [];
      if (activeTab === "contacts") resourceIds = Array.from(selectedContacts);
      if (activeTab === "companies") resourceIds = Array.from(selectedCompanies);
      if (activeTab === "forms") resourceIds = Array.from(selectedForms);
      if (activeTab === "campaigns") resourceIds = Array.from(selectedCampaigns);
      if (activeTab === "tasks") resourceIds = Array.from(selectedTasks);

      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType: activeTab, resourceIds })
      });

      if (res.ok) {
        addToast("Recursos vinculados exitosamente", "success");
        setTimeout(() => window.location.reload(), 800);
      } else {
        const data = await res.json().catch(() => ({}));
        addToast(data.error || "Error al guardar vínculos", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleSelection = (id: string, set: Set<string>, setFn: (s: Set<string>) => void) => {
    const newSet = new Set(set);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setFn(newSet);
  };

  const handleSelectAllFiltered = (filteredItems: any[], selectedSet: Set<string>, setFn: (s: Set<string>) => void) => {
    const newSet = new Set(selectedSet);
    const allSelected = filteredItems.every(i => newSet.has(i.id));
    if (allSelected) {
      filteredItems.forEach(i => newSet.delete(i.id));
    } else {
      filteredItems.forEach(i => newSet.add(i.id));
    }
    setFn(newSet);
  };

  // Derived filtered lists
  const filteredContacts = contacts.filter((c: any) => {
    if (contactCompanyFilter && c.companyId !== contactCompanyFilter) return false;
    if (contactFormFilter && c.sourceFormId !== contactFormFilter) return false;
    return true;
  });

  const filteredTasks = tasks.filter((t: any) => {
    if (taskCategoryFilter && t.categoryId !== taskCategoryFilter) return false;
    if (taskCompanyFilter && t.companyId !== taskCompanyFilter) return false;
    if (taskFormFilter && t.formId !== taskFormFilter) return false;
    return true;
  });

  const getActiveSet = (): Set<string> => {
    if (activeTab === "contacts") return selectedContacts;
    if (activeTab === "companies") return selectedCompanies;
    if (activeTab === "forms") return selectedForms;
    if (activeTab === "campaigns") return selectedCampaigns;
    return selectedTasks;
  };

  const getActiveSetFn = () => {
    if (activeTab === "contacts") return setSelectedContacts;
    if (activeTab === "companies") return setSelectedCompanies;
    if (activeTab === "forms") return setSelectedForms;
    if (activeTab === "campaigns") return setSelectedCampaigns;
    return setSelectedTasks;
  };

  const getActiveFilteredItems = () => {
    if (activeTab === "contacts") return filteredContacts;
    if (activeTab === "companies") return companies;
    if (activeTab === "forms") return forms;
    if (activeTab === "campaigns") return campaigns;
    return filteredTasks;
  };

  const tabs = [
    { id: "contacts", label: "Contactos", icon: UserMultipleIcon, count: selectedContacts.size },
    { id: "companies", label: "Empresas", icon: Building04Icon, count: selectedCompanies.size },
    { id: "forms", label: "Formularios", icon: BrowserIcon, count: selectedForms.size },
    { id: "campaigns", label: "Campañas", icon: Mail01Icon, count: selectedCampaigns.size },
    { id: "tasks", label: "Tareas", icon: CheckmarkSquare01Icon, count: selectedTasks.size },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-accent-charcoal text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-colors font-medium shrink-0"
      >
        <HugeiconsIcon icon={LinkSquare01Icon} size={16} />
        Administrar Vínculos
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <HugeiconsIcon icon={LinkSquare01Icon} size={20} color="#2563eb" />
                  Vincular Recursos al Proyecto
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  Selecciona los recursos y guarda los vínculos por pestaña.
                </p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-text-secondary transition-colors">
                <HugeiconsIcon icon={Cancel01Icon} size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-surface-sidebar/50">
              {/* Sidebar Tabs */}
              <div className="w-full md:w-64 border-r border-border-subtle bg-white p-4 overflow-y-auto shrink-0">
                <div className="flex flex-col gap-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-gray-100 text-text-primary" : "text-text-secondary hover:bg-surface-sidebar"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <HugeiconsIcon icon={tab.icon} size={18} color={activeTab === tab.id ? "#111827" : "#9ca3af"} />
                        {tab.label}
                      </div>
                      {tab.count > 0 && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {loading ? (
                  <div className="flex-1 flex items-center justify-center text-text-secondary">
                    Cargando datos...
                  </div>
                ) : (
                  <>
                    {/* Filters Header */}
                    <div className="p-4 border-b border-border-subtle bg-surface-sidebar flex flex-col gap-3">
                      {activeTab === "contacts" && (
                        <div className="flex gap-3 items-center flex-wrap">
                          <HugeiconsIcon icon={FilterIcon} size={16} color="#9ca3af" className="shrink-0" />
                          <select
                            value={contactCompanyFilter}
                            onChange={e => setContactCompanyFilter(e.target.value)}
                            className="text-sm border border-border-subtle rounded-lg px-3 py-1.5 focus:border-black outline-none flex-1 min-w-0"
                          >
                            <option value="">-- Filtrar por Empresa --</option>
                            {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <select
                            value={contactFormFilter}
                            onChange={e => setContactFormFilter(e.target.value)}
                            className="text-sm border border-border-subtle rounded-lg px-3 py-1.5 focus:border-black outline-none flex-1 min-w-0"
                          >
                            <option value="">-- Filtrar por Formulario --</option>
                            {forms.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                        </div>
                      )}
                      {activeTab === "tasks" && (
                        <div className="flex gap-3 items-center flex-wrap">
                          <HugeiconsIcon icon={FilterIcon} size={16} color="#9ca3af" className="shrink-0" />
                          <select
                            value={taskCategoryFilter}
                            onChange={e => setTaskCategoryFilter(e.target.value)}
                            className="text-sm border border-border-subtle rounded-lg px-3 py-1.5 outline-none flex-1 min-w-0"
                          >
                            <option value="">-- Categoría --</option>
                            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <select
                            value={taskCompanyFilter}
                            onChange={e => setTaskCompanyFilter(e.target.value)}
                            className="text-sm border border-border-subtle rounded-lg px-3 py-1.5 outline-none flex-1 min-w-0"
                          >
                            <option value="">-- Empresa --</option>
                            {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <select
                            value={taskFormFilter}
                            onChange={e => setTaskFormFilter(e.target.value)}
                            className="text-sm border border-border-subtle rounded-lg px-3 py-1.5 outline-none flex-1 min-w-0"
                          >
                            <option value="">-- Formulario --</option>
                            {forms.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                        </div>
                      )}

                      {/* Select All / None */}
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          {getActiveFilteredItems().length} resultados
                        </span>
                        <button
                          onClick={() => handleSelectAllFiltered(getActiveFilteredItems(), getActiveSet(), getActiveSetFn())}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wide px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          Seleccionar Todo / Ninguno
                        </button>
                      </div>
                    </div>

                    {/* Content List */}
                    <div className="flex-1 overflow-y-auto p-2">
                      {/* CONTACTS */}
                      {activeTab === "contacts" && (
                        <div className="flex flex-col gap-1">
                          {filteredContacts.length === 0 && (
                            <p className="text-sm text-text-secondary text-center py-8">No hay contactos disponibles</p>
                          )}
                          {filteredContacts.map((c: any) => (
                            <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-surface-sidebar rounded-lg cursor-pointer border border-transparent hover:border-border-subtle transition-colors">
                              <input
                                type="checkbox"
                                checked={selectedContacts.has(c.id)}
                                onChange={() => toggleSelection(c.id, selectedContacts, setSelectedContacts)}
                                className="w-4 h-4 rounded text-blue-600 border-border-subtle focus:ring-blue-500"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-text-primary truncate">{c.firstName} {c.lastName}</span>
                                <div className="flex gap-2 flex-wrap text-xs text-text-secondary">
                                  {c.email && <span className="truncate">{c.email}</span>}
                                  {c.company && <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md font-bold shrink-0">🏢 {c.company.name}</span>}
                                  {c.sourceForm && <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md font-bold shrink-0">📝 {c.sourceForm.name}</span>}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* COMPANIES */}
                      {activeTab === "companies" && (
                        <div className="flex flex-col gap-1">
                          {companies.length === 0 && (
                            <p className="text-sm text-text-secondary text-center py-8">No hay empresas disponibles</p>
                          )}
                          {companies.map((c: any) => (
                            <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-surface-sidebar rounded-lg cursor-pointer border border-transparent hover:border-border-subtle transition-colors">
                              <input
                                type="checkbox"
                                checked={selectedCompanies.has(c.id)}
                                onChange={() => toggleSelection(c.id, selectedCompanies, setSelectedCompanies)}
                                className="w-4 h-4 rounded text-blue-600 border-border-subtle focus:ring-blue-500"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-text-primary">{c.name}</span>
                                {c.industry && <span className="text-xs text-text-secondary">{c.industry}</span>}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* FORMS */}
                      {activeTab === "forms" && (
                        <div className="flex flex-col gap-1">
                          {forms.length === 0 && (
                            <p className="text-sm text-text-secondary text-center py-8">No hay formularios disponibles</p>
                          )}
                          {forms.map((f: any) => (
                            <label key={f.id} className="flex items-center gap-3 p-3 hover:bg-surface-sidebar rounded-lg cursor-pointer border border-transparent hover:border-border-subtle transition-colors">
                              <input
                                type="checkbox"
                                checked={selectedForms.has(f.id)}
                                onChange={() => toggleSelection(f.id, selectedForms, setSelectedForms)}
                                className="w-4 h-4 rounded text-blue-600 border-border-subtle focus:ring-blue-500"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-text-primary">{f.name}</span>
                                <div className="flex gap-2 text-xs text-text-secondary">
                                  <span>{f.isActive ? "Activo" : "Inactivo"}</span>
                                  {f.company && <span>· {f.company.name}</span>}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* CAMPAIGNS */}
                      {activeTab === "campaigns" && (
                        <div className="flex flex-col gap-1">
                          {campaigns.length === 0 && (
                            <p className="text-sm text-text-secondary text-center py-8">No hay campañas disponibles</p>
                          )}
                          {campaigns.map((c: any) => (
                            <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-surface-sidebar rounded-lg cursor-pointer border border-transparent hover:border-border-subtle transition-colors">
                              <input
                                type="checkbox"
                                checked={selectedCampaigns.has(c.id)}
                                onChange={() => toggleSelection(c.id, selectedCampaigns, setSelectedCampaigns)}
                                className="w-4 h-4 rounded text-blue-600 border-border-subtle focus:ring-blue-500"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-text-primary">{c.subject}</span>
                                <span className="text-xs text-text-secondary">{c.status}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* TASKS */}
                      {activeTab === "tasks" && (
                        <div className="flex flex-col gap-1">
                          {filteredTasks.length === 0 && (
                            <p className="text-sm text-text-secondary text-center py-8">No hay tareas disponibles</p>
                          )}
                          {filteredTasks.map((t: any) => (
                            <label key={t.id} className="flex items-center gap-3 p-3 hover:bg-surface-sidebar rounded-lg cursor-pointer border border-transparent hover:border-border-subtle transition-colors">
                              <input
                                type="checkbox"
                                checked={selectedTasks.has(t.id)}
                                onChange={() => toggleSelection(t.id, selectedTasks, setSelectedTasks)}
                                className="w-4 h-4 rounded text-blue-600 border-border-subtle focus:ring-blue-500"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className={`text-sm font-semibold truncate ${t.isCompleted ? "text-text-secondary line-through" : "text-text-primary"}`}>{t.title}</span>
                                <div className="flex gap-2 flex-wrap text-xs text-text-secondary">
                                  {t.category && <span className="font-bold uppercase" style={{ color: t.category.color }}>{t.category.name}</span>}
                                  {t.company && <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md font-bold shrink-0">🏢 {t.company.name}</span>}
                                  {t.form && <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md font-bold shrink-0">📝 {t.form.name}</span>}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="p-4 border-t border-border-subtle bg-white flex justify-between items-center gap-3">
                      <span className="text-xs text-text-secondary">
                        Guardando solo la pestaña activa: <strong className="text-text-secondary">{tabs.find(t => t.id === activeTab)?.label}</strong>
                      </span>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setIsOpen(false)}
                          className="px-5 py-2.5 font-semibold text-text-secondary bg-white border border-border-subtle hover:bg-surface-sidebar rounded-lg transition-colors text-sm"
                        >
                          Cerrar
                        </button>
                        <button
                          disabled={saving}
                          onClick={handleSave}
                          className="px-5 py-2.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm disabled:opacity-50"
                        >
                          {saving ? "Guardando..." : "Guardar vínculos"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
