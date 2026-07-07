"use client";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, Building04Icon, Cancel01Icon, ServerStack01Icon, GlobeIcon, PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { input as inputCls } from "@/src/lib/crm-ui";

function CompanyAvatar({ name }: { name: string }) {
  const colors = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-green-100 text-green-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${color}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function CompaniesPage() {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState, sortField, sortOrder } = useHeader();

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
  }, []);

  useEffect(() => {
    setConfig({
      title: "Empresas",
      titleBadge: loading ? undefined : companies.length,
      sortOptions: [
        { label: "Nombre", value: "name" },
        { label: "Industria", value: "industry" },
        { label: "Contactos", value: "contacts" },
      ],
      addButton: { label: "Agregar empresa", onClick: () => { setEditingId(null); setFormData({ name: "", website: "", industry: "" }); setShowModal(true); } },
    });
    return () => setConfig({});
  }, [loading, companies.length]);

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) setCompanies(await res.json());
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const displayed = useMemo(() => {
    const result = [...companies];
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
  }, [companies, sortField, sortOrder]);

  const openEditModal = (company: any) => {
    setEditingId(company.id);
    setFormData({ name: company.name, website: company.website || "", industry: company.industry || "" });
    setShowModal(true);
  };

  const handleDelete = async (company: any) => {
    const isConfirmed = await confirm({ title: "Eliminar empresa", description: `¿Estás seguro de que quieres eliminar '${company.name}'? Esta acción no se puede deshacer.`, confirmText: "Eliminar", cancelText: "Cancelar", variant: "danger" });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
      if (res.ok) { setCompanies(companies.filter(c => c.id !== company.id)); addToast("Empresa eliminada.", "success"); }
      else { const err = await res.json(); addToast(err.error || "Error al eliminar.", "error"); }
    } catch { addToast("Error de conexión.", "error"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = !!editingId;
      const res = await fetch("/api/companies", { method: isEditing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isEditing ? { ...formData, id: editingId } : formData) });
      if (res.ok) {
        const saved = await res.json();
        if (isEditing) setCompanies(companies.map(c => c.id === editingId ? saved : c));
        else setCompanies([saved, ...companies]);
        setShowModal(false); setEditingId(null); setFormData({ name: "", website: "", industry: "" });
        addToast(isEditing ? "Empresa actualizada." : "Empresa creada.", "success");
      } else { const err = await res.json(); addToast(`Error: ${err.error}`, "error"); }
    } catch { console.error("Error saving company"); }
  };

  const openSmtpModal = async (company: any) => {
    setCurrentSmtpCompany(company); setShowSmtpModal(true);
    try {
      const res = await fetch(`/api/companies/${company.id}/smtp`);
      if (res.ok) {
        const data = await res.json();
        setSmtpData({ smtpHost: data.smtpHost || "", smtpPort: data.smtpPort ? data.smtpPort.toString() : "", smtpUser: data.smtpUser || "", smtpPass: "", smtpFromEmail: data.smtpFromEmail || "", smtpSecure: data.smtpSecure ?? true });
      }
    } catch { console.error("Error loading SMTP"); }
  };

  const handleSmtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSavingSmtp(true);
    try {
      const res = await fetch(`/api/companies/${currentSmtpCompany.id}/smtp`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(smtpData) });
      if (res.ok) { setShowSmtpModal(false); addToast("SMTP guardado correctamente.", "success"); }
      else { const data = await res.json(); addToast(`Error: ${data.error}`, "error"); }
    } catch { console.error("Error saving SMTP"); } finally { setIsSavingSmtp(false); }
  };

  const handleSmtpTest = async () => {
    if (!testEmail) { addToast("Ingresa un correo de prueba.", "warning"); return; }
    setIsTestingSmtp(true);
    try {
      const res = await fetch(`/api/companies/${currentSmtpCompany.id}/smtp/test`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...smtpData, testEmail }) });
      const data = await res.json();
      if (res.ok) addToast("Correo de prueba enviado. Revisa tu bandeja.", "success");
      else addToast(`Error: ${data.error}`, "error");
    } catch { addToast("Error al probar la conexión.", "error"); } finally { setIsTestingSmtp(false); }
  };

  return (
    <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-surface-app">

          {/* Page header */}
          <div className="mb-6">
            <p className="text-sm text-text-secondary">Administra las empresas y sus configuraciones de correo (SMTP).</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg border border-border-subtle">
              <div className="w-16 h-16 bg-surface-sidebar rounded-lg flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon icon={Building04Icon} size={28} color="#9ca3af" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1">No hay empresas</h3>
              <p className="text-sm text-text-secondary">Agrega tu primera empresa para comenzar.</p>
            </div>
          ) : (
            <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-sidebar/60">
                    <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Empresa</th>
                    <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Industria</th>
                    <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Website</th>
                    <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Contactos</th>
                    <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest">SMTP</th>
                    <th className="px-6 py-3.5 text-[10px] font-semibold text-text-secondary uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayed.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-sidebar/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <CompanyAvatar name={c.name} />
                          <span className="font-semibold text-text-primary">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {c.industry ? (
                          <span className="px-2.5 py-1 bg-gray-100 text-text-secondary text-xs font-semibold rounded-full">{c.industry}</span>
                        ) : <span className="text-text-secondary">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {c.website ? (
                          <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium">
                            <HugeiconsIcon icon={GlobeIcon} size={13} />
                            {c.website.replace(/^https?:\/\//, "")}
                          </a>
                        ) : <span className="text-text-secondary">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">{c._count?.contacts || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => openSmtpModal(c)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors">
                          <HugeiconsIcon icon={ServerStack01Icon} size={13} />
                          Configurar
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(c)} className="p-2 text-text-secondary hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
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
          )}

          {/* Create/Edit Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle">
                  <h2 className="text-base font-bold text-text-primary">{editingId ? "Editar empresa" : "Agregar empresa"}</h2>
                  <button onClick={() => setShowModal(false)} className="p-1 text-text-secondary hover:text-text-secondary rounded-lg">
                    <HugeiconsIcon icon={Cancel01Icon} size={20} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">Nombre *</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputCls} placeholder="Acme Inc." />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">Website</label>
                    <input type="text" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} className={inputCls} placeholder="acme.com" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">Industria</label>
                    <input type="text" value={formData.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })} className={inputCls} placeholder="Tecnología, Retail..." />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-nav-hover rounded-lg transition-colors">Cancelar</button>
                    <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-accent-charcoal hover:bg-black rounded-lg transition-colors">{editingId ? "Guardar cambios" : "Crear empresa"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* SMTP Modal */}
          {showSmtpModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden">
                <div className="flex items-start justify-between px-6 py-5 border-b border-border-subtle">
                  <div>
                    <h2 className="text-base font-bold text-text-primary">Configuración SMTP</h2>
                    <p className="text-xs text-text-secondary mt-0.5">Los correos de <span className="font-semibold">{currentSmtpCompany?.name}</span> se enviarán con estas credenciales.</p>
                  </div>
                  <button onClick={() => setShowSmtpModal(false)} className="p-1 text-text-secondary hover:text-text-secondary rounded-lg">
                    <HugeiconsIcon icon={Cancel01Icon} size={20} />
                  </button>
                </div>
                <form onSubmit={handleSmtpSubmit} className="p-6 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-text-primary">Host SMTP</label>
                      <input required type="text" value={smtpData.smtpHost} onChange={e => setSmtpData({ ...smtpData, smtpHost: e.target.value })} className={inputCls} placeholder="smtp.gmail.com" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-text-primary">Puerto</label>
                      <input required type="number" value={smtpData.smtpPort} onChange={e => setSmtpData({ ...smtpData, smtpPort: e.target.value })} className={inputCls} placeholder="465" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">Usuario SMTP (email)</label>
                    <input required type="text" value={smtpData.smtpUser} onChange={e => setSmtpData({ ...smtpData, smtpUser: e.target.value })} className={inputCls} placeholder="hola@tuempresa.com" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">Contraseña SMTP</label>
                    <input type="password" value={smtpData.smtpPass} onChange={e => setSmtpData({ ...smtpData, smtpPass: e.target.value })} className={inputCls} placeholder="••••••••" />
                    <p className="text-[10px] text-text-secondary">Dejar vacío para no cambiar la contraseña actual.</p>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={smtpData.smtpSecure} onChange={e => setSmtpData({ ...smtpData, smtpSecure: e.target.checked })} className="rounded border-border-subtle w-4 h-4" />
                    <span className="text-sm font-medium text-text-primary">Usar conexión segura (SSL/TLS)</span>
                  </label>

                  <div className="mt-2 pt-4 border-t border-border-subtle">
                    <p className="text-sm font-semibold text-text-primary mb-3">Probar conexión</p>
                    <div className="flex gap-2">
                      <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} className={inputCls + " flex-1"} placeholder="correo@prueba.com" />
                      <button type="button" onClick={handleSmtpTest} disabled={isTestingSmtp} className="px-4 py-2.5 text-sm font-semibold text-text-primary border border-border-subtle bg-white hover:bg-surface-sidebar rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                        {isTestingSmtp ? "Probando..." : "Enviar prueba"}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle mt-2">
                    <button type="button" onClick={() => setShowSmtpModal(false)} className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-nav-hover rounded-lg transition-colors">Cancelar</button>
                    <button disabled={isSavingSmtp} type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-accent-charcoal hover:bg-black rounded-lg transition-colors disabled:opacity-50">{isSavingSmtp ? "Guardando..." : "Guardar configuración"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
    </main>
  );
}
