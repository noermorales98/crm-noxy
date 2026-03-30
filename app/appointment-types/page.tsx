"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import { Calendar, Plus, Trash2, Edit, Clock, Link as LinkIcon, XCircle } from "lucide-react";
import Link from "next/link";

export default function AppointmentTypesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
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
  const [bufferAfter, setBufferAfter] = useState("0");
  const [maxAdvanceDays, setMaxAdvanceDays] = useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    const [t, s] = await Promise.all([
      fetch("/api/appointment-types"),
      fetch("/api/availability")
    ]);
    if (t.ok) setTypes(await t.json());
    if (s.ok) setSchedules(await s.json());
    setIsLoading(false);
  };

  const openCreate = () => {
    setEditingType(null);
    setName(""); setDescription(""); setDuration("30"); setColor("#3B82F6");
    setLocation(""); setSlug(""); setScheduleId(schedules[0]?.id || "");
    setBufferAfter("0"); setMaxAdvanceDays("30");
    setIsModalOpen(true);
  };

  const openEdit = (type: any) => {
    setEditingType(type);
    setName(type.name); setDescription(type.description || ""); setDuration(String(type.duration));
    setColor(type.color); setLocation(type.location || ""); setSlug(type.slug);
    setScheduleId(type.scheduleId); setBufferAfter(String(type.bufferAfter));
    setMaxAdvanceDays(String(type.maxAdvanceDays));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleId) { alert("Debes crear una disponibilidad primero."); return; }
    setIsSubmitting(true);
    const body = { name, description, duration, color, location, slug, scheduleId, bufferAfter, maxAdvanceDays };
    const url = editingType ? `/api/appointment-types/${editingType.id}` : "/api/appointment-types";
    const method = editingType ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setIsModalOpen(false); fetchAll(); }
    else { const d = await res.json(); alert(d.error || "Error"); }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string, typeName: string) => {
    if (!confirm(`¿Eliminar '${typeName}'?`)) return;
    await fetch(`/api/appointment-types/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const copyLink = (typeSlug: string) => {
    const url = `${window.location.origin}/schedule/${typeSlug}`;
    navigator.clipboard.writeText(url);
    alert("Link copiado al portapapeles");
  };

  const autoSlug = (n: string) =>
    setSlug(n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));

  return (
    <div className="flex h-screen bg-background font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 py-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <Calendar className="text-gray-400" size={28} />
              Tipos de Cita
            </h1>
            <div className="flex gap-3">
              <Link
                href="/availability"
                className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Gestionar Disponibilidad
              </Link>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                <Plus size={18} /> Nuevo Tipo
              </button>
            </div>
          </div>

          {schedules.length === 0 && !isLoading && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 text-center">
              <p className="text-amber-800 font-medium">Primero necesitas crear un horario de disponibilidad.</p>
              <Link
                href="/availability"
                className="inline-block mt-3 text-sm font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 px-4 py-2 rounded-xl transition-colors"
              >
                Crear Disponibilidad
              </Link>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            </div>
          ) : types.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Sin tipos de cita</h3>
              <p className="text-gray-500 text-sm mb-4">Crea tu primer tipo de cita para que tus clientes puedan agendar.</p>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors"
              >
                <Plus size={16} /> Crear Tipo de Cita
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {types.map(type => (
                <div key={type.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: type.color }}></div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{type.name}</h3>
                        <span className="text-xs text-gray-500">/{type.slug}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${type.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {type.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  {type.description && (
                    <p className="text-sm text-gray-500 mb-4 flex-1 line-clamp-2">{type.description}</p>
                  )}

                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
                    <Clock size={14} />
                    <span>{type.duration} min</span>
                    <span className="mx-2 text-gray-200">·</span>
                    <span>{type._count?.appointments || 0} citas</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-gray-50">
                    <button
                      onClick={() => copyLink(type.slug)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Copiar link"
                    >
                      <LinkIcon size={16} />
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(type.id, type.name)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => openEdit(type)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Edit size={14} /> Editar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editingType ? "Editar Tipo de Cita" : "Nuevo Tipo de Cita"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="typeForm" onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Nombre *</label>
                  <input
                    required
                    value={name}
                    onChange={e => { setName(e.target.value); if (!editingType) autoSlug(e.target.value); }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm"
                    placeholder="Ej: Consulta inicial"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Descripción</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm resize-none"
                  ></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Duración (min) *</label>
                    <select
                      value={duration}
                      onChange={e => setDuration(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm"
                    >
                      {[15,20,30,45,60,90,120].map(d => <option key={d} value={d}>{d} min</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Color</label>
                    <input
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="w-full h-[38px] rounded-xl border border-gray-200 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">URL / Ubicación</label>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm"
                    placeholder="https://meet.google.com/... o dirección física"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Slug (URL) *</label>
                  <input
                    required
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono"
                    placeholder="consulta-inicial"
                  />
                  <p className="text-xs text-gray-400">/schedule/{slug || "tu-slug"}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Horario de disponibilidad *</label>
                  <select
                    required
                    value={scheduleId}
                    onChange={e => setScheduleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm"
                  >
                    <option value="">Seleccionar horario</option>
                    {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Buffer después (min)</label>
                    <input
                      type="number"
                      min="0"
                      value={bufferAfter}
                      onChange={e => setBufferAfter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Máx. días adelante</label>
                    <input
                      type="number"
                      min="1"
                      value={maxAdvanceDays}
                      onChange={e => setMaxAdvanceDays(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm"
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-gray-50 flex justify-end gap-3 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="typeForm"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50"
              >
                {isSubmitting ? "Guardando..." : editingType ? "Actualizar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
