"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick01Icon, Clock01Icon, Delete01Icon, FolderGitIcon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import TaskCategoriesModal from "@/src/components/TaskCategoriesModal";

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
  const { setConfig, resetState, searchQuery, sortField, sortOrder } = useHeader();

  useEffect(() => {
    resetState();
    setConfig({
      searchPlaceholder: "Buscar tarea...",
      sortOptions: [
        { label: "Título", value: "title" },
        { label: "Fecha de creación", value: "createdAt" },
        { label: "Categoría", value: "category" },
      ],
      addButton: { label: "Nueva tarea", onClick: () => setIsModalOpen(true) },
    });
    return () => setConfig({});
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [cats, comps, frms, appts] = await Promise.all([
        fetch("/api/task-categories").then(res => res.json()),
        fetch("/api/companies").then(res => res.json()),
        fetch("/api/forms").then(res => res.json()),
        fetch("/api/appointments").then(res => res.json()),
      ]);
      setDropdownData({ categories: cats, companies: comps, forms: frms, appointments: appts });
    } catch (e) { console.error(e); }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) setTasks(await res.json());
    } catch (error) { console.error("Failed to load tasks", error); }
    finally { setLoading(false); }
  };

  const displayed = useMemo(() => {
    let result = tasks.filter(t => activeTab === "completed" ? t.isCompleted : !t.isCompleted);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.name?.toLowerCase().includes(q)
      );
    }

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
  }, [tasks, activeTab, searchQuery, sortField, sortOrder]);

  const toggleTask = async (id: string, currentStatus: boolean) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isCompleted: !currentStatus } : t));
    try {
      await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isCompleted: !currentStatus }) });
    } catch (e) { console.error(e); fetchTasks(); }
  };

  const handleDelete = async (task: any) => {
    const isConfirmed = await confirm({ title: "Eliminar tarea", description: `¿Estás seguro de que quieres eliminar la tarea '${task.title}'?`, confirmText: "Eliminar", cancelText: "Cancelar", variant: "danger" });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) { setTasks((prev) => prev.filter(t => t.id !== task.id)); addToast("Tarea eliminada exitosamente.", "success"); }
      else { const err = await res.json(); addToast(err.error || "Error al eliminar.", "error"); }
    } catch (e) { addToast("Error de conexión al eliminar.", "error"); }
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
      }
    } catch (error) { console.error("Failed to create task", error); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex h-screen bg-background font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tasks & To-Dos</h1>
            <button
              onClick={() => setIsCategoriesModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors"
            >
              <HugeiconsIcon icon={FolderGitIcon} size={16} /> Categorías
            </button>
          </div>

          <div className="flex border-b border-gray-100 mb-6 font-medium">
            <button onClick={() => setActiveTab("pending")} className={`px-4 py-3 border-b-2 text-sm transition-colors ${activeTab === "pending" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>Pendientes</button>
            <button onClick={() => setActiveTab("completed")} className={`px-4 py-3 border-b-2 text-sm transition-colors ${activeTab === "completed" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>Completadas</button>
          </div>

          {loading ? (
            <div className="text-gray-500">Cargando tareas...</div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <HugeiconsIcon icon={Clock01Icon} size={48} color="#d1d5db" className="mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">{searchQuery ? "No se encontraron tareas." : "Sin tareas pendientes"}</h3>
              {!searchQuery && <p className="text-gray-500 text-sm">¡Todo listo! Disfruta tu día.</p>}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <ul className="divide-y divide-gray-50">
                {displayed.map((task) => (
                  <li key={task.id} className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors group">
                    <button
                      onClick={() => toggleTask(task.id, task.isCompleted)}
                      className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}
                    >
                      {task.isCompleted && <HugeiconsIcon icon={Tick01Icon} size={14} />}
                    </button>
                    <div className="flex-1 flex flex-col gap-1">
                      <span className={`text-sm font-medium ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</span>
                      {task.category && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wide py-0.5 px-2 rounded w-max" style={{ backgroundColor: `${task.category.color}20`, color: task.category.color }}>
                          {task.category.name}
                        </span>
                      )}
                      {task.description && <p className={`text-sm ${task.isCompleted ? 'text-gray-300 line-through' : 'text-gray-500'}`}>{task.description}</p>}
                      <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                        {task.company && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">🏢 {task.company.name}</span>}
                        {task.form && <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded">📝 {task.form.name}</span>}
                        {task.appointment && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">📅 {new Date(task.appointment.startTime).toLocaleString()}</span>}
                        {task.contact && <span className="text-gray-400">👤 {task.contact.firstName} {task.contact.lastName}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="shrink-0 text-xs font-semibold text-gray-400 px-2 py-1 bg-gray-50 rounded">{new Date(task.createdAt).toLocaleDateString()}</div>
                      <button onClick={() => handleDelete(task)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar tarea"><HugeiconsIcon icon={Delete01Icon} size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Nueva tarea</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">¿Qué necesita ser hecho?</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm" placeholder="e.g. Call John about the contract" required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Detalles adicionales</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm resize-none" placeholder="Optional notes..." />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Categoría</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 text-sm">
                  <option value="">-- Sin categoría --</option>
                  {dropdownData.categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">Empresa</label>
                  <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 text-sm">
                    <option value="">-- Ninguna --</option>
                    {dropdownData.companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">Formulario</label>
                  <select value={formId} onChange={e => setFormId(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 text-sm">
                    <option value="">-- Ninguno --</option>
                    {dropdownData.forms.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2 mb-2">
                <label className="text-sm font-semibold text-gray-700">Cita / Calendario</label>
                <select value={appointmentId} onChange={e => setAppointmentId(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 text-sm">
                  <option value="">-- Ninguna --</option>
                  {dropdownData.appointments.map((a: any) => <option key={a.id} value={a.id}>{new Date(a.startTime).toLocaleString()} - {a.guestName}</option>)}
                </select>
              </div>
              <div className="mt-2 flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 px-4 font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 px-4 font-semibold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors text-sm disabled:opacity-50">{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TaskCategoriesModal isOpen={isCategoriesModalOpen} onClose={() => setIsCategoriesModalOpen(false)} onCategoriesChange={fetchDropdownData} />
    </div>
  );
}
