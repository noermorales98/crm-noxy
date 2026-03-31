"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import { ArrowLeft, Save, Plus, GripVertical, Trash2, Settings2, LayoutTemplate, Copy, ExternalLink, CheckCircle2, GitBranch, Link2, Pencil, ToggleLeft, ToggleRight, Users } from "lucide-react";
import { useToast } from "@/src/context/ToastContext";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import Link from "next/link";

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

function FieldPreview({ field }: { field: any }) {
  const base = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-400 pointer-events-none";
  const opts = field.options ? field.options.split(",").map((o: string) => o.trim()).filter(Boolean) : [];

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-700">
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
        <div className="flex gap-2">
          <div className="w-20 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-400 pointer-events-none">+52</div>
          <div className={`${base} flex-1`}>{field.placeholder || "—"}</div>
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
            <label key={i} className="flex items-center gap-2 text-xs text-gray-500 pointer-events-none">
              <div className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />
              {opt}
            </label>
          ))}
        </div>
      )}
      {field.type === "CHECKBOX" && (
        <div className="flex flex-col gap-1">
          {(opts.length ? opts : ["Opción 1"]).map((opt: string, i: number) => (
            <label key={i} className="flex items-center gap-2 text-xs text-gray-500 pointer-events-none">
              <div className="w-3 h-3 rounded border border-gray-300 shrink-0" />
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
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [successAction, setSuccessAction] = useState("MESSAGE");
  const [successMessage, setSuccessMessage] = useState("Thank you for your submission!");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [welcomeEmailId, setWelcomeEmailId] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<any[]>([]);
  const [appointmentTypeId, setAppointmentTypeId] = useState("");
  const [fields, setFields] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"BUILDER" | "SETTINGS" | "VARIANTS">("BUILDER");

  // Variants state
  const [variants, setVariants] = useState<any[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
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
    } catch {}
  };

  const fetchAppointmentTypes = async () => {
    try {
      const res = await fetch("/api/appointment-types");
      if (res.ok) setAppointmentTypes(await res.json());
    } catch {}
  };

  const fetchVariants = async () => {
    setIsLoadingVariants(true);
    try {
      const res = await fetch(`/api/forms/${id}/variants`);
      if (res.ok) setVariants(await res.json());
    } catch {}
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
        setFields(data.fields || []);
      } else {
        addToast("Formulario no encontrado", "error");
        router.push("/forms");
      }
    } catch {}
    finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const orderedFields = fields.map((f, i) => ({ ...f, order: i }));
    try {
      const res = await fetch(`/api/forms/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, isActive, successAction, successMessage, redirectUrl, welcomeEmailId, appointmentTypeId, fields: orderedFields })
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
    <div className="flex h-screen bg-background font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Cargando formulario...</div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="border-b border-gray-100 bg-white px-6 py-3 flex items-center gap-4 shrink-0">
            <Link href="/forms" className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={18} />
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-gray-900 truncate">{name || "Sin título"}</h1>
                <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
                  {isActive ? "Activo" : "Borrador"}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate">{publicUrl}</p>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setActiveTab("BUILDER")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === "BUILDER" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <LayoutTemplate size={14} />
                Constructor
              </button>
              <button
                onClick={() => setActiveTab("SETTINGS")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === "SETTINGS" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Settings2 size={14} />
                Configuración
              </button>
              <button
                onClick={() => setActiveTab("VARIANTS")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === "VARIANTS" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <GitBranch size={14} />
                Variantes
                {variants.length > 0 && (
                  <span className="bg-gray-200 text-gray-700 rounded-full px-1.5 py-0 text-[10px] font-bold">{variants.length}</span>
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border ${copied ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copied ? "¡Copiado!" : "Copiar link"}
              </button>
              <Link
                href={`/form/${id}`}
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              >
                <ExternalLink size={14} />
                Ver
              </Link>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
              >
                <Save size={14} />
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden">

            {/* BUILDER TAB — two columns */}
            {activeTab === "BUILDER" && (
              <div className="flex h-full">
                {/* Left: Field List */}
                <div className="flex-1 overflow-y-auto p-6 border-r border-gray-100">
                  <div className="max-w-xl mx-auto flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-sm font-bold text-gray-700">Campos del formulario</h2>
                      <span className="text-xs text-gray-400">{fields.length} campo{fields.length !== 1 ? "s" : ""}</span>
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
                                    className={`bg-white rounded-xl border ${snapshot.isDragging ? "border-gray-400 shadow-lg" : "border-gray-200"}`}
                                  >
                                    {/* Field Header */}
                                    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                                      <div {...provided.dragHandleProps} className="text-gray-300 hover:text-gray-600 cursor-grab">
                                        <GripVertical size={16} />
                                      </div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Campo {index + 1}</span>
                                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                                        {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                                      </span>
                                      <button onClick={() => removeField(index)} className="ml-auto text-gray-300 hover:text-red-500 p-1">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>

                                    {/* Field Body */}
                                    <div className="p-4 grid grid-cols-2 gap-3">
                                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tipo</label>
                                        <select
                                          value={field.type}
                                          onChange={e => updateField(index, "type", e.target.value)}
                                          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs focus:outline-none focus:border-gray-400"
                                        >
                                          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                      </div>

                                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Etiqueta / Pregunta</label>
                                        <input
                                          type="text"
                                          value={field.label}
                                          onChange={e => updateField(index, "label", e.target.value)}
                                          placeholder="¿Cuál es tu nombre?"
                                          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs focus:outline-none focus:border-gray-400"
                                        />
                                      </div>

                                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Nombre interno</label>
                                        <input
                                          type="text"
                                          value={field.name}
                                          onChange={e => updateField(index, "name", e.target.value)}
                                          placeholder="nombre_campo"
                                          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs font-mono focus:outline-none focus:border-gray-400"
                                        />
                                      </div>

                                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Placeholder</label>
                                        <input
                                          type="text"
                                          value={field.placeholder || ""}
                                          onChange={e => updateField(index, "placeholder", e.target.value)}
                                          placeholder="Escribe aquí..."
                                          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs focus:outline-none focus:border-gray-400"
                                        />
                                      </div>

                                      {(field.type === "SELECT" || field.type === "RADIO" || field.type === "CHECKBOX") && (
                                        <div className="flex flex-col gap-1 col-span-2">
                                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Opciones (separadas por coma)</label>
                                          <textarea
                                            rows={2}
                                            value={field.options || ""}
                                            onChange={e => updateField(index, "options", e.target.value)}
                                            placeholder="Opción 1, Opción 2, Opción 3"
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs resize-none focus:outline-none focus:border-gray-400"
                                          />
                                        </div>
                                      )}

                                      <div className="col-span-2 flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          id={`req-${field.id}`}
                                          checked={field.isRequired}
                                          onChange={e => updateField(index, "isRequired", e.target.checked)}
                                          className="w-3.5 h-3.5 rounded border-gray-300"
                                        />
                                        <label htmlFor={`req-${field.id}`} className="text-xs text-gray-600 font-medium">Campo obligatorio</label>
                                      </div>
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
                      className="w-full py-4 border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:text-gray-700 text-sm font-semibold"
                    >
                      <Plus size={16} />
                      Agregar campo
                    </button>

                    {fields.length === 0 && (
                      <p className="text-center text-xs text-gray-400 py-4">
                        El formulario no tiene campos. Agrega uno para comenzar.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Live Preview */}
                <div className="w-80 xl:w-96 shrink-0 overflow-y-auto bg-gray-50 p-6">
                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Vista previa</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
                    <div>
                      <h2 className="text-base font-bold text-gray-900 leading-tight">{name || "Sin título"}</h2>
                      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
                    </div>

                    {fields.length === 0 ? (
                      <p className="text-xs text-gray-300 text-center py-6">Sin campos</p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {fields.map((field, i) => (
                          <FieldPreview key={field.id || i} field={field} />
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-50">
                      <div className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold text-center">
                        Enviar
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VARIANTS TAB */}
            {activeTab === "VARIANTS" && (
              <div className="overflow-y-auto h-full p-6">
                <div className="max-w-2xl mx-auto flex flex-col gap-6">

                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Variantes del formulario</h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Cada variante genera un link único. Cuando alguien se registre a través de un link de variante, podrás ver de cuál vino en el perfil del lead.
                      </p>
                    </div>
                    <button
                      onClick={openNewVariantModal}
                      className="shrink-0 flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-2 rounded-xl text-xs font-semibold"
                    >
                      <Plus size={14} />
                      Nueva variante
                    </button>
                  </div>

                  {/* How it works */}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800">
                    <p className="font-bold mb-1">¿Cómo funciona?</p>
                    <p>Crea una variante por cada oferta, precio o fuente de tráfico. Comparte el link único de cada variante. Cuando un lead se registre, verás exactamente en qué variante se registró — ideal para saber si un lead viene del plan de $8,000 MXN o del de $15,000 MXN.</p>
                  </div>

                  {/* Variants List */}
                  {isLoadingVariants ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                    </div>
                  ) : variants.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
                      <GitBranch size={28} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-sm font-semibold text-gray-500">Sin variantes</p>
                      <p className="text-xs text-gray-400 mt-1">Crea tu primera variante para segmentar tus leads por oferta o fuente.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {variants.map((variant) => {
                        const variantUrl = `${publicUrl}?v=${variant.id}`;
                        const isCopied = copiedVariantId === variant.id;
                        return (
                          <div key={variant.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-gray-900">{variant.name}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${variant.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                    {variant.isActive ? "Activa" : "Inactiva"}
                                  </span>
                                  <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                                    <Users size={9} className="inline mr-1" />
                                    {variant._count?.contacts ?? 0} leads
                                  </span>
                                </div>
                                {variant.description && (
                                  <p className="text-xs text-gray-500 mt-0.5">{variant.description}</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-2">
                                  <code className="text-[10px] text-gray-400 font-mono bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg truncate max-w-xs">
                                    {variantUrl}
                                  </code>
                                  <button
                                    onClick={() => copyVariantLink(variant.id)}
                                    className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold ${isCopied ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                                  >
                                    {isCopied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                                    {isCopied ? "¡Copiado!" : "Copiar"}
                                  </button>
                                  <a
                                    href={variantUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 text-[10px] font-semibold text-gray-500 hover:bg-gray-50"
                                  >
                                    <ExternalLink size={11} />
                                    Ver
                                  </a>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleToggleVariant(variant)}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50"
                                  title={variant.isActive ? "Desactivar" : "Activar"}
                                >
                                  {variant.isActive ? <ToggleRight size={18} className="text-green-600" /> : <ToggleLeft size={18} />}
                                </button>
                                <button
                                  onClick={() => openEditVariantModal(variant)}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50"
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteVariant(variant)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
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

            {/* SETTINGS TAB */}
            {activeTab === "SETTINGS" && (
              <div className="overflow-y-auto h-full p-6">
                <div className="max-w-2xl mx-auto flex flex-col gap-6">

                  {/* General */}
                  <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50">
                      <h2 className="text-sm font-bold text-gray-900">General</h2>
                    </div>
                    <div className="p-6 flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nombre del formulario</label>
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-gray-400"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Descripción interna</label>
                        <textarea
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm resize-none focus:outline-none focus:border-gray-400"
                        />
                      </div>
                      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">Formulario activo</p>
                          <p className="text-xs text-gray-500">Permite recibir envíos públicos</p>
                        </div>
                        <button
                          onClick={() => setIsActive(v => !v)}
                          className={`relative w-10 h-6 rounded-full shrink-0 ${isActive ? "bg-gray-900" : "bg-gray-200"}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm ${isActive ? "left-5" : "left-1"}`} />
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* On Submit */}
                  <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50">
                      <h2 className="text-sm font-bold text-gray-900">Al enviar el formulario</h2>
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
                            className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold ${successAction === opt.value ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {successAction === "MESSAGE" && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Mensaje de éxito</label>
                          <textarea
                            value={successMessage}
                            onChange={e => setSuccessMessage(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm resize-none focus:outline-none focus:border-gray-400"
                          />
                        </div>
                      )}
                      {successAction === "REDIRECT" && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">URL de redirección</label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={redirectUrl}
                            onChange={e => setRedirectUrl(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-gray-400"
                          />
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Email de bienvenida */}
                  <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50">
                      <h2 className="text-sm font-bold text-gray-900">Email de bienvenida</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Envía un email automáticamente a nuevos leads</p>
                    </div>
                    <div className="p-6">
                      <select
                        value={welcomeEmailId}
                        onChange={e => setWelcomeEmailId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-gray-400"
                      >
                        <option value="">No enviar email de bienvenida</option>
                        {campaigns.map(c => (
                          <option key={c.id} value={c.id}>{c.subject}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400 mt-2">Selecciona un borrador de campaña como plantilla.</p>
                    </div>
                  </section>

                  {/* Calendario */}
                  <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50">
                      <h2 className="text-sm font-bold text-gray-900">Integración con Calendario</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Muestra un selector de citas en el formulario público</p>
                    </div>
                    <div className="p-6">
                      <select
                        value={appointmentTypeId}
                        onChange={e => setAppointmentTypeId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-gray-400"
                      >
                        <option value="">Sin integración de calendario</option>
                        {appointmentTypes.map(at => (
                          <option key={at.id} value={at.id}>{at.name} · {at.duration} min</option>
                        ))}
                      </select>
                    </div>
                  </section>

                  {/* Share */}
                  <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50">
                      <h2 className="text-sm font-bold text-gray-900">Compartir formulario</h2>
                    </div>
                    <div className="p-6 flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Link público</label>
                        <div className="flex gap-2 mt-1.5">
                          <input readOnly value={publicUrl} className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-600 font-mono focus:outline-none" />
                          <button
                            onClick={handleCopyLink}
                            className={`px-3 py-2.5 rounded-xl border text-xs font-semibold shrink-0 ${copied ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                          >
                            {copied ? "¡Copiado!" : "Copiar"}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Código iframe</label>
                        <div className="mt-1.5 relative">
                          <textarea
                            readOnly
                            rows={3}
                            value={`<iframe src="${publicUrl}" width="100%" height="600" frameborder="0" style="border:none;border-radius:16px;"></iframe>`}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-600 font-mono resize-none focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`<iframe src="${publicUrl}" width="100%" height="600" frameborder="0" style="border:none;border-radius:16px;"></iframe>`);
                              addToast("Iframe copiado", "success");
                            }}
                            className="absolute top-2 right-2 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-semibold text-gray-500 hover:bg-gray-50"
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
      </div>

      {/* Variant Create/Edit Modal */}
      {isVariantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">{editingVariant ? "Editar variante" : "Nueva variante"}</h3>
                <p className="text-xs text-gray-400 mt-0.5">El link de esta variante tendrá un parámetro único que identifica el origen del lead.</p>
              </div>
              <button onClick={() => setIsVariantModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nombre de la variante <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  autoFocus
                  value={variantName}
                  onChange={e => setVariantName(e.target.value)}
                  placeholder="Ej: Paquete Básico $8,000 MXN"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Descripción interna (opcional)</label>
                <textarea
                  rows={2}
                  value={variantDescription}
                  onChange={e => setVariantDescription(e.target.value)}
                  placeholder="Notas internas sobre esta variante..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm resize-none focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-50 flex justify-end gap-3 bg-gray-50/50">
              <button onClick={() => setIsVariantModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100">
                Cancelar
              </button>
              <button
                onClick={handleSaveVariant}
                disabled={isSavingVariant || !variantName.trim()}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50"
              >
                {isSavingVariant ? "Guardando..." : editingVariant ? "Guardar cambios" : "Crear variante"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
