"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, SaveIcon, Add01Icon, HandGripIcon, Delete01Icon, Settings02Icon, Layout01Icon, Copy01Icon, LinkSquare02Icon, CheckmarkCircle01Icon, GitBranchIcon, LinkSquare01Icon, PencilEdit01Icon, ToggleOffIcon, ToggleOnIcon, UserMultipleIcon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useHeader } from "@/src/context/HeaderContext";
import { CheckRow, Switch, useDialog } from "@/src/components/ui";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import Link from "next/link";
import FormWhatsAppRecipients from "@/src/components/FormWhatsAppRecipients";
import FormApiConfig from "@/src/components/FormApiConfig";

const FIELD_TYPES = [
  { value: "TEXT", label: "Texto Corto" },
  { value: "PREDEFINED_NAME", label: "Nombre Completo (Nombre y Apellido)" },
  { value: "TEXTAREA", label: "Texto Largo (Párrafo)" },
  { value: "EMAIL", label: "Correo Electrónico" },
  { value: "PHONE", label: "Teléfono" },
  { value: "PHONE_LADA", label: "Teléfono con Lada" },
  { value: "NUMBER", label: "Número" },
  { value: "DATE", label: "Fecha" },
  { value: "SELECT", label: "Lista Desplegable" },
  { value: "CHECKBOX", label: "Casillas de Verificación" },
  { value: "RADIO", label: "Botones de Opción" },
];

const DEFAULT_ACCENT_COLOR = "#4f46e5";
const DEFAULT_BACKGROUND_COLOR = "#f7f6f3";

/** Control de color: selector visual + input hex sincronizados. Vacío = color por defecto. */
function ColorSetting({
  label,
  help,
  value,
  fallback,
  onChange,
}: {
  label: string;
  help: string;
  value: string;
  fallback: string;
  onChange: (v: string) => void;
}) {
  const hexRe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  const pickerValue = hexRe.test(value) ? (value.length === 4 ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}` : value) : fallback;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-text-secondary">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={e => onChange(e.target.value)}
          className="size-11 shrink-0 rounded-control border border-line bg-surface-sidebar cursor-pointer p-1"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value.trim())}
          placeholder={fallback}
          className={`w-28 min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm font-mono focus:outline-none focus:ring-1 focus:ring-focus/40 ${value && !hexRe.test(value) ? "border-red-300 text-red-600" : ""}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-text-secondary hover:text-text-primary hover:underline"
          >
            Quitar
          </button>
        )}
      </div>
      <p className="text-xs text-text-secondary">{help}</p>
    </div>
  );
}

function FieldPreview({ field }: { field: any }) {
  const base = "noxy-form-control min-h-10 py-2 text-sm text-text-secondary pointer-events-none";
  const opts = field.options ? field.options.split(",").map((o: string) => o.trim()).filter(Boolean) : [];

  return (
    <div className="flex flex-col gap-2">
      <label className="noxy-form-label">
        {field.label || "Sin etiqueta"} {field.isRequired && <span className="text-red-400">*</span>}
      </label>
      {(field.type === "TEXT" || field.type === "EMAIL" || field.type === "PHONE" || field.type === "NUMBER" || field.type === "DATE") && (
        <div className={base}>{field.placeholder || "—"}</div>
      )}
      {field.type === "PREDEFINED_NAME" && (
        <div className="flex gap-2">
          <div className={`${base} flex-1`}>Nombre</div>
          <div className={`${base} flex-1`}>Apellido</div>
        </div>
      )}
      {field.type === "PHONE_LADA" && (
        <div className="flex flex-col gap-2">
          <div className="noxy-form-control min-h-10 py-2 text-sm text-text-secondary pointer-events-none">🇲🇽 +52 México</div>
          <div className={base}>{field.placeholder || "Número de teléfono"}</div>
        </div>
      )}
      {field.type === "TEXTAREA" && (
        <div className={`${base} h-14`}>{field.placeholder || "—"}</div>
      )}
      {field.type === "SELECT" && (
        <div className={base}>
          {opts[0] || "Selecciona una opción"}
        </div>
      )}
      {field.type === "RADIO" && (
        <div className="flex flex-col gap-1">
          {(opts.length ? opts : ["Opción 1"]).map((opt: string, i: number) => (
            <label key={i} className="flex min-h-8 items-center gap-2 text-xs text-text-secondary pointer-events-none">
              <div className="w-5 h-5 rounded-full border-2 border-line shrink-0" />
              {opt}
            </label>
          ))}
        </div>
      )}
      {field.type === "CHECKBOX" && (
        <div className="flex flex-col gap-1">
          {(opts.length ? opts : ["Opción 1"]).map((opt: string, i: number) => (
            <label key={i} className="flex min-h-8 items-center gap-2 text-xs text-text-secondary pointer-events-none">
              <div className="w-5 h-5 rounded-control border-2 border-line shrink-0" />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FormBuilderPage() {
  const { addToast } = useToast();
  const { setConfig, resetState } = useHeader();
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    resetState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La barra superior muestra el nombre y vuelve a la lista; el h1 vive en la barra del constructor.
  useEffect(() => {
    setConfig({ title: name || "Formulario", backHref: "/forms", pageHeader: true });
    return () => setConfig({});
  }, [name, setConfig]);
  const [isActive, setIsActive] = useState(true);
  const [successAction, setSuccessAction] = useState("MESSAGE");
  const [successMessage, setSuccessMessage] = useState("Thank you for your submission!");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [welcomeEmailId, setWelcomeEmailId] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<any[]>([]);
  const [appointmentTypeId, setAppointmentTypeId] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [showNoxyBrand, setShowNoxyBrand] = useState(true);
  const [fields, setFields] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"BUILDER" | "SETTINGS" | "VARIANTS" | "API">("BUILDER");

  // Variants state
  const [variants, setVariants] = useState<any[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const variantDialogRef = useRef<HTMLDivElement>(null);
  useDialog(variantDialogRef, isVariantModalOpen, () => setIsVariantModalOpen(false));
  const [editingVariant, setEditingVariant] = useState<any>(null);
  const [variantName, setVariantName] = useState("");
  const [variantDescription, setVariantDescription] = useState("");
  const [isSavingVariant, setIsSavingVariant] = useState(false);
  const [copiedVariantId, setCopiedVariantId] = useState<string | null>(null);

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/form/${id}` : `/form/${id}`;

  useEffect(() => {
    fetchForm();
    fetchCampaigns();
    fetchAppointmentTypes();
    fetchVariants();
  }, [id]);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) setCampaigns(await res.json());
    } catch { }
  };

  const fetchAppointmentTypes = async () => {
    try {
      const res = await fetch("/api/appointment-types");
      if (res.ok) setAppointmentTypes(await res.json());
    } catch { }
  };

  const fetchVariants = async () => {
    setIsLoadingVariants(true);
    try {
      const res = await fetch(`/api/forms/${id}/variants`);
      if (res.ok) setVariants(await res.json());
    } catch { }
    finally { setIsLoadingVariants(false); }
  };

  const openNewVariantModal = () => {
    setEditingVariant(null);
    setVariantName("");
    setVariantDescription("");
    setIsVariantModalOpen(true);
  };

  const openEditVariantModal = (variant: any) => {
    setEditingVariant(variant);
    setVariantName(variant.name);
    setVariantDescription(variant.description || "");
    setIsVariantModalOpen(true);
  };

  const handleSaveVariant = async () => {
    if (!variantName.trim()) return;
    setIsSavingVariant(true);
    try {
      if (editingVariant) {
        const res = await fetch(`/api/forms/${id}/variants/${editingVariant.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: variantName, description: variantDescription })
        });
        if (res.ok) { addToast("Variante actualizada", "success"); fetchVariants(); setIsVariantModalOpen(false); }
        else { addToast("Error al actualizar", "error"); }
      } else {
        const res = await fetch(`/api/forms/${id}/variants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: variantName, description: variantDescription })
        });
        if (res.ok) { addToast("Variante creada", "success"); fetchVariants(); setIsVariantModalOpen(false); }
        else { addToast("Error al crear variante", "error"); }
      }
    } catch { addToast("Error inesperado", "error"); }
    finally { setIsSavingVariant(false); }
  };

  const handleDeleteVariant = async (variant: any) => {
    const res = await fetch(`/api/forms/${id}/variants/${variant.id}`, { method: "DELETE" });
    if (res.ok) { addToast("Variante eliminada", "success"); fetchVariants(); }
    else { addToast("Error al eliminar", "error"); }
  };

  const handleToggleVariant = async (variant: any) => {
    const res = await fetch(`/api/forms/${id}/variants/${variant.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !variant.isActive })
    });
    if (res.ok) fetchVariants();
  };

  const copyVariantLink = (variantId: string) => {
    const url = `${publicUrl}?v=${variantId}`;
    navigator.clipboard.writeText(url);
    setCopiedVariantId(variantId);
    setTimeout(() => setCopiedVariantId(null), 2000);
  };

  const fetchForm = async () => {
    try {
      const res = await fetch(`/api/forms/${id}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setDescription(data.description || "");
        setIsActive(data.isActive);
        setSuccessAction(data.successAction);
        setSuccessMessage(data.successMessage || "");
        setRedirectUrl(data.redirectUrl || "");
        setWelcomeEmailId(data.welcomeEmailId || "");
        setAppointmentTypeId(data.appointmentTypeId || "");
        setAccentColor(data.accentColor || "");
        setBackgroundColor(data.backgroundColor || "");
        setShowNoxyBrand(data.showNoxyBrand !== false);
        setFields(data.fields || []);
      } else {
        addToast("Formulario no encontrado", "error");
        router.push("/forms");
      }
    } catch { }
    finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const orderedFields = fields.map((f, i) => ({ ...f, order: i }));
    try {
      const res = await fetch(`/api/forms/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, isActive, successAction, successMessage, redirectUrl, welcomeEmailId, appointmentTypeId, accentColor: accentColor || null, backgroundColor: backgroundColor || null, showNoxyBrand, fields: orderedFields })
      });
      if (res.ok) {
        addToast("Formulario guardado", "success");
        fetchForm();
      } else {
        const err = await res.json();
        addToast(err.error || "Error al guardar", "error");
      }
    } catch {
      addToast("Error inesperado", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addField = () => {
    setFields(prev => [...prev, {
      id: `temp-${Date.now()}`,
      type: "TEXT",
      label: "Nuevo campo",
      name: `field_${Date.now()}`,
      placeholder: "",
      isRequired: false,
      options: "",
      order: fields.length
    }]);
  };

  const removeField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: string, value: any) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, [key]: value } : f));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(fields);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setFields(items);
  };

  if (isLoading) return (
    <div className="flex-1 min-h-0 flex items-center justify-center text-text-secondary text-sm bg-background font-sans">Cargando formulario...</div>
  );

  return (
    <>
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background font-sans">
          {/* Top Bar */}
          <div className="border-b border-line bg-surface-elevated px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
            {/* En móvil la barra superior ya muestra el nombre: aquí queda solo para lectores de pantalla. */}
            <div className="sr-only min-w-0 flex-1 lg:not-sr-only">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-text-primary truncate">{name || "Sin título"}</h1>
                <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-green-50 text-green-700" : "bg-surface-sidebar text-text-secondary"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-text-secondary"}`} />
                  {isActive ? "Activo" : "Borrador"}
                </span>
              </div>
              <p className="text-xs text-text-secondary truncate">{publicUrl}</p>
            </div>

            {/* Tabs */}
            <div className="order-3 flex w-full overflow-x-auto bg-surface-sidebar p-1 rounded-control shrink-0 xl:order-none xl:w-auto">
              <button
                onClick={() => setActiveTab("BUILDER")}
                className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold ${activeTab === "BUILDER" ? "bg-surface-elevated text-text-primary" : "text-text-secondary-strong hover:text-text-primary"}`}
              >
                <HugeiconsIcon icon={Layout01Icon} size={14} />
                Constructor
              </button>
              <button
                onClick={() => setActiveTab("SETTINGS")}
                className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold ${activeTab === "SETTINGS" ? "bg-surface-elevated text-text-primary" : "text-text-secondary-strong hover:text-text-primary"}`}
              >
                <HugeiconsIcon icon={Settings02Icon} size={14} />
                Configuración
              </button>
              <button
                onClick={() => setActiveTab("VARIANTS")}
                className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold ${activeTab === "VARIANTS" ? "bg-surface-elevated text-text-primary" : "text-text-secondary-strong hover:text-text-primary"}`}
              >
                <HugeiconsIcon icon={GitBranchIcon} size={14} />
                Variantes
                {variants.length > 0 && (
                  <span className="bg-nav-active text-text-primary rounded-full px-1.5 py-0 text-xs font-bold">{variants.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("API")}
                className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold ${activeTab === "API" ? "bg-surface-elevated text-text-primary" : "text-text-secondary-strong hover:text-text-primary"}`}
              >
                <HugeiconsIcon icon={LinkSquare02Icon} size={14} />
                API
              </button>
            </div>

            {/* Actions */}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyLink}
                className={`hidden sm:flex min-h-11 items-center gap-1.5 px-3 py-2 rounded-control text-sm font-semibold border lg:min-h-10 ${copied ? "border-green-200 bg-green-50 text-green-700" : "border-line bg-surface-elevated text-text-secondary hover:bg-surface-sidebar"}`}
              >
                {copied ? <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} /> : <HugeiconsIcon icon={Copy01Icon} size={14} />}
                {copied ? "¡Copiado!" : "Copiar link"}
              </button>
              <Link
                href={`/form/${id}`}
                target="_blank"
                className="hidden sm:flex min-h-10 items-center gap-1.5 px-3 py-2 rounded-control text-xs font-semibold border border-line bg-surface-elevated text-text-secondary hover:bg-surface-sidebar"
              >
                <HugeiconsIcon icon={LinkSquare02Icon} size={14} />
                Ver
              </Link>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="crm-press flex min-h-11 items-center gap-1.5 bg-action-primary hover:bg-action-secondary text-action-primary-foreground px-4 py-2 rounded-control text-sm font-semibold disabled:opacity-50 lg:min-h-10"
              >
                <HugeiconsIcon icon={SaveIcon} size={14} />
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="crm-mobile-bottom-clearance flex-1 overflow-y-auto xl:overflow-hidden">

            {/* BUILDER TAB — two columns */}
            {activeTab === "BUILDER" && (
              <div className="flex min-h-full flex-col xl:h-full xl:min-h-0 xl:flex-row">
                {/* Left: Field List */}
                <div className="flex-none overflow-visible p-4 sm:p-6 xl:flex-1 xl:overflow-y-auto xl:border-r border-line">
                  <div className="max-w-xl mx-auto flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-sm font-bold text-text-primary">Campos del formulario</h2>
                      <span className="text-xs text-text-secondary">{fields.length} campo{fields.length !== 1 ? "s" : ""}</span>
                    </div>

                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="form-fields">
                        {(provided: any) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-2">
                            {fields.map((field, index) => (
                              <Draggable key={field.id} draggableId={field.id} index={index}>
                                {(provided: any, snapshot: any) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`bg-surface-elevated rounded-lg ${snapshot.isDragging ? "ring-2 ring-black/5" : ""}`}
                                  >
                                    {/* Field Header */}
                                    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-line bg-surface-sidebar rounded-t-xl">
                                      <div {...provided.dragHandleProps} aria-label={`Reordenar campo ${index + 1}`} title={`Reordenar campo ${index + 1}`} className="-my-2 flex size-11 shrink-0 cursor-grab items-center justify-center rounded-control text-text-secondary hover:bg-surface-elevated hover:text-text-primary lg:size-8">
                                        <HugeiconsIcon icon={HandGripIcon} size={16} />
                                      </div>
                                      <span className="text-xs font-semibold text-text-secondary-strong">Campo {index + 1}</span>
                                      <span className="text-xs text-text-secondary bg-surface-app px-2 py-0.5 rounded-full font-medium">
                                        {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                                      </span>
                                      <button onClick={() => removeField(index)} aria-label={`Eliminar campo ${index + 1}`} className="-my-2 ml-auto flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-danger-soft hover:text-danger lg:size-8">
                                        <HugeiconsIcon icon={Delete01Icon} size={14} />
                                      </button>
                                    </div>

                                    {/* Field Body */}
                                    <div className="p-4 grid grid-cols-2 gap-3">
                                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                                        <label htmlFor={`field-${field.id}-type`} className="noxy-form-label">Tipo</label>
                                        <select
                                          id={`field-${field.id}-type`}
                                          value={field.type}
                                          onChange={e => updateField(index, "type", e.target.value)}
                                          className="noxy-form-control text-xs"
                                        >
                                          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                      </div>

                                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                                        <label htmlFor={`field-${field.id}-label`} className="noxy-form-label">Etiqueta / pregunta</label>
                                        <input
                                          id={`field-${field.id}-label`}
                                          type="text"
                                          value={field.label}
                                          onChange={e => updateField(index, "label", e.target.value)}
                                          placeholder="¿Cuál es tu nombre?"
                                          className="noxy-form-control text-xs"
                                        />
                                      </div>

                                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                                        <label htmlFor={`field-${field.id}-name`} className="noxy-form-label">Nombre interno</label>
                                        <input
                                          id={`field-${field.id}-name`}
                                          type="text"
                                          value={field.name}
                                          onChange={e => updateField(index, "name", e.target.value)}
                                          placeholder="nombre_campo"
                                          className="noxy-form-control text-xs font-mono"
                                        />
                                      </div>

                                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                                        <label htmlFor={`field-${field.id}-placeholder`} className="noxy-form-label">Placeholder</label>
                                        <input
                                          id={`field-${field.id}-placeholder`}
                                          type="text"
                                          value={field.placeholder || ""}
                                          onChange={e => updateField(index, "placeholder", e.target.value)}
                                          placeholder="Escribe aquí..."
                                          className="noxy-form-control text-xs"
                                        />
                                      </div>

                                      {(field.type === "SELECT" || field.type === "RADIO" || field.type === "CHECKBOX") && (
                                        <div className="flex flex-col gap-1 col-span-2">
                                          <label htmlFor={`field-${field.id}-options`} className="noxy-form-label">Opciones (separadas por coma)</label>
                                          <textarea
                                            id={`field-${field.id}-options`}
                                            rows={2}
                                            value={field.options || ""}
                                            onChange={e => updateField(index, "options", e.target.value)}
                                            placeholder="Opción 1, Opción 2, Opción 3"
                                            className="noxy-form-control min-h-20 text-xs resize-none"
                                          />
                                        </div>
                                      )}

                                      <div className="col-span-2 -mx-3"><CheckRow checked={field.isRequired} onChange={(next) => updateField(index, "isRequired", next)} label="Campo obligatorio" /></div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>

                    <button
                      onClick={addField}
                      className="w-full py-4 border-2 border-dashed border-line hover:bg-nav-hover hover:bg-surface-sidebar rounded-lg flex items-center justify-center gap-2 text-text-secondary hover:text-text-primary text-sm font-semibold"
                    >
                      <HugeiconsIcon icon={Add01Icon} size={16} />
                      Agregar campo
                    </button>

                    {fields.length === 0 && (
                      <p className="text-center text-xs text-text-secondary py-4">
                        El formulario no tiene campos. Agrega uno para comenzar.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Live Preview */}
                <aside className="w-full xl:w-96 shrink-0 overflow-visible bg-surface-sidebar p-4 sm:p-6 xl:overflow-y-auto" aria-label="Vista previa del formulario">
                  <div className="mb-4">
                    <span className="text-xs font-semibold text-text-secondary">Vista previa</span>
                  </div>
                  <div className="noxy-form-panel p-6 flex flex-col gap-5">
                    <div>
                      <h2 className="text-base font-bold text-text-primary leading-tight">{name || "Sin título"}</h2>
                      {description && <p className="text-xs text-text-secondary mt-1">{description}</p>}
                    </div>

                    {fields.length === 0 ? (
                      <p className="text-xs text-text-secondary text-center py-6">Sin campos</p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {fields.map((field, i) => (
                          <FieldPreview key={field.id || i} field={field} />
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-line">
                      <div className="noxy-form-button w-full text-xs pointer-events-none">
                        Enviar
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {/* VARIANTS TAB */}
            {activeTab === "VARIANTS" && (
              <div className="overflow-y-auto h-full p-6">
                <div className="max-w-2xl mx-auto flex flex-col gap-6">

                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-text-primary">Variantes del formulario</h2>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Cada variante genera un link único. Cuando alguien se registre a través de un link de variante, podrás ver de cuál vino en el perfil del lead.
                      </p>
                    </div>
                    <button
                      onClick={openNewVariantModal}
                      className="crm-press shrink-0 flex min-h-11 items-center gap-1.5 bg-action-primary hover:bg-action-secondary text-action-primary-foreground px-3 py-2 rounded-control text-sm font-semibold lg:min-h-9"
                    >
                      <HugeiconsIcon icon={Add01Icon} size={14} />
                      Nueva variante
                    </button>
                  </div>

                  {/* How it works */}
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-xs text-amber-800">
                    <p className="font-bold mb-1">¿Cómo funciona?</p>
                    <p>Crea una variante por cada oferta, precio o fuente de tráfico. Comparte el link único de cada variante. Cuando un lead se registre, verás exactamente en qué variante se registró. Así sabes si un lead viene del plan de $8,000 MXN o del de $15,000 MXN.</p>
                  </div>

                  {/* Variants List */}
                  {isLoadingVariants ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-line border-t-action-primary rounded-full animate-spin" role="status" aria-label="Cargando variantes" />
                    </div>
                  ) : variants.length === 0 ? (
                    <div className="bg-surface-elevated border border-dashed border-line rounded-lg p-10 text-center">
                      <HugeiconsIcon icon={GitBranchIcon} size={28} className="mx-auto mb-3 text-text-secondary" />
                      <p className="text-sm font-semibold text-text-secondary">Sin variantes</p>
                      <p className="text-xs text-text-secondary mt-1">Crea tu primera variante para segmentar tus leads por oferta o fuente.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {variants.map((variant) => {
                        const variantUrl = `${publicUrl}?v=${variant.id}`;
                        const isCopied = copiedVariantId === variant.id;
                        return (
                          <div key={variant.id} className="bg-surface-elevated rounded-lg border border-line overflow-hidden">
                            <div className="p-4 flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-text-primary">{variant.name}</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${variant.isActive ? "bg-green-50 text-green-700" : "bg-surface-sidebar text-text-secondary"}`}>
                                    {variant.isActive ? "Activa" : "Inactiva"}
                                  </span>
                                  <span className="text-xs text-text-secondary bg-surface-sidebar px-2 py-0.5 rounded-full border border-line">
                                    <HugeiconsIcon icon={UserMultipleIcon} size={12} className="inline mr-1" />
                                    {variant._count?.contacts ?? 0} leads
                                  </span>
                                </div>
                                {variant.description && (
                                  <p className="text-xs text-text-secondary mt-0.5">{variant.description}</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-2">
                                  <code className="text-xs text-text-secondary font-mono bg-surface-sidebar border border-line px-2 py-1 rounded-lg truncate max-w-xs">
                                    {variantUrl}
                                  </code>
                                  <button
                                    onClick={() => copyVariantLink(variant.id)}
                                    className={`shrink-0 flex min-h-11 items-center gap-1 px-3 rounded-control border text-sm font-semibold lg:min-h-8 ${isCopied ? "border-green-200 bg-green-50 text-green-700" : "border-line text-text-secondary hover:bg-surface-sidebar"}`}
                                  >
                                    {isCopied ? <HugeiconsIcon icon={CheckmarkCircle01Icon} size={11} /> : <HugeiconsIcon icon={Copy01Icon} size={11} />}
                                    {isCopied ? "¡Copiado!" : "Copiar"}
                                  </button>
                                  <a
                                    href={variantUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 flex min-h-11 items-center gap-1 px-3 rounded-control border border-line text-sm font-semibold text-text-secondary hover:bg-surface-sidebar lg:min-h-8"
                                  >
                                    <HugeiconsIcon icon={LinkSquare02Icon} size={11} />
                                    Ver
                                  </a>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleToggleVariant(variant)}
                                  className="flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar hover:text-text-primary lg:size-8"
                                  title={variant.isActive ? "Desactivar" : "Activar"}
                                  aria-label={`${variant.isActive ? "Desactivar" : "Activar"} ${variant.name}`}
                                  aria-pressed={variant.isActive}
                                >
                                  {variant.isActive ? <HugeiconsIcon icon={ToggleOnIcon} size={18} color="#16a34a" /> : <HugeiconsIcon icon={ToggleOffIcon} size={18} />}
                                </button>
                                <button
                                  onClick={() => openEditVariantModal(variant)}
                                  className="flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar hover:text-text-primary lg:size-8"
                                  title="Editar"
                                  aria-label={`Editar ${variant.name}`}
                                >
                                  <HugeiconsIcon icon={PencilEdit01Icon} size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteVariant(variant)}
                                  className="flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-danger-soft hover:text-danger lg:size-8"
                                  title="Eliminar"
                                  aria-label={`Eliminar ${variant.name}`}
                                >
                                  <HugeiconsIcon icon={Delete01Icon} size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* API TAB */}
            {activeTab === "API" && (
              <div className="overflow-y-auto h-full">
                <FormApiConfig formId={id as string} />
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === "SETTINGS" && (
              <div className="overflow-y-auto h-full p-6">
                <div className="max-w-2xl mx-auto flex flex-col gap-6">

                  {/* General */}
                  <section className="bg-surface-elevated rounded-lg border border-line overflow-hidden">
                    <div className="px-6 py-4 border-b border-line">
                      <h2 className="text-sm font-bold text-text-primary">General</h2>
                    </div>
                    <div className="p-6 flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-secondary">Nombre del formulario</label>
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm focus:outline-none focus:ring-1 focus:ring-focus/40"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-secondary">Descripción interna</label>
                        <textarea
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          rows={3}
                          className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm resize-none focus:outline-none focus:ring-1 focus:ring-focus/40"
                        />
                      </div>
                      <div className="flex items-center justify-between py-3 px-4 bg-surface-sidebar rounded-lg border border-line">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">Formulario activo</p>
                          <p className="text-xs text-text-secondary">Permite recibir envíos públicos</p>
                        </div>
                        <Switch checked={isActive} onChange={setIsActive} label="Formulario activo" />
                      </div>
                    </div>
                  </section>

                  {/* Apariencia */}
                  <section className="bg-surface-elevated rounded-lg border border-line overflow-hidden">
                    <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-text-primary">Apariencia</h2>
                        <p className="text-xs text-text-secondary mt-0.5">Personaliza los colores de la página pública del formulario</p>
                      </div>
                      {(accentColor || backgroundColor) && (
                        <button
                          type="button"
                          onClick={() => { setAccentColor(""); setBackgroundColor(""); }}
                          className="text-xs font-semibold text-text-secondary hover:text-text-primary hover:underline shrink-0"
                        >
                          Restablecer
                        </button>
                      )}
                    </div>
                    <div className="p-6 flex flex-col gap-5">
                      <ColorSetting
                        label="Color de acento (botones)"
                        help={`Vacío = color por defecto (${DEFAULT_ACCENT_COLOR}).`}
                        value={accentColor}
                        fallback={DEFAULT_ACCENT_COLOR}
                        onChange={setAccentColor}
                      />
                      <ColorSetting
                        label="Color de fondo"
                        help={`Vacío = color por defecto (${DEFAULT_BACKGROUND_COLOR}).`}
                        value={backgroundColor}
                        fallback={DEFAULT_BACKGROUND_COLOR}
                        onChange={setBackgroundColor}
                      />
                      <div className="flex items-center justify-between py-3 px-4 bg-surface-sidebar rounded-lg border border-line">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">Leyenda “Desarrollado por Noxy”</p>
                          <p className="text-xs text-text-secondary">Aparece al pie de la página pública del formulario</p>
                        </div>
                        <Switch checked={showNoxyBrand} onChange={setShowNoxyBrand} label="Leyenda Desarrollado por Noxy" />
                      </div>
                    </div>
                  </section>

                  {/* On Submit */}
                  <section className="bg-surface-elevated rounded-lg border border-line overflow-hidden">
                    <div className="px-6 py-4 border-b border-line">
                      <h2 className="text-sm font-bold text-text-primary">Al enviar el formulario</h2>
                    </div>
                    <div className="p-6 flex flex-col gap-4">
                      <div className="flex gap-3">
                        {[
                          { value: "MESSAGE", label: "Mostrar mensaje" },
                          { value: "REDIRECT", label: "Redirigir a URL" },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setSuccessAction(opt.value)}
                            className={`flex-1 min-h-11 py-2.5 rounded-control border text-sm font-semibold ${successAction === opt.value ? "border-action-primary bg-action-primary text-action-primary-foreground" : "border-line text-text-secondary hover:bg-surface-sidebar"}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {successAction === "MESSAGE" && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-text-secondary">Mensaje de éxito</label>
                          <textarea
                            value={successMessage}
                            onChange={e => setSuccessMessage(e.target.value)}
                            rows={2}
                            className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm resize-none focus:outline-none focus:ring-1 focus:ring-focus/40"
                          />
                        </div>
                      )}
                      {successAction === "REDIRECT" && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-text-secondary">URL de redirección</label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={redirectUrl}
                            onChange={e => setRedirectUrl(e.target.value)}
                            className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm focus:outline-none focus:ring-1 focus:ring-focus/40"
                          />
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Email de bienvenida */}
                  <section className="bg-surface-elevated rounded-lg border border-line overflow-hidden">
                    <div className="px-6 py-4 border-b border-line">
                      <h2 className="text-sm font-bold text-text-primary">Email de bienvenida</h2>
                      <p className="text-xs text-text-secondary mt-0.5">Envía un email automáticamente a nuevos leads</p>
                    </div>
                    <div className="p-6">
                      <select
                        value={welcomeEmailId}
                        onChange={e => setWelcomeEmailId(e.target.value)}
                        className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm focus:outline-none focus:ring-1 focus:ring-focus/40"
                      >
                        <option value="">No enviar email de bienvenida</option>
                        {campaigns.map(c => (
                          <option key={c.id} value={c.id}>{c.subject}</option>
                        ))}
                      </select>
                      <p className="text-xs text-text-secondary mt-2">Selecciona un borrador de campaña como plantilla.</p>
                    </div>
                  </section>

                  {/* Calendario */}
                  <section className="bg-surface-elevated rounded-lg border border-line overflow-hidden">
                    <div className="px-6 py-4 border-b border-line">
                      <h2 className="text-sm font-bold text-text-primary">Integración con Calendario</h2>
                      <p className="text-xs text-text-secondary mt-0.5">Muestra un selector de citas en el formulario público</p>
                    </div>
                    <div className="p-6">
                      <select
                        value={appointmentTypeId}
                        onChange={e => setAppointmentTypeId(e.target.value)}
                        className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-sm focus:outline-none focus:ring-1 focus:ring-focus/40"
                      >
                        <option value="">Sin integración de calendario</option>
                        {appointmentTypes.map(at => (
                          <option key={at.id} value={at.id}>{at.name} · {at.duration} min</option>
                        ))}
                      </select>
                    </div>
                  </section>

                  <FormWhatsAppRecipients formId={id} />

                  {/* Share */}
                  <section className="bg-surface-elevated rounded-lg border border-line overflow-hidden">
                    <div className="px-6 py-4 border-b border-line">
                      <h2 className="text-sm font-bold text-text-primary">Compartir formulario</h2>
                    </div>
                    <div className="p-6 flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-bold text-text-secondary">Link público</label>
                        <div className="flex gap-2 mt-1.5">
                          <input readOnly value={publicUrl} className="flex-1 min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-xs text-text-secondary font-mono focus:outline-none" />
                          <button
                            onClick={handleCopyLink}
                            className={`min-h-11 px-3 py-2.5 rounded-control border text-sm font-semibold shrink-0 lg:min-h-10 ${copied ? "border-green-200 bg-green-50 text-green-700" : "border-line text-text-secondary hover:bg-surface-sidebar"}`}
                          >
                            {copied ? "¡Copiado!" : "Copiar"}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-text-secondary">Código iframe</label>
                        <div className="mt-1.5 relative">
                          <textarea
                            readOnly
                            rows={3}
                            value={`<iframe src="${publicUrl}" width="100%" height="600" frameborder="0" style="border:none;border-radius:16px;"></iframe>`}
                            className="w-full min-h-11 px-3 py-2.5 rounded-control border border-line bg-surface-sidebar text-xs text-text-secondary font-mono resize-none focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`<iframe src="${publicUrl}" width="100%" height="600" frameborder="0" style="border:none;border-radius:16px;"></iframe>`);
                              addToast("Iframe copiado", "success");
                            }}
                            className="absolute top-2 right-2 min-h-11 px-3 bg-surface-elevated border border-line rounded-control text-sm font-semibold text-text-secondary hover:bg-surface-sidebar lg:min-h-8"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                </div>
              </div>
            )}

          </div>
        </main>

      {/* Variant Create/Edit Modal */}
      {isVariantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4">
          <div ref={variantDialogRef} role="dialog" aria-modal="true" aria-labelledby="variant-modal-title" className="bg-surface-elevated rounded-surface border border-line w-full max-w-md overflow-hidden flex flex-col shadow-[0_8px_8px_rgba(11,11,24,0.10)]">
            <div className="p-5 border-b border-line flex items-center justify-between gap-3">
              <div>
                <h3 id="variant-modal-title" className="text-base font-bold text-text-primary">{editingVariant ? "Editar variante" : "Nueva variante"}</h3>
                <p className="text-xs text-text-secondary mt-0.5">El link de esta variante tendrá un parámetro único que identifica el origen del lead.</p>
              </div>
              <button type="button" onClick={() => setIsVariantModalOpen(false)} aria-label="Cerrar" className="flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-surface-sidebar hover:text-text-primary lg:size-8">
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="noxy-form-label">Nombre de la variante <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={variantName}
                  onChange={e => setVariantName(e.target.value)}
                  placeholder="Ej: Paquete Básico $8,000 MXN"
                  className="noxy-form-control"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="noxy-form-label">Descripción interna (opcional)</label>
                <textarea
                  rows={2}
                  value={variantDescription}
                  onChange={e => setVariantDescription(e.target.value)}
                  placeholder="Notas internas sobre esta variante..."
                  className="noxy-form-control min-h-20 resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-line flex justify-end gap-3 bg-surface-sidebar/50">
              <button type="button" onClick={() => setIsVariantModalOpen(false)} className="min-h-11 px-4 rounded-control text-sm font-semibold text-text-primary hover:bg-surface-sidebar lg:min-h-10">
                Cancelar
              </button>
              <button
                onClick={handleSaveVariant}
                disabled={isSavingVariant || !variantName.trim()}
                className="noxy-form-button px-4 text-sm lg:min-h-10"
              >
                {isSavingVariant ? "Guardando..." : editingVariant ? "Guardar cambios" : "Crear variante"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
