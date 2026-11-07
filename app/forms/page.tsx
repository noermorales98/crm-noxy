"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Delete01Icon,
  CodeIcon,
  LinkSquare01Icon,
  Cancel01Icon,
  UserMultipleIcon,
  PencilEdit01Icon,
  Mail01Icon,
  CallIcon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { useHeader } from "@/src/context/HeaderContext";
import { input as inputCls } from "@/src/lib/crm-ui";
import { Chip, DataList, EmptyState, Enter, ErrorState, PageHeader, Skeleton, useDialog } from "@/src/components/ui";
import Link from "next/link";

type Form = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  companyId: string;
  company: { name: string };
  project?: { name: string };
  createdAt: string;
  _count: { fields: number; contacts?: number };
};

type FormContact = {
  id?: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  sourceVariant?: { name?: string | null } | null;
  tasks?: { description?: string | null }[];
};

const primaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-action-primary px-4 text-sm font-semibold text-action-primary-foreground hover:bg-action-secondary disabled:opacity-50 lg:min-h-10";
const secondaryAction =
  "crm-press inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface-elevated px-3 text-sm font-semibold text-text-primary hover:bg-surface-sidebar lg:min-h-9";
const iconAction =
  "crm-press flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-surface-sidebar hover:text-text-primary lg:size-9";
const dialogShell = "w-full rounded-surface bg-surface-elevated shadow-[0_8px_8px_rgba(11,11,24,0.10)]";

export default function FormsPage() {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { setConfig, resetState, sortField, sortOrder, activeFilters } = useHeader();

  const [forms, setForms] = useState<Form[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [selectedFormForContacts, setSelectedFormForContacts] = useState<Form | null>(null);
  const [formContacts, setFormContacts] = useState<FormContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const createDialogRef = useRef<HTMLDivElement>(null);
  const contactsDialogRef = useRef<HTMLDivElement>(null);
  useDialog(createDialogRef, isModalOpen, () => setIsModalOpen(false));
  useDialog(contactsDialogRef, isContactsModalOpen, () => setIsContactsModalOpen(false));

  useEffect(() => {
    resetState();
  }, []);

  useEffect(() => {
    setConfig({
      title: "Formularios",
      titleBadge: isLoading ? undefined : forms.length,
      sortOptions: [
        { label: "Nombre", value: "name" },
        { label: "Fecha de creación", value: "createdAt" },
        { label: "Registrados", value: "contacts" },
      ],
      filterGroups: [
        {
          key: "status",
          label: "Estado",
          options: [
            { label: "Activo", value: "active" },
            { label: "Offline", value: "offline" },
          ],
        },
      ],
      pageHeader: true,
    });
    return () => setConfig({});
  }, [isLoading, forms.length]);

  const fetchForms = async () => {
    setLoadError(false);
    try {
      const res = await fetch("/api/forms");
      if (res.ok) setForms(await res.json());
      else setLoadError(true);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try { const res = await fetch("/api/companies"); if (res.ok) setCompanies(await res.json()); } catch (e) { console.error(e); }
  };

  const fetchProjects = async () => {
    try { const res = await fetch("/api/projects"); if (res.ok) setProjects(await res.json()); } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchForms();
    fetchCompanies();
    fetchProjects();
  }, []);

  const displayed = useMemo(() => {
    let result = [...forms];

    if (activeFilters.status) {
      result = result.filter((f) => (activeFilters.status === "active" ? f.isActive : !f.isActive));
    }

    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";
        if (sortField === "name") { aVal = a.name?.toLowerCase() || ""; bVal = b.name?.toLowerCase() || ""; }
        else if (sortField === "createdAt") { aVal = a.createdAt || ""; bVal = b.createdAt || ""; }
        else if (sortField === "contacts") { aVal = a._count.contacts || 0; bVal = b._count.contacts || 0; }
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [forms, sortField, sortOrder, activeFilters]);

  const handleCreateForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, companyId, projectId: projectId || null }),
      });
      if (res.ok) { setName(""); setDescription(""); setCompanyId(""); setProjectId(""); setIsModalOpen(false); fetchForms(); }
      else { const err = await res.json(); addToast(err.error || "Error al crear el formulario", "error"); }
    } catch { addToast("Error inesperado.", "error"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string, formName: string) => {
    const ok = await confirm({
      title: "Eliminar formulario",
      description: `¿Eliminar permanentemente '${formName}'? Esto deshabilitará cualquier embed activo.`,
      confirmText: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/forms/${id}`, { method: "DELETE" });
      if (res.ok) fetchForms();
      else addToast("No se pudo eliminar el formulario.", "error");
    } catch { addToast("Error inesperado.", "error"); }
  };

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${title} copiado al portapapeles.`, "success");
  };

  const handleViewContacts = async (form: Form) => {
    setSelectedFormForContacts(form);
    setIsContactsModalOpen(true);
    setIsLoadingContacts(true);
    setFormContacts([]);
    try {
      const res = await fetch(`/api/forms/${form.id}/contacts`);
      if (res.ok) setFormContacts(await res.json());
    } catch { addToast("No se pudieron cargar los registrados.", "error"); }
    finally { setIsLoadingContacts(false); }
  };

  const renderForm = (form: Form) => {
    const formUrl = typeof window !== "undefined" ? `${window.location.origin}/form/${form.id}` : "";
    const iframeCode = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0"></iframe>`;
    return (
      <div className="flex w-full min-w-0 flex-col gap-3 py-2 lg:flex-row lg:items-center">
        <Link href={`/forms/${form.id}`} className="group min-w-0 flex-1 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-text-primary group-hover:underline">{form.name}</span>
            <Chip tone={form.isActive ? "done" : "neutral"}>{form.isActive ? "Activo" : "Offline"}</Chip>
          </span>
          <span className="mt-0.5 block truncate text-sm text-text-secondary">{form.description || "Sin descripción."}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
            <span>{form.company?.name || "Empresa desconocida"}</span>
            {form.project && <span className="text-action-primary">Proyecto: {form.project.name}</span>}
            <span className="tabular-nums">{form._count.fields} campos</span>
            <span className="tabular-nums">{new Date(form.createdAt).toLocaleDateString("es-MX")}</span>
          </span>
        </Link>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <button type="button" onClick={() => handleViewContacts(form)} className={secondaryAction}>
            <HugeiconsIcon icon={UserMultipleIcon} size={16} />
            <span className="tabular-nums">{form._count.contacts || 0}</span> registrados
          </button>
          <button type="button" onClick={() => copyToClipboard(formUrl, "Enlace público")} className={iconAction} aria-label={`Copiar enlace público de ${form.name}`} title="Copiar enlace público">
            <HugeiconsIcon icon={LinkSquare01Icon} size={16} />
          </button>
          <button type="button" onClick={() => copyToClipboard(iframeCode, "Código iframe")} className={iconAction} aria-label={`Copiar código iframe de ${form.name}`} title="Copiar código iframe">
            <HugeiconsIcon icon={CodeIcon} size={16} />
          </button>
          <Link href={`/forms/${form.id}`} className={iconAction} aria-label={`Editar ${form.name} en el constructor`} title="Constructor">
            <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
          </Link>
          <button
            type="button"
            onClick={() => handleDelete(form.id, form.name)}
            className={`${iconAction} hover:bg-danger-soft hover:text-danger`}
            aria-label={`Eliminar ${form.name}`}
            title="Eliminar formulario"
          >
            <HugeiconsIcon icon={Delete01Icon} size={16} />
          </button>
        </div>
      </div>
    );
  };

  const active = forms.filter((f) => f.isActive).length;

  return (
    <>
      <main className="crm-mobile-bottom-clearance flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        <Enter index={0}>
          <PageHeader
            title="Formularios"
            subtitle={isLoading ? "Cargando formularios…" : `${active} activos · formularios embebibles para capturar leads desde tu sitio web`}
            actions={
              <button type="button" onClick={() => setIsModalOpen(true)} className={primaryAction}>
                <HugeiconsIcon icon={Add01Icon} size={16} />
                Crear formulario
              </button>
            }
          />
        </Enter>

        <Enter index={1}>
          <section className="overflow-hidden rounded-surface border border-line bg-surface-elevated">
            {isLoading ? (
              <Skeleton shape="rows" count={4} label="Cargando formularios" />
            ) : loadError && forms.length === 0 ? (
              <ErrorState title="No se pudieron cargar los formularios" onRetry={() => { setIsLoading(true); fetchForms(); }} />
            ) : (
              <DataList
                label="Formularios"
                rows={displayed}
                getKey={(f) => f.id}
                renderRow={renderForm}
                empty={
                  activeFilters.status ? (
                    <EmptyState title="Sin resultados" body="Prueba con otro filtro." />
                  ) : (
                    <EmptyState
                      title="No hay formularios"
                      body="Crea tu primer formulario para capturar leads."
                      action={
                        <button type="button" onClick={() => setIsModalOpen(true)} className={primaryAction}>
                          <HugeiconsIcon icon={Add01Icon} size={16} />
                          Crear formulario
                        </button>
                      }
                    />
                  )
                }
              />
            )}
          </section>
        </Enter>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4">
          <div ref={createDialogRef} role="dialog" aria-modal="true" aria-labelledby="create-form-title" className={`${dialogShell} max-w-md overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 id="create-form-title" className="text-base font-semibold text-text-primary">Crear formulario</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} aria-label="Cerrar" className={iconAction}>
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <form id="createForm" onSubmit={handleCreateForm} className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="form-company" className="text-sm font-semibold text-text-primary">Empresa</label>
                <select id="form-company" required value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputCls}>
                  <option value="" disabled>Seleccionar empresa</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="form-project" className="text-sm font-semibold text-text-primary">Proyecto (opcional)</label>
                <select id="form-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
                  <option value="">Sin proyecto</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="form-name" className="text-sm font-semibold text-text-primary">Nombre del formulario</label>
                <input id="form-name" type="text" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="form-description" className="text-sm font-semibold text-text-primary">Descripción interna (opcional)</label>
                <textarea id="form-description" rows={3} maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} resize-none`} />
              </div>
            </form>
            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className={secondaryAction}>Cancelar</button>
              <button type="submit" form="createForm" disabled={isSubmitting} className={primaryAction}>{isSubmitting ? "Creando..." : "Crear formulario"}</button>
            </div>
          </div>
        </div>
      )}

      {isContactsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4">
          <div ref={contactsDialogRef} role="dialog" aria-modal="true" aria-labelledby="form-contacts-title" className={`${dialogShell} flex max-h-[80vh] max-w-2xl flex-col overflow-hidden`}>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-6 py-4">
              <div className="min-w-0">
                <h2 id="form-contacts-title" className="text-base font-semibold text-text-primary">Registrados</h2>
                <p className="truncate text-sm text-text-secondary">Últimos registros en {selectedFormForContacts?.name}</p>
              </div>
              <button type="button" onClick={() => setIsContactsModalOpen(false)} aria-label="Cerrar" className={iconAction}>
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoadingContacts ? (
                <Skeleton shape="rows" count={3} label="Cargando registrados" />
              ) : (
                <DataList
                  label="Registrados del formulario"
                  rows={formContacts}
                  getKey={(c) => c.id || `${c.firstName}-${c.createdAt}`}
                  empty={<EmptyState title="Sin leads registrados" body="Nadie ha llenado este formulario aún." />}
                  renderRow={(contact) => {
                    const extraFieldsBody = contact.tasks?.[0]?.description;
                    const variantName = contact.sourceVariant?.name;
                    return (
                      <div className="flex w-full min-w-0 flex-col gap-2 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-text-primary">{contact.firstName} {contact.lastName || ""}</p>
                              {variantName && (
                                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-amber-50 px-2 text-xs font-semibold text-amber-800">
                                  <HugeiconsIcon icon={Tag01Icon} size={12} /> {variantName}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
                              {contact.email && (
                                <span className="flex items-center gap-1"><HugeiconsIcon icon={Mail01Icon} size={14} /> {contact.email}</span>
                              )}
                              {contact.phone && (
                                <span className="flex items-center gap-1"><HugeiconsIcon icon={CallIcon} size={14} /> {contact.phone}</span>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-surface-sidebar px-2 py-0.5 text-xs font-semibold tabular-nums text-text-secondary">
                            {new Date(contact.createdAt).toLocaleDateString("es-MX")}
                          </span>
                        </div>
                        {extraFieldsBody && extraFieldsBody !== "No additional fields provided." && (
                          <div className="whitespace-pre-line rounded-control border border-line bg-surface-sidebar p-3 text-xs text-text-secondary">{extraFieldsBody}</div>
                        )}
                      </div>
                    );
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
