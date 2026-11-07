"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick01Icon, Delete01Icon, FolderKanbanIcon, Cancel01Icon, Building04Icon, BrowserIcon, Calendar01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import { input as inputCls } from "@/src/lib/crm-ui";
import DatePicker from "@/src/components/DatePicker";
import { Chip, DataList, EmptyState, Enter, ErrorState, FilterBar, PageHeader, Segmented, Skeleton, useDialog } from "@/src/components/ui";

type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  isCompleted: boolean;
  dueDate?: string | null;
  createdAt: string;
  project?: { id: string; name: string } | null;
  company?: { name: string } | null;
  form?: { name: string } | null;
  appointment?: { startTime: string } | null;
  contact?: { firstName: string; lastName?: string | null } | null;
};

function TasksContent() {
  const searchParams = useSearchParams();
  const filterProjectId = searchParams.get("projectId");

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [formId, setFormId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [dropdownData, setDropdownData] = useState({ projects: [], companies: [], forms: [], appointments: [] });

  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState, sortField, sortOrder } = useHeader();

  const taskDialogRef = useRef<HTMLDivElement>(null);
  useDialog(taskDialogRef, isModalOpen, () => setIsModalOpen(false));

  useEffect(() => {
    resetState();
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [projs, comps, frms, appts] = await Promise.all([
        fetch("/api/projects").then(r => r.json()),
        fetch("/api/companies").then(r => r.json()),
        fetch("/api/forms").then(r => r.json()),
        fetch("/api/appointments").then(r => r.json()),
      ]);
      setDropdownData({ projects: projs, companies: comps, forms: frms, appointments: appts });
    } catch { console.error("Error loading dropdown data"); }
  };

  const fetchTasks = async () => {
    setLoadError(false);
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) setTasks(await res.json());
      else setLoadError(true);
    } catch { console.error("Error loading tasks"); setLoadError(true); }
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
        { label: "Proyecto", value: "project" },
      ],
      pageHeader: true,
    });
    return () => setConfig({});
  }, [loading, pendingTasks.length]);

  const displayed = useMemo(() => {
    let result = activeTab === "completed" ? completedTasks : pendingTasks;

    if (filterProjectId) {
      result = result.filter((t) => t.project?.id === filterProjectId);
    }

    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal = "", bVal = "";
        if (sortField === "title") { aVal = a.title?.toLowerCase() || ""; bVal = b.title?.toLowerCase() || ""; }
        else if (sortField === "createdAt") { aVal = a.createdAt || ""; bVal = b.createdAt || ""; }
        else if (sortField === "project") { aVal = a.project?.name?.toLowerCase() || ""; bVal = b.project?.name?.toLowerCase() || ""; }
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [tasks, activeTab, sortField, sortOrder, pendingTasks, completedTasks, filterProjectId]);

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
        body: JSON.stringify({ title, description, dueDate: dueDate || null, projectId: projectId || null, companyId: companyId || null, formId: formId || null, appointmentId: appointmentId || null }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setTitle(""); setDescription(""); setDueDate(""); setProjectId(""); setCompanyId(""); setFormId(""); setAppointmentId("");
        fetchTasks();
        addToast("Tarea creada.", "success");
      }
    } catch { console.error("Error creating task"); }
    finally { setSaving(false); }
  };

  return (
    <>
      <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        <Enter index={0}>
          <PageHeader
            title="Tareas"
            subtitle={loading ? "Cargando tareas…" : `${pendingTasks.length} pendientes · ${completedTasks.length} completadas`}
            actions={
              <>
                <Link
                  href="/projects"
                  className="crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface-elevated px-4 text-sm font-semibold text-text-primary hover:bg-surface-sidebar lg:min-h-10"
                >
                  <HugeiconsIcon icon={FolderKanbanIcon} size={16} />
                  Proyectos
                </Link>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="crm-press inline-flex min-h-11 items-center justify-center rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary lg:min-h-10"
                >
                  Nueva tarea
                </button>
              </>
            }
          />
        </Enter>

        <Enter index={1}>
          <FilterBar
            segments={
              <Segmented
                label="Estado de las tareas"
                value={activeTab}
                onChange={(v) => setActiveTab(v as "pending" | "completed")}
                options={[
                  { value: "pending", label: `Pendientes · ${pendingTasks.length}` },
                  { value: "completed", label: `Completadas · ${completedTasks.length}` },
                ]}
              />
            }
            actions={
              filterProjectId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Chip>{`Proyecto: ${(dropdownData.projects.find((p: { id: string }) => p.id === filterProjectId) as { name?: string } | undefined)?.name ?? "seleccionado"}`}</Chip>
                  <Link href="/tasks" className="inline-flex min-h-11 items-center text-sm font-semibold text-action-primary hover:underline lg:min-h-8">
                    Quitar filtro
                  </Link>
                </div>
              ) : undefined
            }
          />
        </Enter>

        <Enter index={2}>
          {loading ? (
            <div className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
              <Skeleton shape="rows" count={6} label="Cargando tareas" />
            </div>
          ) : loadError && tasks.length === 0 ? (
            <div className="rounded-surface border border-line bg-surface-elevated">
              <ErrorState title="No se pudieron cargar las tareas" onRetry={() => { setLoading(true); fetchTasks(); }} />
            </div>
          ) : (
            <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
              <DataList
                label={activeTab === "pending" ? "Tareas pendientes" : "Tareas completadas"}
                rows={displayed as TaskRow[]}
                getKey={(task) => task.id}
                empty={
                  activeTab === "pending" ? (
                    <EmptyState title="Sin tareas pendientes" body="Todo al día. Crea una nueva tarea cuando la necesites." />
                  ) : (
                    <EmptyState title="Sin tareas completadas" body="Completa algunas tareas para verlas aquí." />
                  )
                }
                renderRow={(task) => {
                  const overdue = !!task.dueDate && !task.isCompleted && new Date(task.dueDate) < new Date();
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id, task.isCompleted)}
                        aria-label={task.isCompleted ? `Marcar «${task.title}» como pendiente` : `Completar «${task.title}»`}
                        className="crm-press -ml-2 flex size-11 shrink-0 items-center justify-center self-start rounded-full"
                      >
                        <span
                          className={`flex size-6 items-center justify-center rounded-full border-2 ${
                            task.isCompleted ? "border-success bg-success text-white" : "border-line bg-surface-elevated hover:border-action-primary"
                          }`}
                        >
                          {task.isCompleted && <HugeiconsIcon icon={Tick01Icon} size={12} />}
                        </span>
                      </button>
                      <div className="min-w-0 flex-1 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`min-w-0 font-semibold ${task.isCompleted ? "text-text-secondary line-through" : "text-text-primary"}`}
                          >
                            {task.title}
                          </span>
                          {task.project && <Chip>{task.project.name}</Chip>}
                          {task.dueDate && !task.isCompleted && (
                            <Chip tone={overdue ? "late" : "neutral"}>
                              {`${overdue ? "Vencida · " : ""}${new Date(task.dueDate).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}`}
                            </Chip>
                          )}
                        </div>
                        {task.description && (
                          <p className={`mt-1 text-sm ${task.isCompleted ? "text-text-secondary line-through" : "text-text-secondary"}`}>{task.description}</p>
                        )}
                        {(task.company || task.form || task.appointment || task.contact) && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                            {task.company && (
                              <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={Building04Icon} size={14} />{task.company.name}</span>
                            )}
                            {task.form && (
                              <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={BrowserIcon} size={14} />{task.form.name}</span>
                            )}
                            {task.appointment && (
                              <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={Calendar01Icon} size={14} />{new Date(task.appointment.startTime).toLocaleDateString("es-MX")}</span>
                            )}
                            {task.contact && (
                              <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={UserIcon} size={14} />{task.contact.firstName} {task.contact.lastName}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2 self-start">
                        <span className="hidden text-xs tabular-nums text-text-secondary lg:inline">{new Date(task.createdAt).toLocaleDateString("es-MX")}</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(task)}
                          aria-label={`Eliminar «${task.title}»`}
                          className="crm-press flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-danger-soft hover:text-danger lg:size-9"
                        >
                          <HugeiconsIcon icon={Delete01Icon} size={16} />
                        </button>
                      </div>
                    </>
                  );
                }}
              />
            </section>
          )}
        </Enter>
      </main>

      {/* New Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4">
          <div ref={taskDialogRef} role="dialog" aria-modal="true" aria-labelledby="task-modal-title" className="w-full max-w-md overflow-hidden rounded-surface bg-surface-elevated shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-line">
              <div className="flex items-center gap-2.5">
                <h3 id="task-modal-title" className="text-base font-semibold text-text-primary">Nueva tarea</h3>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar hover:text-text-primary lg:size-9">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Proyecto</label>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)} className={inputCls}>
                    <option value="">Sin proyecto</option>
                    {dropdownData.projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <DatePicker label="Fecha de vencimiento" value={dueDate} onChange={setDueDate} placeholder="Sin fecha" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Empresa</label>
                  <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={inputCls}>
                    <option value="">Ninguna</option>
                    {dropdownData.companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Formulario</label>
                  <select value={formId} onChange={e => setFormId(e.target.value)} className={inputCls}>
                    <option value="">Ninguno</option>
                    {dropdownData.forms.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Cita vinculada</label>
                <select value={appointmentId} onChange={e => setAppointmentId(e.target.value)} className={inputCls}>
                  <option value="">Ninguna</option>
                  {dropdownData.appointments.map((a: any) => <option key={a.id} value={a.id}>{new Date(a.startTime).toLocaleString()} · {a.guestName}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2 border-t border-line mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="inline-flex min-h-11 items-center justify-center lg:min-h-10 flex-1 py-2.5 font-semibold text-text-secondary bg-surface-sidebar hover:bg-nav-active rounded-lg text-sm transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center lg:min-h-10 flex-1 py-2.5 font-semibold text-action-primary-foreground bg-action-primary hover:bg-action-secondary rounded-lg text-sm disabled:opacity-50 transition-colors">{saving ? "Guardando..." : "Crear tarea"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="px-4 py-5 sm:px-6 sm:py-6"><div className="overflow-hidden rounded-surface border border-line bg-surface-elevated"><Skeleton shape="rows" count={6} label="Cargando tareas" /></div></div>}>
      <TasksContent />
    </Suspense>
  );
}
