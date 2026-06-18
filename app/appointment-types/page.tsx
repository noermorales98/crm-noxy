"use client";

import { useState, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon, Add01Icon, Delete01Icon, PencilEdit01Icon, Clock01Icon, LinkSquare01Icon, Cancel01Icon, Note01Icon, Building04Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useHeader } from "@/src/context/HeaderContext";
import Link from "next/link";

export default function AppointmentTypesPage() {
  const { addToast, showConfirm } = useToast();
  const { setConfig, resetState, searchQuery, sortField, sortOrder } = useHeader();
  const [types, setTypes] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [color, setColor] = useState("#3B82F6");
  const [location, setLocation] = useState("");
  const [slug, setSlug] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [bufferAfter, setBufferAfter] = useState("0");
  const [maxAdvanceDays, setMaxAdvanceDays] = useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    resetState();
  }, []);

  useEffect(() => {
    setConfig({
      searchPlaceholder: "Buscar tipo de cita...",
      sortOptions: [
        { label: "Nombre", value: "name" },
        { label: "Duración", value: "duration" },
        { label: "Citas", value: "appointments" },
      ],
      addButton: { label: "Nuevo tipo", onClick: openCreate },
    });
    return () => setConfig({});
  }, [schedules.length]); // Re-run if schedules change but don't reset state

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [t, s, c] = await Promise.all([
        fetch("/api/appointment-types"),
        fetch("/api/availability"),
        fetch("/api/companies"),
      ]);
      if (t.ok) setTypes(await t.json());
      if (s.ok) setSchedules(await s.json());
      if (c.ok) {
        const cData = await c.json();
        setCompanies(Array.isArray(cData) ? cData : (cData.companies ?? []));
      }
    } catch (error) {
      console.error("Error fetching appointment types:", error);
      addToast("Error al cargar datos", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingType(null);
    setName(""); setDescription(""); setDuration("30"); setColor("#3B82F6");
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
    const ok = await showConfirm(`¿Eliminar el tipo de cita '${typeName}'?`, {
      title: "Eliminar tipo de cita",
      confirmLabel: "Eliminar",
      isDanger: true,
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
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.name?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
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
  }, [types, searchQuery, sortField, sortOrder]);

  return (
    <>
      <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-6 py-6 bg-surface-app">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-text-primary">Tipos de cita</h1>
                {!isLoading && <span className="px-2 py-0.5 bg-gray-100 text-text-secondary text-xs font-semibold rounded-full">{types.length}</span>}
              </div>
              <p className="text-sm text-text-secondary">Define los tipos de reunión que tus clientes pueden agendar.</p>
            </div>
            <Link href="/availability" className="flex items-center gap-2 border border-border-subtle bg-white hover:bg-surface-sidebar text-text-secondary px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
              Gestionar disponibilidad
            </Link>
          </div>

          {schedules.length === 0 && !isLoading && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6 text-center">
              <p className="text-amber-800 font-medium">Primero necesitas crear un horario de disponibilidad.</p>
              <Link
                href="/availability"
                className="inline-block mt-3 text-sm font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 px-4 py-2 rounded-lg transition-colors"
              >
                Crear Disponibilidad
              </Link>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin"></div>
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg border border-border-subtle">
              <div className="w-16 h-16 bg-surface-sidebar rounded-lg flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon icon={Calendar01Icon} size={28} color="#9ca3af" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1">{searchQuery ? "Sin resultados" : "Sin tipos de cita"}</h3>
              <p className="text-sm text-text-secondary">{searchQuery ? "Prueba con otro término de búsqueda." : "Crea tu primer tipo de cita para que tus clientes puedan agendar."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayed.map(type => (
                <div key={type.id} className="bg-white border border-border-subtle rounded-lg p-6 transition-shadow flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: type.color }}></div>
                      <div>
                        <h3 className="text-lg font-bold text-text-primary">{type.name}</h3>
                        <span className="text-xs text-text-secondary">/{type.slug}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${type.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-text-secondary"}`}>
                      {type.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  {type.description && (
                    <p className="text-sm text-text-secondary mb-4 flex-1 line-clamp-2">{type.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-text-secondary mb-4">
                    <HugeiconsIcon icon={Clock01Icon} size={14} />
                    <span>{type.duration} min</span>
                    <span className="mx-1 text-gray-200">·</span>
                    <span>{type._count?.appointments || 0} citas</span>
                    {type._count?.forms > 0 && (
                      <>
                        <span className="mx-1 text-gray-200">·</span>
                        <div className="flex items-center gap-1 text-blue-600 font-medium">
                          <HugeiconsIcon icon={Note01Icon} size={14} />
                          <span>Con Formulario</span>
                        </div>
                      </>
                    )}
                    {type.company && (
                      <div className="w-full flex items-center gap-1 mt-1 text-xs text-text-secondary">
                        <HugeiconsIcon icon={Building04Icon} size={12} />
                        <span>{type.company.name}</span>
                        <HugeiconsIcon icon={Mail01Icon} size={12} className="ml-1 text-green-500" color="#22c55e" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-border-subtle">
                    <button
                      onClick={() => copyLink(type.slug)}
                      className="p-2 text-text-secondary hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Copiar link"
                    >
                      <HugeiconsIcon icon={LinkSquare01Icon} size={16} />
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(type.id, type.name)}
                        className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <HugeiconsIcon icon={Delete01Icon} size={16} />
                      </button>
                      <button
                        onClick={() => openEdit(type)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-primary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors"
                      >
                        <HugeiconsIcon icon={PencilEdit01Icon} size={14} /> Editar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-accent-charcoal/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">
                {editingType ? "Editar Tipo de Cita" : "Nuevo Tipo de Cita"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-text-secondary">
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="typeForm" onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Nombre *</label>
                  <input
                    required
                    value={name}
                    onChange={e => { setName(e.target.value); if (!editingType) autoSlug(e.target.value); }}
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white text-sm"
                    placeholder="Ej: Consulta inicial"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Descripción</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white text-sm resize-none"
                  ></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">Duración (min) *</label>
                    <select
                      value={duration}
                      onChange={e => setDuration(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                    >
                      {[15, 20, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">Color</label>
                    <input
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="w-full h-[38px] rounded-lg border border-border-subtle cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">URL / Ubicación</label>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                    placeholder="https://meet.google.com/... o dirección física"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Slug (URL) *</label>
                  <input
                    required
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm font-mono"
                    placeholder="consulta-inicial"
                  />
                  <p className="text-xs text-text-secondary">/schedule/{slug || "tu-slug"}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Horario de disponibilidad *</label>
                  <select
                    required
                    value={scheduleId}
                    onChange={e => setScheduleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                  >
                    <option value="">Seleccionar horario</option>
                    {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Empresa (para envío de correo)</label>
                  <select
                    value={companyId}
                    onChange={e => setCompanyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                  >
                    <option value="">Sin empresa asignada</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.smtpHost ? " ✓ SMTP configurado" : " (sin SMTP)"}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-text-secondary">El correo de confirmación se enviará usando el SMTP de esta empresa.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">Buffer después (min)</label>
                    <input
                      type="number"
                      min="0"
                      value={bufferAfter}
                      onChange={e => setBufferAfter(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">Máx. días adelante</label>
                    <input
                      type="number"
                      min="1"
                      value={maxAdvanceDays}
                      onChange={e => setMaxAdvanceDays(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-surface-sidebar text-sm"
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-border-subtle flex justify-end gap-3 bg-surface-sidebar/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-primary hover:bg-nav-hover"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="typeForm"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent-charcoal hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? "Guardando..." : editingType ? "Actualizar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
