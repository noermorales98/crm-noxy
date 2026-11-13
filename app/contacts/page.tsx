"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import { useAi } from "@/src/hooks/useAi";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, PencilEdit01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { input as inputCls } from "@/src/lib/crm-ui";
import { ContactAvatar } from "@/src/components/ui/EntityIcon";
import { Chip, DataTable, EmptyState, Enter, ErrorState, FilterBar, PageHeader, Segmented, Skeleton, useDialog } from "@/src/components/ui";

type ContactRow = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  company?: { name: string } | null;
};

function ContactsContent() {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState, sortField, sortOrder } = useHeader();

  const [contacts, setContacts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "company">("list");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", companyId: "" });

  const contactDialogRef = useRef<HTMLDivElement>(null);
  useDialog(contactDialogRef, showModal, () => setShowModal(false));

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
      pageHeader: true,
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
    setLoadError(false);
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) setContacts(await res.json());
      else setLoadError(true);
    } catch { console.error("Error loading contacts"); setLoadError(true); }
    finally { setLoading(false); }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ firstName: "", lastName: "", email: "", phone: "", companyId: "" });
    setShowModal(true);
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

  const rowActions = (c: ContactRow) => (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => openEditModal(c)}
        aria-label={`Editar a ${c.firstName} ${c.lastName || ""}`.trim()}
        className="crm-press flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar hover:text-action-primary lg:size-9"
      >
        <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
      </button>
      <button
        type="button"
        onClick={() => handleDelete(c)}
        aria-label={`Eliminar a ${c.firstName} ${c.lastName || ""}`.trim()}
        className="crm-press flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-danger-soft hover:text-danger lg:size-9"
      >
        <HugeiconsIcon icon={Delete01Icon} size={16} />
      </button>
    </div>
  );

  const person = (c: ContactRow) => (
    <Link href={`/contacts/${c.id}`} className="flex min-w-0 items-center gap-3 hover:underline">
      <ContactAvatar />
      <span className="truncate font-semibold text-text-primary" title={`${c.firstName} ${c.lastName || ""}`}>
        {c.firstName} {c.lastName}
      </span>
    </Link>
  );

  const columns = [
    { key: "name", header: "Nombre", render: person },
    { key: "email", header: "Email", render: (c: ContactRow) => <span className="text-text-secondary">{c.email || "Sin email"}</span> },
    { key: "phone", header: "Teléfono", render: (c: ContactRow) => <span className="tabular-nums text-text-secondary">{c.phone || "Sin teléfono"}</span> },
    {
      key: "company",
      header: "Empresa",
      render: (c: ContactRow) => (c.company ? <Chip>{c.company.name}</Chip> : <span className="text-text-secondary">Sin empresa</span>),
    },
    { key: "actions", header: "Acciones", align: "right" as const, render: rowActions },
  ];

  const mobileRowFor = (showCompany: boolean) => (c: ContactRow) => (
    <>
      <ContactAvatar />
      <div className="min-w-0 flex-1">
        <Link href={`/contacts/${c.id}`} className="block truncate font-semibold text-text-primary hover:underline">{c.firstName} {c.lastName}</Link>
        <p className="truncate text-xs text-text-secondary">
          {[showCompany ? c.company?.name : null, c.email].filter(Boolean).join(" · ") || "Sin email"}
        </p>
        {c.phone && (
          <a href={`tel:${c.phone}`} className="inline-flex min-h-11 items-center text-xs font-medium tabular-nums text-action-primary">
            {c.phone}
          </a>
        )}
      </div>
      {rowActions(c)}
    </>
  );
  const mobileRow = mobileRowFor(true);

  const emptyContacts = (
    <EmptyState
      title="No hay contactos"
      body="Agrega tu primer contacto para comenzar."
      action={
        <button type="button" onClick={openCreateModal} className="crm-press inline-flex min-h-11 items-center rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary lg:min-h-10">
          Agregar contacto
        </button>
      }
    />
  );

  return (
    <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
      <Enter index={0}>
        <PageHeader
          title="Contactos"
          subtitle={loading ? "Cargando contactos…" : `${contacts.length} ${contacts.length === 1 ? "contacto" : "contactos"} · Gestiona tus contactos y leads`}
          actions={
            <button
              type="button"
              onClick={openCreateModal}
              className="crm-press inline-flex min-h-11 items-center justify-center rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary lg:min-h-10"
            >
              Agregar contacto
            </button>
          }
        />
      </Enter>

      <Enter index={1}>
        <FilterBar
          segments={
            <Segmented
              label="Vista"
              value={viewMode}
              onChange={(v) => setViewMode(v as "list" | "company")}
              options={[
                { value: "list", label: "Lista" },
                { value: "company", label: "Por empresa" },
              ]}
            />
          }
        />
      </Enter>

      <Enter index={2}>
        {loading ? (
          <div className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
            <Skeleton shape="rows" count={6} label="Cargando contactos" />
          </div>
        ) : loadError ? (
          <div className="rounded-surface border border-line bg-surface-elevated">
            <ErrorState title="No se pudieron cargar los contactos" onRetry={() => { setLoading(true); fetchContacts(); }} />
          </div>
        ) : viewMode === "list" ? (
          <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
            <DataTable label="Contactos" columns={columns} rows={displayed} getKey={(c: ContactRow) => c.id} mobileRow={mobileRow} empty={emptyContacts} />
          </section>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="rounded-surface border border-line bg-surface-elevated">{emptyContacts}</div>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(grouped).map(([companyName, compContacts]) => {
              const items = compContacts as ContactRow[];
              return (
                <section key={companyName} className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
                  <header className="flex min-h-14 items-center gap-2 border-b border-line px-4 sm:px-5">
                    <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-text-primary">{companyName}</h2>
                    <Chip>{`${items.length}`}</Chip>
                  </header>
                  <DataTable
                    label={`Contactos de ${companyName}`}
                    columns={columns.filter((col) => col.key !== "company")}
                    rows={items}
                    getKey={(c: ContactRow) => c.id}
                    mobileRow={mobileRowFor(false)}
                    empty={<EmptyState title="Sin contactos en esta empresa" />}
                  />
                </section>
              );
            })}
          </div>
        )}
      </Enter>

          {showModal && (
            <div className="fixed inset-0 bg-brand-obsidian/35 flex items-center justify-center z-50 p-4">
              <div ref={contactDialogRef} role="dialog" aria-modal="true" aria-labelledby="contact-modal-title" className="w-full max-w-md overflow-hidden rounded-surface bg-surface-elevated shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
                <div className="flex items-center justify-between border-b border-line px-6 py-4">
                  <h2 id="contact-modal-title" className="text-base font-semibold text-text-primary">{editingId ? "Editar contacto" : "Agregar contacto"}</h2>
                  <button type="button" onClick={() => setShowModal(false)} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar hover:text-text-primary lg:size-9">
                    <HugeiconsIcon icon={Cancel01Icon} size={20} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      <option value="">Sin empresa</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="crm-press inline-flex min-h-11 items-center rounded-control px-4 text-sm font-medium text-text-secondary hover:bg-surface-sidebar lg:min-h-10">Cancelar</button>
                    <button type="submit" className="crm-press inline-flex min-h-11 items-center rounded-control bg-action-primary px-5 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary lg:min-h-10">{editingId ? "Guardar cambios" : "Crear contacto"}</button>
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
