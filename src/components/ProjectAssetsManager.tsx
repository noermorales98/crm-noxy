"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { LinkSquare01Icon, Cancel01Icon, CheckmarkSquare01Icon, Building04Icon, BrowserIcon, FilterIcon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";

interface ProjectAssetsManagerProps {
  projectId: string;
}

export default function ProjectAssetsManager({ projectId }: ProjectAssetsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tasks, setTasks] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const [taskCompanyFilter, setTaskCompanyFilter] = useState("");
  const [taskFormFilter, setTaskFormFilter] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ts, cmps, frms, linked] = await Promise.all([
        fetch("/api/tasks").then(r => r.json()),
        fetch("/api/companies").then(r => r.json()),
        fetch("/api/forms").then(r => r.json()),
        fetch(`/api/projects/${projectId}`).then(r => r.json()),
      ]);

      setTasks(Array.isArray(ts) ? ts : []);
      setCompanies(Array.isArray(cmps) ? cmps : []);
      setForms(Array.isArray(frms) ? frms : []);

      if (linked && !linked.error) {
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
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType: "tasks", resourceIds: Array.from(selectedTasks) })
      });

      if (res.ok) {
        addToast("Tareas vinculadas exitosamente", "success");
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

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedTasks);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedTasks(newSet);
  };

  const handleSelectAllFiltered = () => {
    const newSet = new Set(selectedTasks);
    const allSelected = filteredTasks.every(i => newSet.has(i.id));
    if (allSelected) {
      filteredTasks.forEach(i => newSet.delete(i.id));
    } else {
      filteredTasks.forEach(i => newSet.add(i.id));
    }
    setSelectedTasks(newSet);
  };

  const filteredTasks = tasks.filter((t: any) => {
    if (taskCompanyFilter && t.companyId !== taskCompanyFilter) return false;
    if (taskFormFilter && t.formId !== taskFormFilter) return false;
    return true;
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-action-primary text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-colors font-medium shrink-0"
      >
        <HugeiconsIcon icon={LinkSquare01Icon} size={16} />
        Vincular tareas
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <HugeiconsIcon icon={CheckmarkSquare01Icon} size={20} color="#3545D6" />
                  Vincular tareas al proyecto
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  Selecciona las tareas que pertenecen a este proyecto.
                </p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-text-secondary transition-colors">
                <HugeiconsIcon icon={Cancel01Icon} size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white">
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-text-secondary py-16">
                  Cargando datos...
                </div>
              ) : (
                <>
                  {/* Filters Header */}
                  <div className="p-4 border-b border-border-subtle bg-surface-sidebar flex flex-col gap-3">
                    <div className="flex gap-3 items-center flex-wrap">
                      <HugeiconsIcon icon={FilterIcon} size={16} color="#9ca3af" className="shrink-0" />
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

                    {/* Select All / None */}
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        {filteredTasks.length} resultados
                      </span>
                      <button
                        onClick={handleSelectAllFiltered}
                        className="text-xs font-bold text-action-primary hover:text-action-secondary px-2 py-1 bg-nav-hover hover:bg-nav-active rounded-md transition-colors"
                      >
                        Seleccionar Todo / Ninguno
                      </button>
                    </div>
                  </div>

                  {/* Content List */}
                  <div className="flex-1 overflow-y-auto p-2">
                    {filteredTasks.length === 0 && (
                      <p className="text-sm text-text-secondary text-center py-8">No hay tareas disponibles</p>
                    )}
                    {filteredTasks.map((t: any) => (
                      <label key={t.id} className="flex items-center gap-3 p-3 hover:bg-surface-sidebar rounded-lg cursor-pointer border border-transparent hover:border-border-subtle transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(t.id)}
                          onChange={() => toggleSelection(t.id)}
                          className="w-4 h-4 rounded text-action-primary border-border-subtle focus:ring-focus"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm font-semibold truncate ${t.isCompleted ? "text-text-secondary line-through" : "text-text-primary"}`}>{t.title}</span>
                          <div className="flex gap-2 flex-wrap text-xs text-text-secondary">
                            {t.company && <span className="text-action-primary bg-nav-hover px-1.5 py-0.5 rounded-md font-bold shrink-0"><HugeiconsIcon icon={Building04Icon} size={10} className="inline mr-0.5" />{t.company.name}</span>}
                            {t.form && <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md font-bold shrink-0"><HugeiconsIcon icon={BrowserIcon} size={10} className="inline mr-0.5" />{t.form.name}</span>}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Action Bar */}
                  <div className="p-4 border-t border-border-subtle bg-white flex justify-end items-center gap-3">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-5 py-2.5 font-semibold text-text-secondary bg-white border border-border-subtle hover:bg-surface-sidebar rounded-lg transition-colors text-sm"
                    >
                      Cerrar
                    </button>
                    <button
                      disabled={saving}
                      onClick={handleSave}
                      className="px-5 py-2.5 font-semibold text-white bg-action-primary hover:bg-action-secondary rounded-control transition-colors text-sm disabled:opacity-50"
                    >
                      {saving ? "Guardando..." : "Guardar vínculos"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
