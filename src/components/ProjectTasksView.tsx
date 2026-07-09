"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick01Icon, Clock01Icon, Delete01Icon, Add01Icon, Cancel01Icon, Task01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { input as inputCls } from "@/src/lib/crm-ui";
import DatePicker from "@/src/components/DatePicker";

interface ProjectTask {
  id: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  createdAt: string;
  dueDate: string | null;
}

export default function ProjectTasksView({ projectId }: { projectId: string }) {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?projectId=${projectId}`);
      if (res.ok) setTasks(await res.json());
    } catch { console.error("Error cargando tareas"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, [projectId]);

  const pendingTasks = tasks.filter((t) => !t.isCompleted);
  const completedTasks = tasks.filter((t) => t.isCompleted);
  const displayed = activeTab === "completed" ? completedTasks : pendingTasks;

  const toggleTask = async (id: string, currentStatus: boolean) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, isCompleted: !currentStatus } : t)));
    try {
      await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isCompleted: !currentStatus }) });
    } catch { fetchTasks(); }
  };

  const handleDelete = async (task: ProjectTask) => {
    const isConfirmed = await confirm({ title: "Eliminar tarea", description: `¿Eliminar la tarea '${task.title}'?`, confirmText: "Eliminar", cancelText: "Cancelar", variant: "danger" });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) { setTasks((prev) => prev.filter((t) => t.id !== task.id)); addToast("Tarea eliminada.", "success"); }
      else { addToast("Error al eliminar.", "error"); }
    } catch { addToast("Error de conexión.", "error"); }
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, dueDate: dueDate || null, projectId }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setTitle(""); setDescription(""); setDueDate("");
        fetchTasks();
        addToast("Tarea creada.", "success");
      }
    } catch { console.error("Error creando tarea"); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center border-b border-border-subtle gap-1 -mb-px">
          {[
            { key: "pending" as const, label: "Pendientes", count: pendingTasks.length },
            { key: "completed" as const, label: "Completadas", count: completedTasks.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab.key ? "border-accent-charcoal text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? "bg-accent-charcoal text-white" : "bg-gray-100 text-text-secondary"}`}>{tab.count}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent-charcoal text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-colors shrink-0"
        >
          <HugeiconsIcon icon={Add01Icon} size={14} />
          Nueva tarea
        </button>
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
            {activeTab === "pending" ? "Crea una tarea para este proyecto." : "Completa algunas tareas para verlas aquí."}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${task.isCompleted ? "text-text-secondary line-through" : "text-text-primary"}`}>{task.title}</span>
                    {task.dueDate && !task.isCompleted && (
                      <span className={`text-[10px] font-bold uppercase tracking-wide py-0.5 px-2 rounded-full ${new Date(task.dueDate) < new Date() ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                        📅 {new Date(task.dueDate).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className={`text-xs leading-relaxed mt-1 ${task.isCompleted ? "text-gray-300 line-through" : "text-text-secondary"}`}>{task.description}</p>
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
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="Ej. Revisar entregable" required autoFocus />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Notas adicionales</label>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={inputCls + " resize-none"} placeholder="Detalles opcionales..." />
              </div>
              <DatePicker label="Fecha de vencimiento" value={dueDate} onChange={setDueDate} placeholder="Sin fecha" />
              <div className="flex gap-3 pt-2 border-t border-border-subtle mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg text-sm transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 font-semibold text-white bg-accent-charcoal hover:bg-black rounded-lg text-sm disabled:opacity-50 transition-colors">{saving ? "Guardando..." : "Crear tarea"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
