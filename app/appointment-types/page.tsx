"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete01Icon, Clock01Icon, LinkSquare01Icon, Cancel01Icon, Note01Icon, Building04Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import Link from "next/link";
import { input as inputCls } from "@/src/lib/crm-ui";
import { Chip, DataList, EmptyState, Enter, ErrorState, PageHeader, Skeleton, useDialog } from "@/src/components/ui";

const primaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary disabled:opacity-50 lg:min-h-10";
const secondaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface-elevated px-4 text-sm font-semibold text-text-primary hover:bg-surface-sidebar lg:min-h-10";
type TypeRow = {
  id: string;
  name: string;
  slug: string;
  color: string;
  isActive: boolean;
  duration: number;
  description?: string | null;
  company?: { name: string } | null;
  _count?: { appointments?: number; forms?: number };
};

const iconAction =
  "crm-press flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-surface-sidebar hover:text-text-primary lg:size-9";

export default function AppointmentTypesPage() {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState, sortField, sortOrder } = useHeader();
  const [types, setTypes] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [schedulesError, setSchedulesError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [color, setColor] = useState("#3545D6");
  const [location, setLocation] = useState("");
  const [slug, setSlug] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [bufferAfter, setBufferAfter] = useState("0");
  const [maxAdvanceDays, setMaxAdvanceDays] = useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, isModalOpen, () => setIsModalOpen(false));

  useEffect(() => {
    resetState();
  }, []);

  useEffect(() => {
    setConfig({
      title: "Tipos de cita",
      titleBadge: isLoading ? undefined : types.length,
      sortOptions: [
        { label: "Nombre", value: "name" },
        { label: "Duración", value: "duration" },
        { label: "Citas", value: "appointments" },
      ],
      pageHeader: true,
    });
    return () => setConfig({});
  }, [schedules.length, isLoading, types.length]); // Re-run if schedules change but don't reset state

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const [t, s, c] = await Promise.all([
        fetch("/api/appointment-types"),
        fetch("/api/availability"),
        fetch("/api/companies"),
      ]);
      if (t.ok) setTypes(await t.json());
      else {
        setLoadError(true);
        // Con filas ya cargadas, el fallo no las sustituye: se avisa con un toast.
        if (types.length > 0) addToast("Error al cargar datos", "error");
      }
      if (s.ok) {
        setSchedules(await s.json());
        setSchedulesError(false);
      } else setSchedulesError(true);
      if (c.ok) {
        const cData = await c.json();
        setCompanies(Array.isArray(cData) ? cData : (cData.companies ?? []));
      }
    } catch (error) {
      console.error("Error fetching appointment types:", error);
      setLoadError(true);
      setSchedulesError(true);
      if (types.length > 0) addToast("Error al cargar datos", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingType(null);
    setName(""); setDescription(""); setDuration("30"); setColor("#3545D6");
    setLocation(""); setSlug(""); setScheduleId(schedules[0]?.id || "");
    setCompanyId(""); setBufferAfter("0"); setMaxAdvanceDays("30");
    setIsModalOpen(true);
  };

  const openEdit = (type: any) => {
    setEditingType(type);
    setName(type.name); setDescription(type.description || ""); setDuration(String(type.duration));
    setColor(type.color); setLocation(type.location || ""); setSlug(type.slug);
    setScheduleId(type.scheduleId); setCompanyId(type.companyId || "");
    setBufferAfter(String(type.bufferAfter)); setMaxAdvanceDays(String(type.maxAdvanceDays));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleId) { addToast("Debes crear una disponibilidad primero.", "warning"); return; }
    setIsSubmitting(true);
    const body = { name, description, duration, color, location, slug, scheduleId, companyId: companyId || null, bufferAfter, maxAdvanceDays };
    const url = editingType ? `/api/appointment-types/${editingType.id}` : "/api/appointment-types";
    const method = editingType ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setIsModalOpen(false); fetchAll(); }
    else { const d = await res.json(); addToast(d.error || "Error", "error"); }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string, typeName: string) => {
    const ok = await confirm({
      title: "Eliminar tipo de cita",
      description: `¿Eliminar el tipo de cita '${typeName}'?`,
      confirmText: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    await fetch(`/api/appointment-types/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const copyLink = (typeSlug: string) => {
    const url = `${window.location.origin}/schedule/${typeSlug}`;
    navigator.clipboard.writeText(url);
    addToast("Link copiado al portapapeles", "success");
  };

  const autoSlug = (n: string) =>
    setSlug(n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));

  const displayed = useMemo(() => {
    let result = [...types];
    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal: any, bVal: any;
        if (sortField === "name") { aVal = a.name?.toLowerCase() || ""; bVal = b.name?.toLowerCase() || ""; }
        else if (sortField === "duration") { aVal = a.duration || 0; bVal = b.duration || 0; }
        else if (sortField === "appointments") { aVal = a._count?.appointments || 0; bVal = b._count?.appointments || 0; }
        else { aVal = ""; bVal = ""; }
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [types, sortField, sortOrder]);

  const renderType = (type: TypeRow) => (
    <div className="flex w-full min-w-0 flex-col gap-3 py-2 lg:flex-row lg:items-center">
      <button type="button" onClick={() => openEdit(type)} className="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-control text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary">
        {/* Color del tipo de cita: dato que guarda el usuario. */}
        <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ backgroundColor: type.color }} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-text-primary">{type.name}</span>
            <Chip tone={type.isActive ? "done" : "neutral"}>{type.isActive ? "Activo" : "Inactivo"}</Chip>
          </span>
          <span className="block truncate text-xs text-text-secondary">/schedule/{type.slug}</span>
          {type.description && <span className="mt-0.5 block truncate text-sm text-text-secondary">{type.description}</span>}
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
            <span className="flex items-center gap-1"><HugeiconsIcon icon={Clock01Icon} size={12} /> {type.duration} min</span>
            <span className="tabular-nums">{type._count?.appointments || 0} citas</span>
            {(type._count?.forms ?? 0) > 0 && (
              <span className="flex items-center gap-1 font-medium text-action-primary"><HugeiconsIcon icon={Note01Icon} size={12} /> Con formulario</span>
            )}
            {type.company && (
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={Building04Icon} size={12} /> {type.company.name}
                <HugeiconsIcon icon={Mail01Icon} size={12} className="text-success" aria-label="Correo de confirmación" />
              </span>
            )}
          </span>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={() => copyLink(type.slug)} className={iconAction} aria-label={`Copiar link de ${type.name}`} title="Copiar link">
          <HugeiconsIcon icon={LinkSquare01Icon} size={16} />
        </button>
        <button
          type="button"
          onClick={() => handleDelete(type.id, type.name)}
          className={`${iconAction} hover:bg-danger-soft hover:text-danger`}
          aria-label={`Eliminar ${type.name}`}
          title="Eliminar"
        >
          <HugeiconsIcon icon={Delete01Icon} size={16} />
        </button>
      </div>
    </div>
  );

  const label = "text-sm font-semibold text-text-primary";

  return (
    <>
      <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        <Enter index={0}>
          <PageHeader
            title="Tipos de cita"
            subtitle="Define los tipos de reunión que tus clientes pueden agendar."
            actions={
              <>
                <Link href="/availability" className={secondaryAction}>Gestionar disponibilidad</Link>
                <button type="button" onClick={openCreate} disabled={schedules.length === 0} className={primaryAction}>
                  <HugeiconsIcon icon={Add01Icon} size={16} />
                  Nuevo tipo
                </button>
              </>
            }
          />
        </Enter>

        {schedules.length === 0 && !isLoading && !loadError && !schedulesError && (
          <div className="mb-4 flex flex-col items-start gap-3 rounded-surface border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-amber-900">Primero necesitas crear un horario de disponibilidad.</p>
            <Link href="/availability" className="inline-flex min-h-11 items-center rounded-control bg-amber-100 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-200 lg:min-h-9">
              Crear disponibilidad
            </Link>
          </div>
        )}

        <Enter index={1}>
          <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
            {isLoading && types.length === 0 ? (
              <Skeleton shape="rows" count={4} label="Cargando tipos de cita" />
            ) : loadError && types.length === 0 ? (
              <ErrorState title="No se pudieron cargar los tipos de cita" onRetry={fetchAll} />
            ) : (
              <DataList
                label="Tipos de cita"
                rows={displayed}
                getKey={(t) => t.id}
                renderRow={renderType}
                empty={<EmptyState title="Sin tipos de cita" body="Crea tu primer tipo de cita para que tus clientes puedan agendar." />}
              />
            )}
          </section>
        </Enter>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="type-modal-title" className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-surface bg-surface-elevated shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 id="type-modal-title" className="text-base font-semibold text-text-primary">
                {editingType ? "Editar tipo de cita" : "Nuevo tipo de cita"}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} aria-label="Cerrar" className={iconAction}>
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form id="typeForm" onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="type-name" className={label}>Nombre *</label>
                  <input
                    id="type-name"
                    required
                    value={name}
                    onChange={e => { setName(e.target.value); if (!editingType) autoSlug(e.target.value); }}
                    className={inputCls}
                    placeholder="Ej: Consulta inicial"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="type-description" className={label}>Descripción</label>
                  <textarea id="type-description" rows={2} value={description} onChange={e => setDescription(e.target.value)} className={`${inputCls} resize-none`} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="type-duration" className={label}>Duración (min) *</label>
                    <select id="type-duration" value={duration} onChange={e => setDuration(e.target.value)} className={inputCls}>
                      {[15, 20, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="type-color" className={label}>Color</label>
                    <input id="type-color" type="color" value={color} onChange={e => setColor(e.target.value)} className="h-11 w-full cursor-pointer rounded-control border border-line" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="type-location" className={label}>URL / Ubicación</label>
                  <input id="type-location" value={location} onChange={e => setLocation(e.target.value)} className={inputCls} placeholder="https://meet.google.com/... o dirección física" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="type-slug" className={label}>Slug (URL) *</label>
                  <input id="type-slug" required value={slug} onChange={e => setSlug(e.target.value)} className={`${inputCls} font-mono`} placeholder="consulta-inicial" />
                  <p className="text-xs text-text-secondary">/schedule/{slug || "tu-slug"}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="type-schedule" className={label}>Horario de disponibilidad *</label>
                  <select id="type-schedule" required value={scheduleId} onChange={e => setScheduleId(e.target.value)} className={inputCls}>
                    <option value="">Seleccionar horario</option>
                    {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="type-company" className={label}>Empresa (para envío de correo)</label>
                  <select id="type-company" value={companyId} onChange={e => setCompanyId(e.target.value)} className={inputCls}>
                    <option value="">Sin empresa asignada</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.smtpHost ? " (SMTP configurado)" : " (sin SMTP)"}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-text-secondary">El correo de confirmación se enviará usando el SMTP de esta empresa.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="type-buffer" className={label}>Buffer después (min)</label>
                    <input id="type-buffer" type="number" min="0" value={bufferAfter} onChange={e => setBufferAfter(e.target.value)} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="type-advance" className={label}>Máx. días adelante</label>
                    <input id="type-advance" type="number" min="1" value={maxAdvanceDays} onChange={e => setMaxAdvanceDays(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </form>
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className={secondaryAction}>Cancelar</button>
              <button type="submit" form="typeForm" disabled={isSubmitting} className={primaryAction}>
                {isSubmitting ? "Guardando..." : editingType ? "Actualizar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
