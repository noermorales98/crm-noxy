"use client";
import { useState, useEffect, useMemo } from "react";
import Header from "@/src/components/Header";
import Sidebar from "@/src/components/Sidebar";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import { Trash2 } from "lucide-react";

export default function CompaniesPage() {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState, searchQuery, sortField, sortOrder } = useHeader();

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", website: "", industry: "" });

  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [currentSmtpCompany, setCurrentSmtpCompany] = useState<any>(null);
  const [smtpData, setSmtpData] = useState({ smtpHost: "", smtpPort: "", smtpUser: "", smtpPass: "", smtpFromEmail: "", smtpSecure: true });
  const [testEmail, setTestEmail] = useState("");
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  useEffect(() => {
    resetState();
    setConfig({
      searchPlaceholder: "Buscar empresa...",
      sortOptions: [
        { label: "Nombre", value: "name" },
        { label: "Industria", value: "industry" },
        { label: "Contactos", value: "contacts" },
      ],
      addButton: { label: "Agregar empresa", onClick: () => { setEditingId(null); setFormData({ name: "", website: "", industry: "" }); setShowModal(true); } },
    });
    return () => setConfig({});
  }, []);

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) setCompanies(await res.json());
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const displayed = useMemo(() => {
    let result = [...companies];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) =>
        c.name?.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q) ||
        c.website?.toLowerCase().includes(q)
      );
    }

    if (sortField) {
      result.sort((a, b) => {
        let aVal: any, bVal: any;
        if (sortField === "contacts") { aVal = a._count?.contacts || 0; bVal = b._count?.contacts || 0; }
        else { aVal = (a[sortField] || "").toLowerCase(); bVal = (b[sortField] || "").toLowerCase(); }
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [companies, searchQuery, sortField, sortOrder]);

  const openEditModal = (company: any) => {
    setEditingId(company.id);
    setFormData({ name: company.name, website: company.website || "", industry: company.industry || "" });
    setShowModal(true);
  };

  const handleDelete = async (company: any) => {
    const isConfirmed = await confirm({
      title: "Eliminar empresa",
      description: `¿Estás seguro de que quieres eliminar la empresa '${company.name}'? Todos los contactos, campañas y formularios asociados también podrían ser afectados. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar", cancelText: "Cancelar", variant: "danger"
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
      if (res.ok) { setCompanies(companies.filter(c => c.id !== company.id)); addToast("Empresa eliminada exitosamente.", "success"); }
      else { const err = await res.json(); addToast(err.error || "Error al eliminar la empresa.", "error"); }
    } catch (e) { addToast("Error de conexión al eliminar.", "error"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = !!editingId;
      const res = await fetch("/api/companies", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { ...formData, id: editingId } : formData),
      });
      if (res.ok) {
        const saved = await res.json();
        if (isEditing) setCompanies(companies.map(c => c.id === editingId ? saved : c));
        else setCompanies([saved, ...companies]);
        setShowModal(false); setEditingId(null); setFormData({ name: "", website: "", industry: "" });
      } else { const err = await res.json(); addToast(`Error: ${err.error}`, "error"); }
    } catch (error) { console.error(error); }
  };

  const openSmtpModal = async (company: any) => {
    setCurrentSmtpCompany(company); setShowSmtpModal(true);
    try {
      const res = await fetch(`/api/companies/${company.id}/smtp`);
      if (res.ok) {
        const data = await res.json();
        setSmtpData({ smtpHost: data.smtpHost || "", smtpPort: data.smtpPort ? data.smtpPort.toString() : "", smtpUser: data.smtpUser || "", smtpPass: "", smtpFromEmail: data.smtpFromEmail || "", smtpSecure: data.smtpSecure ?? true });
      }
    } catch (e) { console.error(e); }
  };

  const handleSmtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSavingSmtp(true);
    try {
      const res = await fetch(`/api/companies/${currentSmtpCompany.id}/smtp`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(smtpData) });
      if (res.ok) { setShowSmtpModal(false); addToast("SMTP Settings Saved Successfully", "success"); }
      else { const data = await res.json(); addToast(`Error saving SMTP settings: ${data.error}`, "error"); }
    } catch (error) { console.error(error); } finally { setIsSavingSmtp(false); }
  };

  const handleSmtpTest = async () => {
    if (!testEmail) { addToast("Please enter an email address to send the test to.", "warning"); return; }
    setIsTestingSmtp(true);
    try {
      const res = await fetch(`/api/companies/${currentSmtpCompany.id}/smtp/test`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...smtpData, testEmail }) });
      const data = await res.json();
      if (res.ok) addToast("Test Email Sent Successfully! Check your inbox.", "success");
      else addToast(`Error testing SMTP: ${data.error}`, "error");
    } catch (error) { addToast("Failed to connect to the test endpoint.", "error"); } finally { setIsTestingSmtp(false); }
  };

  return (
    <div className="flex bg-background h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          </div>

          {loading ? (
            <div className="text-gray-500">Cargando empresas...</div>
          ) : (
            <div className="bg-white border text-sm border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#fcfbf9] border-b text-gray-500 border-gray-100 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Nombre</th>
                    <th className="px-6 py-4 font-semibold">Industria</th>
                    <th className="px-6 py-4 font-semibold">Website</th>
                    <th className="px-6 py-4 font-semibold">Contactos</th>
                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayed.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">{searchQuery ? "No se encontraron empresas." : "No hay empresas. ¡Crea una!"}</td></tr>
                  ) : displayed.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                      <td className="px-6 py-4 text-gray-600">{c.industry || "-"}</td>
                      <td className="px-6 py-4 text-blue-600 hover:underline">{c.website ? <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank">{c.website}</a> : "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{c._count?.contacts || 0}</td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <button onClick={() => openSmtpModal(c)} className="text-orange-600 hover:text-orange-800 text-sm font-medium">SMTP</button>
                        <button onClick={() => openEditModal(c)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Editar</button>
                        <button onClick={() => handleDelete(c)} className="text-gray-400 hover:text-red-600 text-sm font-medium transition-colors" title="Eliminar empresa">
                          <Trash2 size={16} className="inline-block" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar empresa' : 'Agregar empresa'}</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa *</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input type="text" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" placeholder="acme.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <input type="text" value={formData.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" />
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-transparent hover:bg-gray-50 rounded-lg">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm text-white bg-black hover:bg-gray-800 rounded-lg font-medium">{editingId ? 'Save changes' : 'Create'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* SMTP Modal */}
          {showSmtpModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                <h2 className="text-xl font-bold mb-1">Company SMTP Variables</h2>
                <p className="text-gray-500 text-xs mb-4">Emails sent from this `{currentSmtpCompany?.name}` workspace will be transmitted out via these credentials.</p>
                <form onSubmit={handleSmtpSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                      <input required type="text" value={smtpData.smtpHost} onChange={e => setSmtpData({ ...smtpData, smtpHost: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" placeholder="smtp.gmail.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                      <input required type="number" value={smtpData.smtpPort} onChange={e => setSmtpData({ ...smtpData, smtpPort: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" placeholder="465" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP User (Email Auth)</label>
                    <input required type="text" value={smtpData.smtpUser} onChange={e => setSmtpData({ ...smtpData, smtpUser: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" placeholder="hello@acme.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
                    <input type="password" value={smtpData.smtpPass} onChange={e => setSmtpData({ ...smtpData, smtpPass: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" placeholder="*********" />
                    <p className="text-[10px] text-gray-400 mt-1">Leave blank if you do not want to overwrite the current password.</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input id="smtpSecure" type="checkbox" checked={smtpData.smtpSecure} onChange={e => setSmtpData({ ...smtpData, smtpSecure: e.target.checked })} className="rounded border-gray-300" />
                    <label htmlFor="smtpSecure" className="text-sm font-medium text-gray-700">Use Secure Connection (SSL/TLS)</label>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50 bg-gray-50/50 -mx-6 px-6 py-4 flex flex-col gap-3">
                    <p className="text-sm font-semibold text-gray-700">Test Connection</p>
                    <div className="flex gap-2">
                      <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black" placeholder="Enter an email to send a test message" />
                      <button type="button" onClick={handleSmtpTest} disabled={isTestingSmtp} className="px-4 py-2 text-sm text-black border border-gray-200 bg-white hover:bg-gray-50 rounded-lg font-medium disabled:opacity-50 whitespace-nowrap">
                        {isTestingSmtp ? 'Testing...' : 'Test Connection'}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-50">
                    <button type="button" onClick={() => setShowSmtpModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-transparent hover:bg-gray-50 rounded-lg">Cancel</button>
                    <button disabled={isSavingSmtp} type="submit" className="px-4 py-2 text-sm text-white bg-black hover:bg-gray-800 rounded-lg font-medium disabled:opacity-50">{isSavingSmtp ? 'Saving...' : 'Save Configuration'}</button>
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
