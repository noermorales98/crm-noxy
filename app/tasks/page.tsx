"use client";

import { useState, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick01Icon, Clock01Icon, Delete01Icon, FolderGitIcon, Cancel01Icon, Task01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import TaskCategoriesModal from "@/src/components/TaskCategoriesModal";
import { input as inputCls } from "@/src/lib/crm-ui";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [formId, setFormId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [dropdownData, setDropdownData] = useState({ categories: [], companies: [], forms: [], appointments: [] });

  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState, sortField, sortOrder } = useHeader();

  useEffect(() => {
    resetState();
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [cats, comps, frms, appts] = await Promise.all([
        fetch("/api/task-categories").then(r => r.json()),
        fetch("/api/companies").then(r => r.json()),
        fetch("/api/forms").then(r => r.json()),
        fetch("/api/appointments").then(r => r.json()),
      ]);
      setDropdownData({ categories: cats, companies: comps, forms: frms, appointments: appts });
    } catch { console.error("Error loading dropdown data"); }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) setTasks(await res.json());
    } catch { console.error("Error loading tasks"); }
    finally { setLoading(false); }
  };

  const pendingTasks = useMemo(() => tasks.filter(t => !t.isCompleted), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.isCompleted), [tasks]);

  useEffect(() => {
    setConfig({
      title: "Tareas",
      titleBadge: !loading && pendingTasks.length > 0 ? `${pendingTasks.length} pendientes` : undefined,
      sortOptions: [
        { label: "Título", value: "title" },
        { label: "Fecha de creación", value: "createdAt" },
        { label: "Categoría", value: "category" },
      ],
      addButton: { label: "Nueva tarea", onClick: () => setIsModalOpen(true) },
    });
    return () => setConfig({});
  }, [loading, pendingTasks.length]);

  const displayed = useMemo(() => {
    let result = activeTab === "completed" ? completedTasks : pendingTasks;

    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal = "", bVal = "";
        if (sortField === "title") { aVal = a.title?.toLowerCase() || ""; bVal = b.title?.toLowerCase() || ""; }
        else if (sortField === "createdAt") { aVal = a.createdAt || ""; bVal = b.createdAt || ""; }
        else if (sortField === "category") { aVal = a.category?.name?.toLowerCase() || ""; bVal = b.category?.name?.toLowerCase() || ""; }
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [tasks, activeTab, sortField, sortOrder, pendingTasks, completedTasks]);

  const toggleTask = async (id: string, currentStatus: boolean) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isCompleted: !currentStatus } : t));
    try {
      await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isCompleted: !currentStatus }) });
    } catch { fetchTasks(); }
  };

  const handleDelete = async (task: any) => {
    const isConfirmed = await confirm({ title: "Eliminar tarea", description: `¿Eliminar la tarea '${task.title}'?`, confirmText: "Eliminar", cancelText: "Cancelar", variant: "danger" });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) { setTasks(prev => prev.filter(t => t.id !== task.id)); addToast("Tarea eliminada.", "success"); }
      else { const err = await res.json(); addToast(err.error || "Error al eliminar.", "error"); }
    } catch { addToast("Error de conexión.", "error"); }
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, categoryId: categoryId || null, companyId: companyId || null, formId: formId || null, appointmentId: appointmentId || null }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setTitle(""); setDescription(""); setCategoryId(""); setCompanyId(""); setFormId(""); setAppointmentId("");
        fetchTasks();
        addToast("Tarea creada.", "success");
      }
    } catch { console.error("Error creating task"); }
    finally { setSaving(false); }
  };

  return (
    <>
      <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-6 py-6 bg-surface-app">

          {/* Page header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm text-text-secondary">Organiza y da seguimiento a tus actividades pendientes.</p>
            </div>
            <button
              onClick={() => setIsCategoriesModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border-subtle hover:bg-surface-sidebar text-text-secondary text-sm font-semibold rounded-lg transition-colors"
            >
              <HugeiconsIcon icon={FolderGitIcon} size={15} />
              Categorías
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center border-b border-border-subtle mb-6 gap-1">
            {[
              { key: "pending", label: "Pendientes", count: pendingTasks.length },
              { key: "completed", label: "Completadas", count: completedTasks.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as "pending" | "completed")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab.key ? "border-accent-charcoal text-text-primary" : "border-transparent text-text-secondary hover:text-text-secondary"}`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? "bg-accent-charcoal text-white" : "bg-gray-100 text-text-secondary"}`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg border border-border-subtle">
              <div className="w-16 h-16 bg-surface-sidebar rounded-lg flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon icon={activeTab === "pending" ? Clock01Icon : Tick01Icon} size={28} color="#9ca3af" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1">
                {activeTab === "pending" ? "Sin tareas pendientes" : "Sin tareas completadas"}
              </h3>
              <p className="text-sm text-text-secondary">
                {activeTab === "pending" ? "¡Todo al día! Crea una nueva tarea." : "Completa algunas tareas para verlas aquí."}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-border-subtle overflow-hidden">
              <ul className="divide-y divide-gray-50">
                {displayed.map((task) => (
                  <li key={task.id} className="px-5 py-4 flex items-start gap-4 hover:bg-surface-sidebar/50 transition-colors group">
                    <button
                      onClick={() => toggleTask(task.id, task.isCompleted)}
                      className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.isCompleted ? "bg-green-500 border-green-500 text-white" : "border-border-subtle bg-white hover:bg-nav-hover"}`}
                    >
                      {task.isCompleted && <HugeiconsIcon icon={Tick01Icon} size={12} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-sm font-semibold ${task.isCompleted ? "text-text-secondary line-through" : "text-text-primary"}`}>{task.title}</span>
                        {task.category && (
                          <span className="text-[10px] font-bold uppercase tracking-wide py-0.5 px-2 rounded-full" style={{ backgroundColor: `${task.category.color}20`, color: task.category.color }}>
                            {task.category.name}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className={`text-xs leading-relaxed ${task.isCompleted ? "text-gray-300 line-through" : "text-text-secondary"}`}>{task.description}</p>
                      )}
                      {(task.company || task.form || task.appointment || task.contact) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {task.company && <span className="text-[11px] bg-gray-100 text-text-secondary px-2 py-0.5 rounded-full font-medium">🏢 {task.company.name}</span>}
                          {task.form && <span className="text-[11px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">📝 {task.form.name}</span>}
                          {task.appointment && <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">📅 {new Date(task.appointment.startTime).toLocaleDateString()}</span>}
                          {task.contact && <span className="text-[11px] text-text-secondary px-2 py-0.5 rounded-full">👤 {task.contact.firstName} {task.contact.lastName}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-medium text-text-secondary hidden group-hover:block">{new Date(task.createdAt).toLocaleDateString()}</span>
                      <button onClick={() => handleDelete(task)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <HugeiconsIcon icon={Delete01Icon} size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>

      {/* New Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <HugeiconsIcon icon={Task01Icon} size={16} color="#d97706" />
                </div>
                <h3 className="text-base font-bold text-text-primary">Nueva tarea</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-text-secondary hover:text-text-secondary rounded-lg transition-colors">
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">¿Qué necesita hacerse?</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="Ej. Llamar a Juan sobre el contrato" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Notas adicionales</label>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={inputCls + " resize-none"} placeholder="Detalles opcionales..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Categoría</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputCls}>
                  <option value="">— Sin categoría —</option>
                  {dropdownData.categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Empresa</label>
                  <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={inputCls}>
                    <option value="">— Ninguna —</option>
                    {dropdownData.companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Formulario</label>
                  <select value={formId} onChange={e => setFormId(e.target.value)} className={inputCls}>
                    <option value="">— Ninguno —</option>
                    {dropdownData.forms.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Cita vinculada</label>
                <select value={appointmentId} onChange={e => setAppointmentId(e.target.value)} className={inputCls}>
                  <option value="">— Ninguna —</option>
                  {dropdownData.appointments.map((a: any) => <option key={a.id} value={a.id}>{new Date(a.startTime).toLocaleString()} · {a.guestName}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2 border-t border-border-subtle mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg text-sm transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 font-semibold text-white bg-accent-charcoal hover:bg-black rounded-lg text-sm disabled:opacity-50 transition-colors">{saving ? "Guardando..." : "Crear tarea"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TaskCategoriesModal isOpen={isCategoriesModalOpen} onClose={() => setIsCategoriesModalOpen(false)} onCategoriesChange={fetchDropdownData} />
    </>
  );
}
