"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/src/components/Header";
import Sidebar from "@/src/components/Sidebar";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons";

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
        onClick: () => {
          setEditingId(null);
          setFormData({ firstName: "", lastName: "", email: "", phone: "", companyId: "" });
          setShowModal(true);
        },
      },
    });
    return () => setConfig({});
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchCompanies();
  }, []);

  const fetchContacts = async () => {
    try {
      const url = projectId ? `/api/contacts?projectId=${projectId}` : "/api/contacts";
      const res = await fetch(url);
      if (res.ok) setContacts(await res.json());
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) setCompanies(await res.json());
    } catch (error) { console.error(error); }
  };

  const displayed = useMemo(() => {
    let result = [...contacts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) =>
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
    const isConfirmed = await confirm({
      title: "Eliminar contacto",
      description: `¿Estás seguro de que quieres eliminar a '${contact.firstName} ${contact.lastName || ""}'? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar", cancelText: "Cancelar", variant: "danger"
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      if (res.ok) { setContacts(contacts.filter(c => c.id !== contact.id)); addToast("Contacto eliminado exitosamente.", "success"); }
      else { const err = await res.json(); addToast(err.error || "Error al eliminar el contacto.", "error"); }
    } catch (e) { addToast("Error de conexión al eliminar.", "error"); }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const isEditing = !!editingId;
      const payload = { ...formData, companyId: formData.companyId === "" ? null : formData.companyId, ...(isEditing ? { id: editingId } : {}) };
      const res = await fetch("/api/contacts", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        if (isEditing) setContacts(contacts.map(c => c.id === editingId ? saved : c));
        else setContacts([saved, ...contacts]);
        setShowModal(false); setEditingId(null); setFormData({ firstName: "", lastName: "", email: "", phone: "", companyId: "" });
      } else { const err = await res.json(); addToast(`Error: ${err.error}`, "error"); }
    } catch (error) { console.error(error); }
  };

  return (
    <div className="flex bg-[#f5f4ef] h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
              {projectId && <p className="text-sm text-gray-500 mt-1">Filtrado por proyecto actual</p>}
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Lista</button>
              <button onClick={() => setViewMode("company")} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === "company" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Por Empresa</button>
            </div>
          </div>

          {loading ? (
            <div className="text-gray-500">Cargando contactos...</div>
          ) : viewMode === "list" ? (
            <div className="bg-white border text-sm border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50/60 border-b text-gray-500 border-gray-100 uppercase tracking-widest text-[10px]">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Nombre</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Teléfono</th>
                    <th className="px-6 py-4 font-semibold">Empresa</th>
                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayed.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">{searchQuery ? "No se encontraron contactos." : "No hay contactos. ¡Crea uno!"}</td></tr>
                  ) : displayed.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                          {c.firstName?.[0] || ""}
                        </div>
                        {c.firstName} {c.lastName}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{c.email || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{c.phone || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {c.company ? <span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-semibold">{c.company.name}</span> : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => openEditModal(c)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Editar contacto"><HugeiconsIcon icon={PencilEdit01Icon} size={16} /></button>
                          <button onClick={() => handleDelete(c)} className="text-gray-400 hover:text-red-600 transition-colors" title="Eliminar contacto"><HugeiconsIcon icon={Delete01Icon} size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {(() => {
                const grouped = displayed.reduce((acc, c) => {
                  const compName = c.company?.name || "Sin Empresa";
                  if (!acc[compName]) acc[compName] = [];
                  acc[compName].push(c);
                  return acc;
                }, {} as Record<string, any[]>);

                return Object.entries(grouped).map(([companyName, compContacts]) => {
                  const items = compContacts as any[];
                  return (
                    <div key={companyName} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-900 flex items-center justify-between">
                        {companyName}
                        <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2 py-1 rounded-full">{items.length}</span>
                      </div>
                      <table className="w-full text-left text-sm">
                        <tbody className="divide-y divide-gray-100">
                          {items.map((c: any) => (
                            <tr key={c.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">{c.firstName?.[0] || ""}</div>
                                {c.firstName} {c.lastName}
                              </td>
                              <td className="px-6 py-4 text-gray-600">{c.email || "-"}</td>
                              <td className="px-6 py-4 text-gray-600">{c.phone || "-"}</td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <button onClick={() => openEditModal(c)} className="text-gray-400 hover:text-blue-600 transition-colors"><HugeiconsIcon icon={PencilEdit01Icon} size={16} /></button>
                                  <button onClick={() => handleDelete(c)} className="text-gray-400 hover:text-red-600 transition-colors"><HugeiconsIcon icon={Delete01Icon} size={16} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {showModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar contacto' : 'Agregar contacto'}</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                      <input required type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                      <input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                    <select value={formData.companyId} onChange={e => setFormData({ ...formData, companyId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black bg-white">
                      <option value="">-- Sin empresa --</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">Cancelar</button>
                    <button type="submit" className="px-4 py-2 text-sm text-white bg-black hover:bg-gray-800 rounded-lg font-medium">{editingId ? 'Guardar cambios' : 'Crear'}</button>
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
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando...</div>}>
      <ContactsContent />
    </Suspense>
  );
}
