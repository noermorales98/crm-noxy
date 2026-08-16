"use client";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import { useAi } from "@/src/hooks/useAi";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, PencilEdit01Icon, Cancel01Icon, UserMultipleIcon, GridViewIcon, ListViewIcon } from "@hugeicons/core-free-icons";
import { input as inputCls } from "@/src/lib/crm-ui";

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
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${color}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function ContactsContent() {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState, sortField, sortOrder } = useHeader();

  const [contacts, setContacts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "company">("list");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", companyId: "" });

  useEffect(() => {
    resetState();
  }, []);

  useEffect(() => {
    setConfig({
      title: "Contactos",
      titleBadge: loading ? undefined : contacts.length,
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
  }, [loading, contacts.length]);

  useEffect(() => { fetchContacts(); fetchCompanies(); }, []);

  const { setPageContext } = useAi();
  useEffect(() => {
    setPageContext({ page: "contacts", label: "Lista de contactos", data: { count: contacts.length } });
    return () => setPageContext(null);
  }, [contacts.length]);

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/contacts");
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
    const result = [...contacts];
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
  }, [contacts, sortField, sortOrder]);

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
    <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-surface-app">

          {/* Page header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm text-text-secondary">
                Gestiona todos tus contactos y leads.
              </p>
            </div>
            <div className="flex items-center bg-gray-100 p-1 rounded-lg gap-1">
              <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-white text-text-primary" : "text-text-secondary hover:text-text-primary"}`} title="Vista lista">
                <HugeiconsIcon icon={ListViewIcon} size={16} />
              </button>
              <button onClick={() => setViewMode("company")} className={`p-2 rounded-lg transition-colors ${viewMode === "company" ? "bg-white text-text-primary" : "text-text-secondary hover:text-text-primary"}`} title="Agrupar por empresa">
                <HugeiconsIcon icon={GridViewIcon} size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
            </div>
          ) : viewMode === "list" ? (
            displayed.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-lg border border-border-subtle">
                <div className="w-16 h-16 bg-surface-sidebar rounded-lg flex items-center justify-center mx-auto mb-4">
                  <HugeiconsIcon icon={UserMultipleIcon} size={28} color="#9ca3af" />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-1">No hay contactos</h3>
                <p className="text-sm text-text-secondary">Agrega tu primer contacto para comenzar.</p>
              </div>
            ) : (
              <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle bg-surface-sidebar/60">
                      <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Nombre</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Email</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Teléfono</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Empresa</th>
                      <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {displayed.map((c) => (
                      <tr key={c.id} className="hover:bg-surface-sidebar/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={c.firstName} />
                            <span className="font-semibold text-text-primary">{c.firstName} {c.lastName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-secondary">{c.email || "—"}</td>
                        <td className="px-6 py-4 text-text-secondary">{c.phone || "—"}</td>
                        <td className="px-6 py-4">
                          {c.company ? (
                            <span className="px-2.5 py-1 bg-gray-100 text-text-secondary text-xs font-semibold rounded-full">{c.company.name}</span>
                          ) : <span className="text-text-secondary">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(c)} className="p-2 text-text-secondary hover:text-action-primary hover:bg-nav-hover rounded-control transition-colors" title="Editar">
                              <HugeiconsIcon icon={PencilEdit01Icon} size={15} />
                            </button>
                            <button onClick={() => handleDelete(c)} className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
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
                  <div key={companyName} className="bg-white border border-border-subtle rounded-lg overflow-hidden">
                    <div className="px-6 py-3.5 border-b border-border-subtle flex items-center justify-between bg-surface-sidebar/60">
                      <span className="text-sm font-bold text-text-primary">{companyName}</span>
                      <span className="text-[10px] font-semibold bg-nav-active text-text-secondary px-2 py-0.5 rounded-full">{items.length}</span>
                    </div>
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-gray-50">
                        {items.map((c: any) => (
                          <tr key={c.id} className="hover:bg-surface-sidebar/50 transition-colors group">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <Avatar name={c.firstName} />
                                <span className="font-semibold text-text-primary">{c.firstName} {c.lastName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-text-secondary">{c.email || "—"}</td>
                            <td className="px-6 py-3.5 text-text-secondary">{c.phone || "—"}</td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditModal(c)} className="p-2 text-text-secondary hover:text-action-primary hover:bg-nav-hover rounded-control transition-colors"><HugeiconsIcon icon={PencilEdit01Icon} size={15} /></button>
                                <button onClick={() => handleDelete(c)} className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><HugeiconsIcon icon={Delete01Icon} size={15} /></button>
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
                <div className="text-center py-20 bg-white rounded-lg border border-border-subtle">
                  <h3 className="text-base font-semibold text-text-primary mb-1">Sin resultados</h3>
                  <p className="text-sm text-text-secondary">No se encontraron contactos.</p>
                </div>
              )}
            </div>
          )}

          {showModal && (
            <div className="fixed inset-0 bg-brand-obsidian/35 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle">
                  <h2 className="text-base font-bold text-text-primary">{editingId ? "Editar contacto" : "Agregar contacto"}</h2>
                  <button onClick={() => setShowModal(false)} className="p-1 text-text-secondary hover:text-text-secondary rounded-lg">
                    <HugeiconsIcon icon={Cancel01Icon} size={20} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-text-primary">Nombre *</label>
                      <input required type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-text-primary">Apellido</label>
                      <input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={inputCls} placeholder="nombre@empresa.com" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">Teléfono</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={inputCls} placeholder="+52 55 1234 5678" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">Empresa</label>
                    <select value={formData.companyId} onChange={e => setFormData({ ...formData, companyId: e.target.value })} className={inputCls}>
                      <option value="">— Sin empresa —</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-nav-hover rounded-lg transition-colors">Cancelar</button>
                    <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-action-primary-foreground bg-action-primary hover:bg-black rounded-lg transition-colors">{editingId ? "Guardar cambios" : "Crear contacto"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
    </main>
  );
}

export default function ContactsPage() {
  return <ContactsContent />;
}
