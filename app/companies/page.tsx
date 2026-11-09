"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, Cancel01Icon, ServerStack01Icon, GlobeIcon, PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { input as inputCls } from "@/src/lib/crm-ui";
import { CompanyAvatar, CompanyIconPicker, useCompanyIcons, type CompanyIconKey } from "@/src/components/ui/EntityIcon";
import { Chip, DataTable, EmptyState, Enter, ErrorState, PageHeader, Skeleton, useDialog } from "@/src/components/ui";

type CompanyRow = {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
  hideContacts?: boolean;
  _count?: { contacts?: number };
};

export default function CompaniesPage() {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState, sortField, sortOrder } = useHeader();

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { iconFor, setIcon } = useCompanyIcons();
  const [iconDraft, setIconDraft] = useState<CompanyIconKey>("building");
  const [formData, setFormData] = useState({ name: "", website: "", industry: "" });

  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [currentSmtpCompany, setCurrentSmtpCompany] = useState<any>(null);
  const [smtpData, setSmtpData] = useState({ smtpHost: "", smtpPort: "", smtpUser: "", smtpPass: "", smtpFromEmail: "", smtpSecure: true });
  const [testEmail, setTestEmail] = useState("");
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  const companyDialogRef = useRef<HTMLDivElement>(null);
  useDialog(companyDialogRef, showModal, () => setShowModal(false));
  const smtpDialogRef = useRef<HTMLDivElement>(null);
  useDialog(smtpDialogRef, showSmtpModal, () => setShowSmtpModal(false));

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
      pageHeader: true,
    });
    return () => setConfig({});
  }, [loading, companies.length]);

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    setLoadError(false);
    try {
      const res = await fetch("/api/companies");
      if (res.ok) setCompanies(await res.json());
      else setLoadError(true);
    } catch (error) { console.error(error); setLoadError(true); }
    finally { setLoading(false); }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ name: "", website: "", industry: "" });
    setIconDraft("building");
    setShowModal(true);
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
    setIconDraft(iconFor(company.id));
    setShowModal(true);
  };

  const toggleHideContacts = async (company: { id: string; hideContacts?: boolean }) => {
    const next = !company.hideContacts;
    try {
      const res = await fetch("/api/companies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: company.id, hideContacts: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addToast(err.error || "No se pudo actualizar la empresa.", "error");
        return;
      }
      const saved = await res.json();
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, hideContacts: saved.hideContacts } : c)));
      addToast(next ? "Contactos ocultos. No se borraron." : "Contactos visibles de nuevo.", "success");
    } catch {
      addToast("Error de conexión.", "error");
    }
  };

  const handleDelete = async (company: any) => {
    const isConfirmed = await confirm({ title: "Eliminar empresa", description: `¿Estás seguro de que quieres eliminar '${company.name}'? También se borrarán los correos de esta cuenta. Esta acción no se puede deshacer.`, confirmText: "Eliminar", cancelText: "Cancelar", variant: "danger" });
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
        if (saved?.id) setIcon(saved.id, iconDraft);
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

  const primaryAction = (
    <button
      type="button"
      onClick={openCreateModal}
      className="crm-press inline-flex min-h-11 items-center justify-center rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary lg:min-h-10"
    >
      Agregar empresa
    </button>
  );

  const rowActions = (c: CompanyRow) => (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => openEditModal(c)}
        aria-label={`Editar ${c.name}`}
        className="crm-press flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar hover:text-action-primary lg:size-9"
      >
        <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
      </button>
      <button
        type="button"
        onClick={() => handleDelete(c)}
        aria-label={`Eliminar ${c.name}`}
        className="crm-press flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-danger-soft hover:text-danger lg:size-9"
      >
        <HugeiconsIcon icon={Delete01Icon} size={16} />
      </button>
    </div>
  );

  const contactsCell = (c: CompanyRow) => (
    <div className="flex flex-wrap items-center gap-2">
      <Chip>{`${c._count?.contacts || 0}`}</Chip>
      {c.hideContacts && <Chip tone="late">Contactos ocultos</Chip>}
      <button
        type="button"
        onClick={() => toggleHideContacts(c)}
        className="inline-flex min-h-11 items-center rounded-control px-2 text-xs font-semibold text-text-secondary hover:text-text-primary lg:min-h-8"
      >
        {c.hideContacts ? "Mostrar" : "Ocultar"}
      </button>
    </div>
  );

  const smtpButton = (c: CompanyRow) => (
    <button
      type="button"
      onClick={() => openSmtpModal(c)}
      className="crm-press inline-flex min-h-11 items-center gap-1.5 rounded-control border border-line bg-surface-elevated px-3 text-xs font-semibold text-text-primary hover:bg-surface-sidebar lg:min-h-8"
    >
      <HugeiconsIcon icon={ServerStack01Icon} size={14} />
      Configurar
    </button>
  );

  const website = (c: CompanyRow) =>
    c.website ? (
      <a
        href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center gap-1.5 font-medium text-action-primary hover:text-action-secondary lg:min-h-0"
      >
        <HugeiconsIcon icon={GlobeIcon} size={14} />
        <span className="truncate">{c.website.replace(/^https?:\/\//, "")}</span>
      </a>
    ) : (
      <span className="text-text-secondary">Sin website</span>
    );

  const columns = [
    {
      key: "name",
      header: "Empresa",
      render: (c: CompanyRow) => (
        <div className="flex min-w-0 items-center gap-3">
          <CompanyAvatar icon={iconFor(c.id)} />
          <span className="truncate font-semibold text-text-primary" title={c.name}>{c.name}</span>
        </div>
      ),
    },
    { key: "industry", header: "Industria", render: (c: CompanyRow) => (c.industry ? <Chip>{c.industry}</Chip> : <span className="text-text-secondary">Sin industria</span>) },
    { key: "website", header: "Website", render: website },
    { key: "contacts", header: "Contactos", render: contactsCell },
    { key: "smtp", header: "SMTP", render: smtpButton },
    { key: "actions", header: "Acciones", align: "right" as const, render: rowActions },
  ];

  const mobileRow = (c: CompanyRow) => (
    <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
      <div className="flex min-w-0 items-center gap-3">
        <CompanyAvatar icon={iconFor(c.id)} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-text-primary">{c.name}</p>
          <p className="truncate text-xs text-text-secondary">{c.industry || "Sin industria"}</p>
        </div>
        {rowActions(c)}
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-12">
        {c.website && <span className="inline-flex min-h-11 max-w-full items-center">{website(c)}</span>}
        {contactsCell(c)}
        {smtpButton(c)}
      </div>
    </div>
  );

  return (
    <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
      <Enter index={0}>
        <PageHeader
          title="Empresas"
          subtitle={loading ? "Cargando empresas…" : `${companies.length} ${companies.length === 1 ? "empresa" : "empresas"} · Cuentas y su correo (SMTP)`}
          actions={primaryAction}
        />
      </Enter>
      <Enter index={1}>
        {loading ? (
          <div className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
            <Skeleton shape="rows" count={6} label="Cargando empresas" />
          </div>
        ) : loadError ? (
          <div className="rounded-surface border border-line bg-surface-elevated">
            <ErrorState title="No se pudieron cargar las empresas" onRetry={() => { setLoading(true); fetchCompanies(); }} />
          </div>
        ) : (
          <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
            <DataTable
              label="Empresas"
              columns={columns}
              rows={displayed}
              getKey={(c: CompanyRow) => c.id}
              mobileRow={mobileRow}
              empty={<EmptyState title="No hay empresas" body="Agrega tu primera empresa para comenzar." action={primaryAction} />}
            />
          </section>
        )}
      </Enter>

          {showModal && (
            <div className="fixed inset-0 bg-brand-obsidian/35 flex items-center justify-center z-50 p-4">
              <div ref={companyDialogRef} role="dialog" aria-modal="true" aria-labelledby="company-modal-title" className="w-full max-w-md overflow-hidden rounded-surface bg-surface-elevated shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
                <div className="flex items-center justify-between px-6 py-5 border-b border-line">
                  <h2 id="company-modal-title" className="text-base font-semibold text-text-primary">{editingId ? "Editar empresa" : "Agregar empresa"}</h2>
                  <button type="button" onClick={() => setShowModal(false)} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar hover:text-text-primary lg:size-9">
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
                    <span className="text-sm font-semibold text-text-primary">Icono</span>
                    <CompanyIconPicker value={iconDraft} onChange={setIconDraft} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-text-primary">Industria</label>
                    <input type="text" value={formData.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })} className={inputCls} placeholder="Tecnología, Retail..." />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="inline-flex min-h-11 items-center justify-center lg:min-h-10 px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-nav-hover rounded-control transition-colors">Cancelar</button>
                    <button type="submit" className="inline-flex min-h-11 items-center justify-center lg:min-h-10 px-5 py-2.5 text-sm font-semibold text-action-primary-foreground bg-action-primary hover:bg-action-secondary rounded-lg transition-colors">{editingId ? "Guardar cambios" : "Crear empresa"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* SMTP Modal */}
          {showSmtpModal && (
            <div className="fixed inset-0 bg-brand-obsidian/35 flex items-center justify-center z-50 p-4">
              <div ref={smtpDialogRef} role="dialog" aria-modal="true" aria-labelledby="smtp-modal-title" className="w-full max-w-lg overflow-hidden rounded-surface bg-surface-elevated shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
                <div className="flex items-start justify-between px-6 py-5 border-b border-line">
                  <div>
                    <h2 id="smtp-modal-title" className="text-base font-semibold text-text-primary">Configuración SMTP</h2>
                    <p className="text-xs text-text-secondary mt-0.5">Los correos de <span className="font-semibold">{currentSmtpCompany?.name}</span> se enviarán con estas credenciales.</p>
                  </div>
                  <button type="button" onClick={() => setShowSmtpModal(false)} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar hover:text-text-primary lg:size-9">
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
                    <p className="text-xs text-text-secondary">Dejar vacío para no cambiar la contraseña actual.</p>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={smtpData.smtpSecure} onChange={e => setSmtpData({ ...smtpData, smtpSecure: e.target.checked })} className="rounded border-line w-4 h-4" />
                    <span className="text-sm font-medium text-text-primary">Usar conexión segura (SSL/TLS)</span>
                  </label>

                  <div className="mt-2 pt-4 border-t border-line">
                    <p className="text-sm font-semibold text-text-primary mb-3">Probar conexión</p>
                    <div className="flex gap-2">
                      <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} className={inputCls + " flex-1"} placeholder="correo@prueba.com" />
                      <button type="button" onClick={handleSmtpTest} disabled={isTestingSmtp} className="inline-flex min-h-11 items-center justify-center lg:min-h-10 px-4 py-2.5 text-sm font-semibold text-text-primary border border-line bg-surface-elevated hover:bg-surface-sidebar rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                        {isTestingSmtp ? "Probando..." : "Enviar prueba"}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-line mt-2">
                    <button type="button" onClick={() => setShowSmtpModal(false)} className="inline-flex min-h-11 items-center justify-center lg:min-h-10 px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-nav-hover rounded-control transition-colors">Cancelar</button>
                    <button disabled={isSavingSmtp} type="submit" className="inline-flex min-h-11 items-center justify-center lg:min-h-10 px-5 py-2.5 text-sm font-semibold text-action-primary-foreground bg-action-primary hover:bg-action-secondary rounded-lg transition-colors disabled:opacity-50">{isSavingSmtp ? "Guardando..." : "Guardar configuración"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
    </main>
  );
}
