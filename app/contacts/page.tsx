"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/src/components/Header";
import Sidebar from "@/src/components/Sidebar";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, PencilEdit01Icon, Cancel01Icon, UserMultipleIcon, GridViewIcon, ListViewIcon } from "@hugeicons/core-free-icons";

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all text-sm";

const avatarColors = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
];

function Avatar({ name }: { name: string }) {
  const color = avatarColors[name.charCodeAt(0) % avatarColors.length];
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${color}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function ContactsContent() {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState, searchQuery, sortField, sortOrder } = useHeader();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [contacts, setContacts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "company">("list");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", companyId: "" });

  useEffect(() => {
    resetState();
    setConfig({
      searchPlaceholder: "Buscar contacto...",
      sortOptions: [
        { label: "Nombre", value: "name" },
        { label: "Email", value: "email" },
        { label: "Empresa", value: "company" },
      ],
      addButton: {
        label: "Agregar contacto",
        onClick: () => { setEditingId(null); setFormData({ firstName: "", lastName: "", email: "", phone: "", companyId: "" }); setShowModal(true); },
      },
    });
    return () => setConfig({});
  }, []);

  useEffect(() => { fetchContacts(); fetchCompanies(); }, []);

  const fetchContacts = async () => {
    try {
      const url = projectId ? `/api/contacts?projectId=${projectId}` : "/api/contacts";
      const res = await fetch(url);
      if (res.ok) setContacts(await res.json());
    } catch { console.error("Error loading contacts"); }
    finally { setLoading(false); }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) setCompanies(await res.json());
    } catch { console.error("Error loading companies"); }
  };

  const displayed = useMemo(() => {
    let result = [...contacts];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.company?.name?.toLowerCase().includes(q)
      );
    }
    if (sortField) {
      result.sort((a, b) => {
        let aVal = "", bVal = "";
        if (sortField === "name") { aVal = `${a.firstName} ${a.lastName}`.toLowerCase(); bVal = `${b.firstName} ${b.lastName}`.toLowerCase(); }
        else if (sortField === "email") { aVal = a.email?.toLowerCase() || ""; bVal = b.email?.toLowerCase() || ""; }
        else if (sortField === "company") { aVal = a.company?.name?.toLowerCase() || ""; bVal = b.company?.name?.toLowerCase() || ""; }
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [contacts, searchQuery, sortField, sortOrder]);

  const openEditModal = (contact: any) => {
    setEditingId(contact.id);
    setFormData({ firstName: contact.firstName, lastName: contact.lastName || "", email: contact.email || "", phone: contact.phone || "", companyId: contact.companyId || "" });
    setShowModal(true);
  };

  const handleDelete = async (contact: any) => {
    const isConfirmed = await confirm({ title: "Eliminar contacto", description: `¿Eliminar a '${contact.firstName} ${contact.lastName || ""}'? Esta acción no se puede deshacer.`, confirmText: "Eliminar", cancelText: "Cancelar", variant: "danger" });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      if (res.ok) { setContacts(contacts.filter(c => c.id !== contact.id)); addToast("Contacto eliminado.", "success"); }
      else { const err = await res.json(); addToast(err.error || "Error al eliminar.", "error"); }
    } catch { addToast("Error de conexión.", "error"); }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const isEditing = !!editingId;
      const payload = { ...formData, companyId: formData.companyId === "" ? null : formData.companyId, ...(isEditing ? { id: editingId } : {}) };
      const res = await fetch("/api/contacts", { method: isEditing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        const saved = await res.json();
        if (isEditing) setContacts(contacts.map(c => c.id === editingId ? saved : c));
        else setContacts([saved, ...contacts]);
        setShowModal(false); setEditingId(null); setFormData({ firstName: "", lastName: "", email: "", phone: "", companyId: "" });
        addToast(isEditing ? "Contacto actualizado." : "Contacto creado.", "success");
      } else { const err = await res.json(); addToast(`Error: ${err.error}`, "error"); }
    } catch { console.error("Error saving contact"); }
  };

  const grouped = useMemo(() => {
    return displayed.reduce((acc, c) => {
      const key = c.company?.name || "Sin Empresa";
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
      return acc;
    }, {} as Record<string, any[]>);
  }, [displayed]);

  return (
    <div className="flex bg-[#f5f4ef] h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Page header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
                {!loading && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">{contacts.length}</span>}
              </div>
              <p className="text-sm text-gray-500">
                {projectId ? "Mostrando contactos del proyecto actual." : "Gestiona todos tus contactos y leads."}
              </p>
            </div>
            <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
              <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} title="Vista lista">
                <HugeiconsIcon icon={ListViewIcon} size={16} />
              </button>
              <button onClick={() => setViewMode("company")} className={`p-2 rounded-lg transition-colors ${viewMode === "company" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`} title="Agrupar por empresa">
                <HugeiconsIcon icon={GridViewIcon} size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            </div>
          ) : viewMode === "list" ? (
            displayed.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <HugeiconsIcon icon={UserMultipleIcon} size={28} color="#9ca3af" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">{searchQuery ? "Sin resultados" : "No hay contactos"}</h3>
                <p className="text-sm text-gray-500">{searchQuery ? `No se encontraron resultados para "${searchQuery}".` : "Agrega tu primer contacto para comenzar."}</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-6 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Nombre</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Email</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Teléfono</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Empresa</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {displayed.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={c.firstName} />
                            <span className="font-semibold text-gray-900">{c.firstName} {c.lastName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{c.email || "—"}</td>
                        <td className="px-6 py-4 text-gray-500">{c.phone || "—"}</td>
                        <td className="px-6 py-4">
                          {c.company ? (
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">{c.company.name}</span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(c)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                              <HugeiconsIcon icon={PencilEdit01Icon} size={15} />
                            </button>
                            <button onClick={() => handleDelete(c)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                              <HugeiconsIcon icon={Delete01Icon} size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-4">
              {Object.entries(grouped).map(([companyName, compContacts]) => {
                const items = compContacts as any[];
                return (
                  <div key={companyName} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                      <span className="text-sm font-bold text-gray-900">{companyName}</span>
                      <span className="text-[10px] font-semibold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{items.length}</span>
                    </div>
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-gray-50">
                        {items.map((c: any) => (
                          <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <Avatar name={c.firstName} />
                                <span className="font-semibold text-gray-900">{c.firstName} {c.lastName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-gray-500">{c.email || "—"}</td>
                            <td className="px-6 py-3.5 text-gray-500">{c.phone || "—"}</td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditModal(c)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><HugeiconsIcon icon={PencilEdit01Icon} size={15} /></button>
                                <button onClick={() => handleDelete(c)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><HugeiconsIcon icon={Delete01Icon} size={15} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              {Object.keys(grouped).length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Sin resultados</h3>
                  <p className="text-sm text-gray-500">No se encontraron contactos.</p>
                </div>
              )}
            </div>
          )}

          {showModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">{editingId ? "Editar contacto" : "Agregar contacto"}</h2>
                  <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                    <HugeiconsIcon icon={Cancel01Icon} size={20} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700">Nombre *</label>
                      <input required type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700">Apellido</label>
                      <input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={inputCls} placeholder="nombre@empresa.com" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Teléfono</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={inputCls} placeholder="+52 55 1234 5678" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Empresa</label>
                    <select value={formData.companyId} onChange={e => setFormData({ ...formData, companyId: e.target.value })} className={inputCls}>
                      <option value="">— Sin empresa —</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                    <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-black rounded-xl transition-colors">{editingId ? "Guardar cambios" : "Crear contacto"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#f5f4ef]"><div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" /></div>}>
      <ContactsContent />
    </Suspense>
  );
}
