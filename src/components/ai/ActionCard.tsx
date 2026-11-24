"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { formatQuoteLines, parseQuoteLines } from "@/src/lib/ai-quote-items";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserAddIcon,
  UserEditIcon,
  UserRemoveIcon,
  SaleTagIcon,
  PencilEditIcon,
  TaskAddIcon,
  CheckmarkCircleIcon,
  MailIcon,
  Delete01Icon,
  AiBrainIcon,
  VideoReplayIcon,
  File01Icon,
  Calendar03Icon,
  Wallet01Icon,
  FolderAddIcon,
} from "@hugeicons/core-free-icons";

type QuotePrefill = {
  clientName?: string; clientEmail?: string; clientCompany?: string; clientPhone?: string; currency?: string; taxRate?: string | number;
  validUntil?: string; notes?: string; dealId?: string; contactId?: string;
  items?: { description?: string; quantity?: number | string; unitPrice?: number | string }[];
};

export type ActionCardData =
  // Contacts
  | { type: "create_contact"; prefill?: { firstName?: string; lastName?: string; email?: string; phone?: string; companyId?: string } }
  | { type: "edit_contact"; id: string; prefill?: { firstName?: string; lastName?: string; email?: string; phone?: string; companyId?: string } }
  | { type: "delete_contact"; id: string; name: string }
  // Deals
  | { type: "create_deal"; prefill?: { title?: string; value?: string; stageId?: string; contactId?: string } }
  | { type: "edit_deal"; id: string; prefill?: { title?: string; value?: string; stageId?: string } }
  | { type: "delete_deal"; id: string; title: string }
  // Tasks
  | { type: "create_task"; prefill?: { title?: string; dueDate?: string; description?: string } }
  | { type: "complete_task"; id: string; title: string }
  | { type: "edit_task"; id: string; title: string; prefill?: { title?: string; description?: string; dueDate?: string } }
  | { type: "delete_task"; id: string; title: string }
  // Email
  | { type: "draft_email"; prefill?: { to?: string; subject?: string; body?: string } }
  | { type: "send_email"; prefill?: { companyId?: string; to?: string; cc?: string; subject?: string; body?: string } }
  | { type: "create_quote"; prefill?: QuotePrefill }
  | { type: "edit_quote"; id: string; folio: string; prefill?: QuotePrefill }
  | { type: "delete_quote"; id: string; folio: string }
  | { type: "send_quote"; id: string; folio: string }
  | { type: "create_company"; prefill?: { name?: string; website?: string; industry?: string } }
  | { type: "edit_company"; id: string; name: string; prefill?: { name?: string; website?: string; industry?: string } }
  | { type: "delete_company"; id: string; name: string }
  // Appointments
  | { type: "update_appointment"; id: string; title: string; prefill?: { status?: string } }
  | { type: "delete_appointment"; id: string; title: string }
  // Availability
  | { type: "create_availability"; prefill?: { name?: string; timezone?: string } }
  | { type: "edit_availability"; id: string; prefill?: { name?: string; timezone?: string } }
  | { type: "delete_availability"; id: string; name: string }
  // Appointment types
  | { type: "create_appointment_type"; prefill?: { name?: string; duration?: string; slug?: string; scheduleId?: string; description?: string; color?: string } }
  | { type: "edit_appointment_type"; id: string; prefill?: { name?: string; duration?: string; slug?: string; description?: string; color?: string; isActive?: string } }
  | { type: "delete_appointment_type"; id: string; name: string }
  // Forms
  | { type: "create_form"; prefill?: { name?: string; companyId?: string; description?: string } }
  | { type: "edit_form"; id: string; prefill?: { name?: string; description?: string; isActive?: string } }
  | { type: "delete_form"; id: string; name: string }
  // Contenido
  | { type: "create_content_item"; prefill?: { clientId?: string; date?: string; type?: string; title?: string; time?: string; hook?: string; script?: string; caption?: string; cta?: string } }
  | { type: "create_content_batch"; clientId?: string; prefill?: { items?: { date?: string; type?: string; title?: string; hook?: string; script?: string; caption?: string; cta?: string }[] } }
  | { type: "edit_content_item"; id: string; title: string; prefill?: { title?: string; date?: string; type?: string; hook?: string; script?: string; caption?: string; cta?: string; publishStatus?: string } }
  | { type: "set_content_status"; id: string; title: string; prefill?: { publishStatus?: string } }
  | { type: "edit_content_client_context"; id: string; name: string; prefill?: { context?: string } }
  // Docs
  | { type: "create_kb_doc"; prefill?: { title?: string; content?: string } }
  | { type: "edit_kb_doc"; id: string; title: string; prefill?: { title?: string; content?: string; appendContent?: string } }
  // Videos
  | { type: "create_video"; prefill?: { title?: string; platform?: string; hook?: string; hookType?: string; views?: string; leadsGenerated?: string; notes?: string; contentClientId?: string } }
  // Pipeline
  | { type: "create_pipeline_category"; prefill?: { name?: string } }
  | { type: "create_client_report"; id: string; name: string; prefill?: { month?: string; year?: string; email?: string } }
  // Cobros de clientes de la agencia
  | { type: "record_client_payment"; id: string; name: string; prefill?: { month?: string; year?: string; amount?: string } }
  | { type: "create_ai_schedule"; prefill?: { name?: string; kind?: string; prompt?: string; frequency?: string; weeklyDay?: string; monthlyDay?: string; hour?: string; days?: string } }
  // Query
  | { type: "query_result"; title?: string; columns: string[]; rows: string[][] };

type CardStatus = "pending" | "loading" | "success" | "error";
type IconComponent = typeof UserAddIcon;

interface TypeConfig {
  icon: IconComponent;
  color: string;
  title: string;
}

const typeConfig: Record<ActionCardData["type"], TypeConfig> = {
  // Contacts
  create_contact:        { icon: UserAddIcon,        color: "#10B981", title: "Crear contacto" },
  edit_contact:          { icon: UserEditIcon,        color: "#3545D6", title: "Editar contacto" },
  delete_contact:        { icon: UserRemoveIcon,      color: "#EF4444", title: "Eliminar contacto" },
  // Deals
  create_deal:           { icon: SaleTagIcon,         color: "#F59E0B", title: "Crear deal" },
  edit_deal:             { icon: PencilEditIcon,      color: "#3545D6", title: "Editar deal" },
  delete_deal:           { icon: Delete01Icon,        color: "#EF4444", title: "Eliminar deal" },
  // Tasks
  create_task:           { icon: TaskAddIcon,         color: "#10B981", title: "Crear tarea" },
  complete_task:         { icon: CheckmarkCircleIcon, color: "#10B981", title: "Completar tarea" },
  edit_task:             { icon: PencilEditIcon,      color: "#3545D6", title: "Editar tarea" },
  delete_task:           { icon: Delete01Icon,        color: "#EF4444", title: "Eliminar tarea" },
  // Email
  draft_email:           { icon: MailIcon,            color: "#3545D6", title: "Redactar email" },
  send_email:            { icon: MailIcon,            color: "#10B981", title: "Enviar email" },
  // Cotizaciones y empresas
  create_quote:          { icon: File01Icon,          color: "#10B981", title: "Crear cotización" },
  edit_quote:            { icon: PencilEditIcon,      color: "#3545D6", title: "Editar cotización" },
  delete_quote:          { icon: Delete01Icon,        color: "#EF4444", title: "Eliminar cotización" },
  send_quote:            { icon: MailIcon,            color: "#10B981", title: "Enviar cotización" },
  create_company:        { icon: AiBrainIcon,         color: "#10B981", title: "Crear empresa" },
  edit_company:          { icon: PencilEditIcon,      color: "#3545D6", title: "Editar empresa" },
  delete_company:        { icon: Delete01Icon,        color: "#EF4444", title: "Eliminar empresa" },
  // Appointments
  update_appointment:    { icon: PencilEditIcon,      color: "#3545D6", title: "Actualizar cita" },
  delete_appointment:    { icon: Delete01Icon,        color: "#EF4444", title: "Eliminar cita" },
  // Availability
  create_availability:   { icon: AiBrainIcon,         color: "#10B981", title: "Crear disponibilidad" },
  edit_availability:     { icon: PencilEditIcon,      color: "#3545D6", title: "Editar disponibilidad" },
  delete_availability:   { icon: Delete01Icon,        color: "#EF4444", title: "Eliminar disponibilidad" },
  // Appointment types
  create_appointment_type: { icon: AiBrainIcon,       color: "#10B981", title: "Crear tipo de cita" },
  edit_appointment_type:   { icon: PencilEditIcon,    color: "#3545D6", title: "Editar tipo de cita" },
  delete_appointment_type: { icon: Delete01Icon,      color: "#EF4444", title: "Eliminar tipo de cita" },
  // Forms
  create_form:           { icon: AiBrainIcon,         color: "#10B981", title: "Crear formulario" },
  edit_form:             { icon: PencilEditIcon,      color: "#3545D6", title: "Editar formulario" },
  delete_form:           { icon: Delete01Icon,        color: "#EF4444", title: "Eliminar formulario" },
  // Contenido
  create_content_item:   { icon: Calendar03Icon,     color: "#10B981", title: "Crear pieza de contenido" },
  create_content_batch:  { icon: Calendar03Icon,     color: "#10B981", title: "Crear varias piezas de contenido" },
  edit_content_item:     { icon: PencilEditIcon,     color: "#3545D6", title: "Editar pieza de contenido" },
  set_content_status:    { icon: CheckmarkCircleIcon, color: "#3545D6", title: "Cambiar estado de la pieza" },
  edit_content_client_context: { icon: PencilEditIcon, color: "#3545D6", title: "Actualizar la voz de la marca" },
  // Docs
  create_kb_doc:         { icon: File01Icon,         color: "#10B981", title: "Crear doc" },
  edit_kb_doc:           { icon: PencilEditIcon,     color: "#3545D6", title: "Editar doc" },
  // Videos
  create_video:          { icon: VideoReplayIcon,    color: "#10B981", title: "Registrar video" },
  // Pipeline
  create_pipeline_category: { icon: FolderAddIcon,   color: "#10B981", title: "Crear categoría del pipeline" },
  create_client_report:  { icon: File01Icon,         color: "#10B981", title: "Informe mensual del cliente" },
  // Cobros
  record_client_payment: { icon: Wallet01Icon,       color: "#10B981", title: "Registrar cobro recibido" },
  create_ai_schedule:    { icon: Calendar03Icon,     color: "#10B981", title: "Programar con la IA" },
  // Query
  query_result:          { icon: AiBrainIcon,         color: "#3545D6", title: "Resultados" },
};

const CONFIRM_ONLY_TYPES: ActionCardData["type"][] = [
  "delete_contact", "delete_deal", "complete_task",
  "delete_appointment", "delete_availability",
  "delete_appointment_type", "delete_form",
  "delete_task", "delete_quote", "send_quote", "delete_company",
];

// Permanent one-time operations (delete/complete) go to localStorage.
// Repeatable operations (edits/creates) go to sessionStorage — survive re-renders
// but clear when the tab is closed, allowing fresh attempts later.
const PERMANENT_TYPES: ActionCardData["type"][] = [
  "delete_contact", "delete_deal", "complete_task",
  "delete_appointment", "delete_availability",
  "delete_appointment_type", "delete_form",
  "delete_task", "delete_quote", "send_quote", "delete_company", "send_email",
];

// Key uses full JSON so two different edits of the same deal have different keys.
function getActionStorageKey(action: ActionCardData): string {
  const json = JSON.stringify(action);
  // Simple djb2 hash to keep key short
  let hash = 5381;
  for (let i = 0; i < json.length; i++) hash = ((hash << 5) + hash) ^ json.charCodeAt(i);
  return `ai_card_done_${action.type}_${(hash >>> 0).toString(36)}`;
}

function getPrefill(action: ActionCardData): Record<string, string> {
  if (CONFIRM_ONLY_TYPES.includes(action.type) || action.type === "query_result") return {};
  const prefill = (action as { prefill?: Record<string, string | undefined> }).prefill ?? {};
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(prefill)) {
    if (typeof v === "string") result[k] = v;
  }
  if (action.type === "create_content_batch" && action.clientId) result.clientId = action.clientId;
  if (action.type === "create_quote" || action.type === "edit_quote") {
    const p = (action.prefill ?? {}) as QuotePrefill;
    if (p.taxRate !== undefined) result.taxRate = String(p.taxRate);
    if (Array.isArray(p.items) && p.items.length) result.itemsText = formatQuoteLines(p.items);
  }
  return result;
}

function getSuccessMessage(type: ActionCardData["type"]): string {
  switch (type) {
    case "create_contact":        return "Contacto creado";
    case "edit_contact":          return "Contacto actualizado";
    case "delete_contact":        return "Contacto eliminado";
    case "create_deal":           return "Deal creado";
    case "edit_deal":             return "Deal actualizado";
    case "delete_deal":           return "Deal eliminado";
    case "create_task":           return "Tarea creada";
    case "complete_task":         return "Tarea completada";
    case "draft_email":           return "Compositor abierto";
    case "edit_task":             return "Tarea actualizada";
    case "delete_task":           return "Tarea eliminada";
    case "send_email":            return "Correo enviado";
    case "create_quote":          return "Cotización creada";
    case "edit_quote":            return "Cotización actualizada";
    case "delete_quote":          return "Cotización eliminada";
    case "send_quote":            return "Cotización enviada al cliente";
    case "create_company":        return "Empresa creada";
    case "edit_company":          return "Empresa actualizada";
    case "delete_company":        return "Empresa eliminada";
    case "update_appointment":    return "Cita actualizada";
    case "delete_appointment":    return "Cita eliminada";
    case "create_availability":   return "Disponibilidad creada";
    case "edit_availability":     return "Disponibilidad actualizada";
    case "delete_availability":   return "Disponibilidad eliminada";
    case "create_appointment_type": return "Tipo de cita creado";
    case "edit_appointment_type": return "Tipo de cita actualizado";
    case "delete_appointment_type": return "Tipo de cita eliminado";
    case "create_form":           return "Formulario creado";
    case "edit_form":             return "Formulario actualizado";
    case "delete_form":           return "Formulario eliminado";
    case "create_content_item":   return "Pieza creada";
    case "create_content_batch":  return "Piezas creadas";
    case "edit_content_item":     return "Pieza actualizada";
    case "set_content_status":    return "Estado actualizado";
    case "edit_content_client_context": return "Voz de la marca actualizada";
    case "create_kb_doc":         return "Doc creado";
    case "edit_kb_doc":           return "Doc actualizado";
    case "create_video":          return "Video registrado";
    case "create_pipeline_category": return "Categoría creada";
    case "create_client_report":  return "Informe guardado en Docs";
    case "record_client_payment": return "Cobro registrado";
    case "create_ai_schedule":    return "Programación creada";
    case "query_result":          return "Consulta completada";
  }
}

function getWarningText(action: ActionCardData): string {
  switch (action.type) {
    case "delete_contact":        return `¿Eliminar el contacto "${action.name}"?`;
    case "delete_deal":           return `¿Eliminar el deal "${action.title}"?`;
    case "complete_task":         return `¿Marcar como completada la tarea "${action.title}"?`;
    case "delete_appointment":    return `¿Eliminar la cita "${action.title}"?`;
    case "delete_availability":   return `¿Eliminar la disponibilidad "${action.name}"?`;
    case "delete_appointment_type": return `¿Eliminar el tipo de cita "${action.name}"?`;
    case "delete_form":           return `¿Eliminar el formulario "${action.name}"?`;
    case "delete_task":           return `¿Eliminar la tarea "${action.title}"?`;
    case "delete_quote":          return `¿Eliminar la cotización ${action.folio}? No se puede deshacer.`;
    case "send_quote":            return `¿Enviar la cotización ${action.folio} al correo del cliente con el mensaje estándar?`;
    case "delete_company":        return `¿Eliminar la empresa "${action.name}"?`;
    default: return "";
  }
}

type BatchItem = { selected: boolean; date: string; type: string; title: string; hook: string; script: string; caption: string; cta: string };

function initialBatch(action: ActionCardData): BatchItem[] {
  if (action.type !== "create_content_batch") return [];
  return (action.prefill?.items ?? []).slice(0, 20).map((i) => ({ selected: true, date: i.date ?? "", type: i.type ?? "video", title: i.title ?? "", hook: i.hook ?? "", script: i.script ?? "", caption: i.caption ?? "", cta: i.cta ?? "" }));
}

const CONTENT_STATUSES: [string, string][] = [
  ["pendiente", "Pendiente"],
  ["en_edicion", "En edición"],
  ["editado", "Editado"],
  ["aprobado", "Aprobado"],
  ["subido", "Subido"],
];

const inputClass =
  "w-full text-sm border border-border-subtle rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[#3545D6]";
const selectClass = `${inputClass} text-text-primary`;

function FormFields({
  action,
  formData,
  onChange,
  companies,
  availabilities,
  stages,
  contentClients,
  batchItems,
  onBatchChange,
}: {
  action: ActionCardData;
  formData: Record<string, string>;
  onChange: (key: string, value: string) => void;
  companies: { id: string; name: string }[];
  availabilities: { id: string; name: string }[];
  stages: { id: string; name: string; pipelineName: string }[];
  contentClients: { id: string; name: string }[];
  batchItems: BatchItem[];
  onBatchChange: (items: BatchItem[]) => void;
}) {
  switch (action.type) {
    case "create_contact":
    case "edit_contact":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input className={inputClass} placeholder="Nombre *" value={formData.firstName ?? ""} onChange={(e) => onChange("firstName", e.target.value)} />
          <input className={inputClass} placeholder="Apellido" value={formData.lastName ?? ""} onChange={(e) => onChange("lastName", e.target.value)} />
          <input className={inputClass} placeholder="Email" type="email" value={formData.email ?? ""} onChange={(e) => onChange("email", e.target.value)} />
          <input className={inputClass} placeholder="Teléfono" type="tel" value={formData.phone ?? ""} onChange={(e) => onChange("phone", e.target.value)} />
          <select className={selectClass} value={formData.companyId ?? ""} onChange={(e) => onChange("companyId", e.target.value)}>
            <option value="">Sin empresa</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      );

    case "create_deal":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input className={inputClass} placeholder="Título *" value={formData.title ?? ""} onChange={(e) => onChange("title", e.target.value)} />
          <input className={inputClass} placeholder="Valor" type="number" value={formData.value ?? ""} onChange={(e) => onChange("value", e.target.value)} />
          <select className={selectClass} value={formData.stageId ?? ""} onChange={(e) => onChange("stageId", e.target.value)}>
            <option value="">Seleccionar etapa</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.pipelineName} → {s.name}</option>
            ))}
          </select>
        </div>
      );

    case "edit_deal": {
      const p = action.prefill ?? {};
      return (
        <div className="flex flex-col gap-2 mt-3">
          {formData.title && (
            <p className="text-xs text-text-secondary">
              Deal: <span className="font-medium text-text-primary">{formData.title}</span>
            </p>
          )}
          {"title" in p && (
            <input className={inputClass} placeholder="Nuevo título" value={formData.title ?? ""} onChange={(e) => onChange("title", e.target.value)} />
          )}
          {"value" in p && (
            <input className={inputClass} placeholder="Valor" type="number" value={formData.value ?? ""} onChange={(e) => onChange("value", e.target.value)} />
          )}
          {"stageId" in p && (
            <select className={selectClass} value={formData.stageId ?? ""} onChange={(e) => onChange("stageId", e.target.value)}>
              <option value="">Seleccionar etapa</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.pipelineName} → {s.name}</option>
              ))}
            </select>
          )}
        </div>
      );
    }

    case "create_task":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input className={inputClass} placeholder="Título *" value={formData.title ?? ""} onChange={(e) => onChange("title", e.target.value)} />
          <input className={inputClass} placeholder="Descripción" value={formData.description ?? ""} onChange={(e) => onChange("description", e.target.value)} />
          <input className={inputClass} placeholder="Fecha límite" type="date" value={formData.dueDate ?? ""} onChange={(e) => onChange("dueDate", e.target.value)} />
        </div>
      );

    case "edit_task":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <p className="text-xs text-text-secondary">Tarea: <span className="font-medium text-text-primary">{action.title}</span></p>
          <input className={inputClass} placeholder="Título" value={formData.title ?? ""} onChange={(e) => onChange("title", e.target.value)} />
          <input className={inputClass} placeholder="Descripción" value={formData.description ?? ""} onChange={(e) => onChange("description", e.target.value)} />
          <input className={inputClass} placeholder="Fecha límite" type="date" value={formData.dueDate ?? ""} onChange={(e) => onChange("dueDate", e.target.value)} />
        </div>
      );

    case "create_company":
    case "edit_company":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input className={inputClass} placeholder="Nombre *" value={formData.name ?? ""} onChange={(e) => onChange("name", e.target.value)} />
          <input className={inputClass} placeholder="Sitio web" value={formData.website ?? ""} onChange={(e) => onChange("website", e.target.value)} />
          <input className={inputClass} placeholder="Industria" value={formData.industry ?? ""} onChange={(e) => onChange("industry", e.target.value)} />
        </div>
      );

    case "send_email":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <select className={selectClass} aria-label="Enviar desde" value={formData.companyId ?? ""} onChange={(e) => onChange("companyId", e.target.value)}>
            <option value="">Enviar desde… (empresa con correo configurado)</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input className={inputClass} placeholder="Para *" type="email" value={formData.to ?? ""} onChange={(e) => onChange("to", e.target.value)} />
          <input className={inputClass} placeholder="Cc" value={formData.cc ?? ""} onChange={(e) => onChange("cc", e.target.value)} />
          <input className={inputClass} placeholder="Asunto *" value={formData.subject ?? ""} onChange={(e) => onChange("subject", e.target.value)} />
          <textarea className={`${inputClass} resize-none`} placeholder="Mensaje *" rows={5} value={formData.body ?? ""} onChange={(e) => onChange("body", e.target.value)} />
        </div>
      );

    case "create_quote":
    case "edit_quote":
      return (
        <div className="flex flex-col gap-2 mt-3">
          {action.type === "edit_quote" && <p className="text-xs text-text-secondary">Cotización <span className="font-medium text-text-primary">{action.folio}</span>{formData._loaded ? "" : " · cargando datos…"}</p>}
          <input className={inputClass} placeholder="Nombre del cliente *" value={formData.clientName ?? ""} onChange={(e) => onChange("clientName", e.target.value)} />
          <input className={inputClass} placeholder="Correo del cliente" type="email" value={formData.clientEmail ?? ""} onChange={(e) => onChange("clientEmail", e.target.value)} />
          <input className={inputClass} placeholder="Empresa del cliente" value={formData.clientCompany ?? ""} onChange={(e) => onChange("clientCompany", e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            <input className={inputClass} aria-label="Moneda" placeholder="Moneda" value={formData.currency ?? ""} onChange={(e) => onChange("currency", e.target.value.toUpperCase())} />
            <input className={inputClass} aria-label="Impuesto %" placeholder="IVA %" type="number" value={formData.taxRate ?? ""} onChange={(e) => onChange("taxRate", e.target.value)} />
            <input className={inputClass} aria-label="Válida hasta" type="date" value={formData.validUntil ?? ""} onChange={(e) => onChange("validUntil", e.target.value)} />
          </div>
          <textarea className={`${inputClass} resize-none font-mono text-xs`} aria-label="Conceptos" placeholder={"Un concepto por línea:\ndescripción | cantidad | precio unitario"} rows={5} value={formData.itemsText ?? ""} onChange={(e) => onChange("itemsText", e.target.value)} />
          <textarea className={`${inputClass} resize-none`} placeholder="Notas" rows={2} value={formData.notes ?? ""} onChange={(e) => onChange("notes", e.target.value)} />
        </div>
      );

    case "draft_email":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input className={inputClass} placeholder="Para" type="email" value={formData.to ?? ""} onChange={(e) => onChange("to", e.target.value)} />
          <input className={inputClass} placeholder="Asunto" value={formData.subject ?? ""} onChange={(e) => onChange("subject", e.target.value)} />
          <textarea className={`${inputClass} resize-none`} placeholder="Cuerpo" rows={3} value={formData.body ?? ""} onChange={(e) => onChange("body", e.target.value)} />
        </div>
      );

    case "update_appointment":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <p className="text-xs text-text-secondary">Cita: <span className="font-medium text-text-primary">{action.title}</span></p>
          <select className={selectClass} value={formData.status ?? ""} onChange={(e) => onChange("status", e.target.value)}>
            <option value="">Seleccionar estado</option>
            <option value="confirmed">Confirmada</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
            <option value="no_show">No se presentó</option>
            <option value="scheduled">Programada</option>
          </select>
        </div>
      );

    case "create_availability":
    case "edit_availability":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input className={inputClass} placeholder="Nombre *" value={formData.name ?? ""} onChange={(e) => onChange("name", e.target.value)} />
          <input className={inputClass} placeholder="Zona horaria (ej: America/Mexico_City)" value={formData.timezone ?? ""} onChange={(e) => onChange("timezone", e.target.value)} />
        </div>
      );

    case "create_appointment_type":
    case "edit_appointment_type":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input className={inputClass} placeholder="Nombre *" value={formData.name ?? ""} onChange={(e) => onChange("name", e.target.value)} />
          <input className={inputClass} placeholder="Slug (url-amigable) *" value={formData.slug ?? ""} onChange={(e) => onChange("slug", e.target.value)} />
          <input className={inputClass} placeholder="Duración en minutos *" type="number" value={formData.duration ?? ""} onChange={(e) => onChange("duration", e.target.value)} />
          <input className={inputClass} placeholder="Descripción" value={formData.description ?? ""} onChange={(e) => onChange("description", e.target.value)} />
          {action.type === "create_appointment_type" && (
            <select className={selectClass} value={formData.scheduleId ?? ""} onChange={(e) => onChange("scheduleId", e.target.value)}>
              <option value="">Seleccionar disponibilidad *</option>
              {availabilities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
          {action.type === "edit_appointment_type" && (
            <select className={selectClass} value={formData.isActive ?? "true"} onChange={(e) => onChange("isActive", e.target.value)}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          )}
        </div>
      );

    case "create_form":
    case "edit_form":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input className={inputClass} placeholder="Nombre *" value={formData.name ?? ""} onChange={(e) => onChange("name", e.target.value)} />
          <input className={inputClass} placeholder="Descripción" value={formData.description ?? ""} onChange={(e) => onChange("description", e.target.value)} />
          {action.type === "create_form" && (
            <select className={selectClass} value={formData.companyId ?? ""} onChange={(e) => onChange("companyId", e.target.value)}>
              <option value="">Seleccionar empresa *</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {action.type === "edit_form" && (
            <select className={selectClass} value={formData.isActive ?? "true"} onChange={(e) => onChange("isActive", e.target.value)}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          )}
        </div>
      );

    case "create_content_batch": {
      const setItem = (index: number, patch: Partial<BatchItem>) => onBatchChange(batchItems.map((it, i) => (i === index ? { ...it, ...patch } : it)));
      return (
        <div className="flex flex-col gap-2 mt-3">
          <select className={selectClass} aria-label="Cliente o marca" value={formData.clientId ?? ""} onChange={(e) => onChange("clientId", e.target.value)}>
            <option value="">Seleccionar cliente o marca *</option>
            {contentClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ul className="flex flex-col gap-2">
            {batchItems.map((it, i) => (
              <li key={i} className="rounded-lg border border-border-subtle p-2">
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" checked={it.selected} onChange={(e) => setItem(i, { selected: e.target.checked })} aria-label={`Crear «${it.title}»`} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <input className={inputClass} placeholder="Título" value={it.title} onChange={(e) => setItem(i, { title: e.target.value })} />
                    <span className="flex gap-1">
                      <input className={inputClass} type="date" aria-label="Fecha" value={it.date} onChange={(e) => setItem(i, { date: e.target.value })} />
                      <select className={selectClass} aria-label="Tipo" value={it.type} onChange={(e) => setItem(i, { type: e.target.value })}>
                        {["video", "reel", "flyer", "historia", "entrega", "edicion"].map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </span>
                    {it.hook && <span className="text-xs text-text-secondary">Gancho: {it.hook}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-secondary">{batchItems.filter((i) => i.selected).length} de {batchItems.length} piezas se crearán.</p>
        </div>
      );
    }

    case "create_content_item":
    case "edit_content_item":
      return (
        <div className="flex flex-col gap-2 mt-3">
          {action.type === "edit_content_item" && <p className="text-xs text-text-secondary">Pieza: <span className="font-medium text-text-primary">{action.title}</span></p>}
          {action.type === "create_content_item" && (
            <select className={selectClass} value={formData.clientId ?? ""} onChange={(e) => onChange("clientId", e.target.value)}>
              <option value="">Seleccionar cliente o marca *</option>
              {contentClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <input className={inputClass} placeholder="Título *" value={formData.title ?? ""} onChange={(e) => onChange("title", e.target.value)} />
          <div className="flex gap-2">
            <input className={inputClass} type="date" aria-label="Fecha" value={formData.date ?? ""} onChange={(e) => onChange("date", e.target.value)} />
            <select className={selectClass} aria-label="Tipo" value={formData.type ?? "video"} onChange={(e) => onChange("type", e.target.value)}>
              {["video", "reel", "flyer", "historia", "entrega", "edicion"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <input className={inputClass} placeholder="Gancho" value={formData.hook ?? ""} onChange={(e) => onChange("hook", e.target.value)} />
          <textarea className={`${inputClass} resize-none`} placeholder="Guion" rows={3} value={formData.script ?? ""} onChange={(e) => onChange("script", e.target.value)} />
          <textarea className={`${inputClass} resize-none`} placeholder="Caption" rows={2} value={formData.caption ?? ""} onChange={(e) => onChange("caption", e.target.value)} />
          <input className={inputClass} placeholder="CTA" value={formData.cta ?? ""} onChange={(e) => onChange("cta", e.target.value)} />
          {action.type === "edit_content_item" && (
            <select className={selectClass} aria-label="Estado" value={formData.publishStatus ?? ""} onChange={(e) => onChange("publishStatus", e.target.value)}>
              <option value="">Sin cambiar el estado</option>
              {CONTENT_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}
        </div>
      );

    case "set_content_status":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <p className="text-xs text-text-secondary">Pieza: <span className="font-medium text-text-primary">{action.title}</span></p>
          <select className={selectClass} aria-label="Estado" value={formData.publishStatus ?? ""} onChange={(e) => onChange("publishStatus", e.target.value)}>
            <option value="">Seleccionar estado</option>
            {CONTENT_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      );

    case "edit_content_client_context":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <p className="text-xs text-text-secondary">Marca: <span className="font-medium text-text-primary">{action.name}</span></p>
          <textarea className={`${inputClass} resize-y`} placeholder="Voz, audiencia, productos, tono y reglas" rows={8} value={formData.context ?? ""} onChange={(e) => onChange("context", e.target.value)} />
          <p className="text-xs text-text-secondary">Reemplaza la voz guardada. La IA la usará en cada texto de esta marca.</p>
        </div>
      );

    case "create_kb_doc":
    case "edit_kb_doc":
      return (
        <div className="flex flex-col gap-2 mt-3">
          {action.type === "edit_kb_doc" && <p className="text-xs text-text-secondary">Doc: <span className="font-medium text-text-primary">{action.title}</span></p>}
          <input className={inputClass} placeholder="Título *" value={formData.title ?? ""} onChange={(e) => onChange("title", e.target.value)} />
          {action.type === "edit_kb_doc" && "appendContent" in (action.prefill ?? {}) ? (
            <textarea className={`${inputClass} resize-none`} placeholder="Texto a añadir al final" rows={5} value={formData.appendContent ?? ""} onChange={(e) => onChange("appendContent", e.target.value)} />
          ) : (
            <textarea className={`${inputClass} resize-none`} placeholder="Contenido (Markdown)" rows={6} value={formData.content ?? ""} onChange={(e) => onChange("content", e.target.value)} />
          )}
        </div>
      );

    case "create_video":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input className={inputClass} placeholder="Título *" value={formData.title ?? ""} onChange={(e) => onChange("title", e.target.value)} />
          <input className={inputClass} placeholder="Plataforma * (TikTok, Instagram…)" value={formData.platform ?? ""} onChange={(e) => onChange("platform", e.target.value)} />
          <select className={selectClass} aria-label="Cliente de contenido" value={formData.contentClientId ?? ""} onChange={(e) => onChange("contentClientId", e.target.value)}>
            <option value="">Sin cliente de contenido</option>
            {contentClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className={inputClass} placeholder="Gancho" value={formData.hook ?? ""} onChange={(e) => onChange("hook", e.target.value)} />
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Vistas" type="number" value={formData.views ?? ""} onChange={(e) => onChange("views", e.target.value)} />
            <input className={inputClass} placeholder="Leads" type="number" value={formData.leadsGenerated ?? ""} onChange={(e) => onChange("leadsGenerated", e.target.value)} />
          </div>
          <input className={inputClass} placeholder="Notas" value={formData.notes ?? ""} onChange={(e) => onChange("notes", e.target.value)} />
        </div>
      );

    case "create_ai_schedule":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input className={inputClass} placeholder="Nombre" value={formData.name ?? ""} onChange={(e) => onChange("name", e.target.value)} />
          <select className={selectClass} aria-label="Qué hace" value={formData.kind ?? "prompt"} onChange={(e) => onChange("kind", e.target.value)}>
            <option value="prompt">Pedirle algo a la IA</option>
            <option value="stale_deals">Alerta: deals sin movimiento</option>
            <option value="late_content">Alerta: contenido atrasado</option>
            <option value="overdue_payments">Alerta: cobros vencidos</option>
            <option value="client_reports">Informes mensuales de clientes</option>
          </select>
          {(formData.kind ?? "prompt") === "client_reports" ? (
            <p className="text-xs text-text-secondary">Crea en Docs el informe del mes anterior de cada cliente activo.</p>
          ) : (formData.kind ?? "prompt") === "prompt" ? (
            <textarea className={`${inputClass} resize-none`} placeholder="Qué debe hacer la IA cada vez" rows={3} value={formData.prompt ?? ""} onChange={(e) => onChange("prompt", e.target.value)} />
          ) : (
            <input className={inputClass} type="number" placeholder="Días de retraso para avisar (5)" value={formData.days ?? ""} onChange={(e) => onChange("days", e.target.value)} />
          )}
          <div className="flex gap-2">
            <select className={selectClass} aria-label="Frecuencia" value={formData.frequency ?? "weekly"} onChange={(e) => onChange("frequency", e.target.value)}>
              <option value="daily">Cada día</option>
              <option value="weekly">Cada semana</option>
              <option value="monthly">Cada mes</option>
            </select>
            {(formData.frequency ?? "weekly") === "weekly" && (
              <select className={selectClass} aria-label="Día" value={formData.weeklyDay ?? "1"} onChange={(e) => onChange("weeklyDay", e.target.value)}>
                {["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"].map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            )}
            <input className={inputClass} type="number" min={0} max={23} aria-label="Hora" placeholder="Hora" value={formData.hour ?? "8"} onChange={(e) => onChange("hour", e.target.value)} />
          </div>
          <p className="text-xs text-text-secondary">El resultado llegará como un chat nuevo. Puedes pausarla en Ajustes › Modelos de IA.</p>
        </div>
      );

    case "create_pipeline_category":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input className={inputClass} placeholder="Nombre de la categoría *" value={formData.name ?? ""} onChange={(e) => onChange("name", e.target.value)} />
          <p className="text-xs text-text-secondary">Nace con las etapas Nuevo, En proceso, Ganado y Perdido.</p>
        </div>
      );

    case "create_client_report":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <p className="text-xs text-text-secondary">Cliente: <span className="font-medium text-text-primary">{action.name}</span></p>
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Mes (1-12)" type="number" min={1} max={12} value={formData.month ?? ""} onChange={(e) => onChange("month", e.target.value)} />
            <input className={inputClass} placeholder="Año" type="number" value={formData.year ?? ""} onChange={(e) => onChange("year", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input type="checkbox" checked={formData.email === "true"} onChange={(e) => onChange("email", e.target.checked ? "true" : "")} />
            Abrir también el correo con el informe
          </label>
          <p className="text-xs text-text-secondary">Se guarda en Docs con los cobros, el contenido entregado y los videos del mes. Lo que no tenga datos se indica, no se inventa.</p>
        </div>
      );

    case "record_client_payment":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <p className="text-xs text-text-secondary">Cliente: <span className="font-medium text-text-primary">{action.name}</span></p>
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Mes (1-12) *" type="number" min={1} max={12} value={formData.month ?? ""} onChange={(e) => onChange("month", e.target.value)} />
            <input className={inputClass} placeholder="Año *" type="number" value={formData.year ?? ""} onChange={(e) => onChange("year", e.target.value)} />
          </div>
          <input className={inputClass} placeholder="Monto (vacío = la cuota mensual)" type="number" value={formData.amount ?? ""} onChange={(e) => onChange("amount", e.target.value)} />
        </div>
      );

    default:
      return null;
  }
}

export function ActionCard({ action }: { action: ActionCardData }) {
  const params = useParams();
  // Scope keys to the current conversation so a new chat always starts fresh.
  const convId = (params?.id as string | undefined) ?? "global";
  const storageKey = `${getActionStorageKey(action)}_${convId}`;
  const cancelKey = `${storageKey}_cancelled`;
  const isPermanent = PERMANENT_TYPES.includes(action.type);

  // Always start in neutral state — SSR and client must agree on initial render.
  // Restore persisted state in useEffect (client-only) to avoid hydration mismatch.
  const [status, setStatus] = useState<CardStatus>("pending");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>(() => getPrefill(action));
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [availabilities, setAvailabilities] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string; pipelineName: string }[]>([]);
  const [contentClients, setContentClients] = useState<{ id: string; name: string }[]>([]);
  const [batchItems, setBatchItems] = useState<BatchItem[]>(() => initialBatch(action));
  const router = useRouter();

  // Restore done/cancelled state after mount (storage is client-only)
  useEffect(() => {
    const done = isPermanent
      ? localStorage.getItem(storageKey) === "done"
      : sessionStorage.getItem(storageKey) === "done";
    if (done) {
      setSuccessMessage(getSuccessMessage(action.type));
      setStatus("success");
      return;
    }
    if (sessionStorage.getItem(cancelKey) === "yes") {
      setCancelled(true);
    }
  }, []);

  const markDone = (msg: string) => {
    if (isPermanent) {
      localStorage.setItem(storageKey, "done");
    } else {
      sessionStorage.setItem(storageKey, "done");
    }
    setSuccessMessage(msg);
    setStatus("success");
  };

  // Load companies for contact + form actions
  useEffect(() => {
    const needsCompanies = ["create_contact", "edit_contact", "create_form", "send_email"].includes(action.type);
    if (!needsCompanies) return;
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        const list = data as { id: string; name: string }[];
        setCompanies(list);
        setFormData((prev) => {
          if (!prev.companyId) return prev;
          return list.some((c) => c.id === prev.companyId) ? prev : { ...prev, companyId: "" };
        });
      })
      .catch(() => {});
  }, [action.type]);

  // Editar una cotización: se traen sus datos actuales (el servidor reemplaza todo, así que lo no editable se conserva tal cual).
  useEffect(() => {
    if (action.type !== "edit_quote") return;
    fetch(`/api/quotes/${action.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((q: Record<string, unknown> | null) => {
        if (!q) return;
        const str = (v: unknown) => (v == null ? "" : String(v));
        setFormData((prev) => ({
          clientName: str(q.clientName), clientEmail: str(q.clientEmail), clientCompany: str(q.clientCompany), clientPhone: str(q.clientPhone),
          currency: str(q.currency), taxRate: str(q.taxRate), validUntil: q.validUntil ? str(q.validUntil).slice(0, 10) : "", notes: str(q.notes),
          itemsText: formatQuoteLines(Array.isArray(q.items) ? (q.items as { description?: unknown; quantity?: unknown; unitPrice?: unknown }[]) : []),
          _contactId: str(q.contactId), _senderCompanyId: str(q.senderCompanyId), _clientAddress: str(q.clientAddress), _terms: str(q.terms),
          _split: q.splitPayment ? "true" : "false", _deposit: str(q.depositPercent),
          ...prev,
          _loaded: "1",
        }));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action.type]);

  // Load pipeline stages for deal forms — ?slim=true skips loading deals (fast)
  useEffect(() => {
    if (action.type !== "create_deal" && action.type !== "edit_deal") return;
    fetch("/api/pipelines?slim=true")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        const flat: { id: string; name: string; pipelineName: string }[] = [];
        for (const p of data as { name: string; stages?: { id: string; name: string }[] }[]) {
          for (const s of p.stages ?? []) {
            flat.push({ id: s.id, name: s.name, pipelineName: p.name });
          }
        }
        setStages(flat);
      })
      .catch(() => {});
  }, [action.type]);

  // Clientes de contenido para las piezas y los videos
  useEffect(() => {
    if (!["create_content_item", "create_content_batch", "create_video"].includes(action.type)) return;
    fetch("/api/content/clients")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setContentClients((data as { id: string; name: string }[]).map((c) => ({ id: c.id, name: c.name })));
      })
      .catch(() => {});
  }, [action.type]);

  // Load availabilities for appointment type actions
  useEffect(() => {
    const needsAvailabilities = ["create_appointment_type", "edit_appointment_type"].includes(action.type);
    if (!needsAvailabilities) return;
    fetch("/api/availability")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        setAvailabilities(data as { id: string; name: string }[]);
      })
      .catch(() => {});
  }, [action.type]);

  const config = typeConfig[action.type];
  const cardTitle = action.type === "query_result" ? (action.title ?? "Resultados") : config.title;
  const isConfirmOnly = CONFIRM_ONLY_TYPES.includes(action.type);
  const confirmLabel = action.type === "draft_email" ? "Abrir compositor" : action.type === "send_email" || action.type === "send_quote" ? "Enviar" : "Confirmar";
  const warningText = getWarningText(action);

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  async function executeAction() {
    setStatus("loading");
    try {
      switch (action.type) {
        // ── Contacts ──────────────────────────────────────────────────────
        case "create_contact": {
          const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
          if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Error al crear contacto");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "edit_contact": {
          const res = await fetch("/api/contacts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: action.id, ...formData }) });
          if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Error al actualizar contacto");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "delete_contact": {
          const res = await fetch(`/api/contacts/${action.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Error al eliminar contacto");
          markDone(getSuccessMessage(action.type));
          break;
        }
        // ── Deals ─────────────────────────────────────────────────────────
        case "create_deal": {
          const res = await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
          if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Error al crear deal");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "edit_deal": {
          const res = await fetch("/api/deals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: action.id, ...formData }) });
          if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Error al actualizar deal");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "delete_deal": {
          const res = await fetch(`/api/deals/${action.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Error al eliminar deal");
          markDone(getSuccessMessage(action.type));
          break;
        }
        // ── Tasks ─────────────────────────────────────────────────────────
        case "create_task": {
          const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
          if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Error al crear tarea");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "complete_task": {
          const res = await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: action.id, isCompleted: true }) });
          if (!res.ok) throw new Error("Error al completar tarea");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "edit_task": {
          const body: Record<string, unknown> = { id: action.id };
          if (formData.title) body.title = formData.title;
          if (formData.description !== undefined) body.description = formData.description;
          if (formData.dueDate !== undefined) body.dueDate = formData.dueDate || null;
          const res = await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Error al actualizar tarea");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "delete_task": {
          const res = await fetch(`/api/tasks/${action.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Error al eliminar tarea");
          markDone(getSuccessMessage(action.type));
          break;
        }
        // ── Empresas ──────────────────────────────────────────────────────
        case "create_company": {
          if (!formData.name?.trim()) throw new Error("La empresa necesita un nombre");
          const res = await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: formData.name, website: formData.website || undefined, industry: formData.industry || undefined }) });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Error al crear empresa");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "edit_company": {
          const res = await fetch("/api/companies", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: action.id, name: formData.name || action.name, website: formData.website, industry: formData.industry }) });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Error al actualizar empresa");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "delete_company": {
          const res = await fetch(`/api/companies/${action.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Error al eliminar empresa");
          markDone(getSuccessMessage(action.type));
          break;
        }
        // ── Cotizaciones ──────────────────────────────────────────────────
        case "create_quote":
        case "edit_quote": {
          const items = parseQuoteLines(formData.itemsText ?? "");
          if (!formData.clientName?.trim()) throw new Error("Falta el nombre del cliente");
          if (!items.length) throw new Error("Agrega al menos un concepto («descripción | cantidad | precio»)");
          const editing = action.type === "edit_quote";
          if (editing && !formData._loaded) throw new Error("Espera a que carguen los datos de la cotización");
          const body: Record<string, unknown> = {
            clientName: formData.clientName, clientEmail: formData.clientEmail || undefined, clientCompany: formData.clientCompany || undefined, clientPhone: formData.clientPhone || undefined,
            currency: formData.currency || undefined, taxRate: formData.taxRate !== undefined && formData.taxRate !== "" ? Number(formData.taxRate) : undefined,
            validUntil: formData.validUntil || undefined, notes: formData.notes || undefined, items,
          };
          if (editing) {
            body.contactId = formData._contactId || undefined;
            body.senderCompanyId = formData._senderCompanyId || undefined;
            body.clientAddress = formData._clientAddress || undefined;
            body.terms = formData._terms || undefined;
            body.splitPayment = formData._split === "true";
            body.depositPercent = formData._deposit ? Number(formData._deposit) : undefined;
          } else {
            if (formData.dealId) body.dealId = formData.dealId;
            if (formData.contactId) body.contactId = formData.contactId;
          }
          const res = await fetch(editing ? `/api/quotes/${action.id}` : "/api/quotes", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Error al guardar la cotización");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "delete_quote": {
          const res = await fetch(`/api/quotes/${action.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Error al eliminar la cotización");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "send_quote": {
          const res = await fetch(`/api/quotes/${action.id}/send`, { method: "POST" });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo enviar la cotización");
          markDone(getSuccessMessage(action.type));
          break;
        }
        // ── Email ─────────────────────────────────────────────────────────
        case "send_email": {
          if (!formData.companyId) throw new Error("Elige desde qué empresa se envía");
          if (!formData.to?.trim() || !formData.subject?.trim() || !formData.body?.trim()) throw new Error("Faltan destinatario, asunto o mensaje");
          const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const bodyHtml = formData.body.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
          const res = await fetch("/api/emails/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: formData.companyId, to: formData.to.trim(), cc: formData.cc?.trim() || undefined, subject: formData.subject.trim(), bodyHtml, bodyText: formData.body }) });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo enviar el correo");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "draft_email": {
          const params = new URLSearchParams();
          if (formData.to) params.set("to", formData.to);
          if (formData.subject) params.set("subject", formData.subject);
          if (formData.body) params.set("body", formData.body);
          router.push(`/emails?${params.toString()}&compose=true`);
          return;
        }
        // ── Appointments ──────────────────────────────────────────────────
        case "update_appointment": {
          const res = await fetch(`/api/appointments/${action.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: formData.status }) });
          if (!res.ok) throw new Error("Error al actualizar cita");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "delete_appointment": {
          const res = await fetch(`/api/appointments/${action.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Error al eliminar cita");
          markDone(getSuccessMessage(action.type));
          break;
        }
        // ── Availability ──────────────────────────────────────────────────
        case "create_availability": {
          const res = await fetch("/api/availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: formData.name, timezone: formData.timezone }) });
          if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Error al crear disponibilidad");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "edit_availability": {
          const res = await fetch(`/api/availability/${action.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: formData.name, timezone: formData.timezone }) });
          if (!res.ok) throw new Error("Error al actualizar disponibilidad");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "delete_availability": {
          const res = await fetch(`/api/availability/${action.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Error al eliminar disponibilidad");
          markDone(getSuccessMessage(action.type));
          break;
        }
        // ── Appointment Types ─────────────────────────────────────────────
        case "create_appointment_type": {
          const body = { name: formData.name, slug: formData.slug, duration: Number(formData.duration), scheduleId: formData.scheduleId, description: formData.description || undefined, color: formData.color || undefined };
          const res = await fetch("/api/appointment-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Error al crear tipo de cita");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "edit_appointment_type": {
          const body: Record<string, unknown> = {};
          if (formData.name) body.name = formData.name;
          if (formData.slug) body.slug = formData.slug;
          if (formData.duration) body.duration = Number(formData.duration);
          if (formData.description) body.description = formData.description;
          if (formData.color) body.color = formData.color;
          if (formData.isActive !== undefined) body.isActive = formData.isActive === "true";
          const res = await fetch(`/api/appointment-types/${action.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!res.ok) throw new Error("Error al actualizar tipo de cita");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "delete_appointment_type": {
          const res = await fetch(`/api/appointment-types/${action.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Error al eliminar tipo de cita");
          markDone(getSuccessMessage(action.type));
          break;
        }
        // ── Forms ─────────────────────────────────────────────────────────
        case "create_form": {
          const res = await fetch("/api/forms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: formData.name, companyId: formData.companyId, description: formData.description || undefined }) });
          if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Error al crear formulario");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "edit_form": {
          const body: Record<string, unknown> = {};
          if (formData.name) body.name = formData.name;
          if (formData.description) body.description = formData.description;
          if (formData.isActive !== undefined) body.isActive = formData.isActive === "true";
          const res = await fetch(`/api/forms/${action.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!res.ok) throw new Error("Error al actualizar formulario");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "delete_form": {
          const res = await fetch(`/api/forms/${action.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Error al eliminar formulario");
          markDone(getSuccessMessage(action.type));
          break;
        }
        // ── Contenido ─────────────────────────────────────────────────────
        case "create_content_item": {
          if (!formData.clientId) throw new Error("Elige el cliente o la marca");
          const body = { date: formData.date, type: formData.type || "video", title: formData.title, time: formData.time || undefined, hook: formData.hook || undefined, script: formData.script || undefined, caption: formData.caption || undefined, cta: formData.cta || undefined };
          const res = await fetch(`/api/content/clients/${formData.clientId}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Error al crear la pieza");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "create_content_batch": {
          if (!formData.clientId) throw new Error("Elige el cliente o la marca");
          const chosen = batchItems.filter((i) => i.selected);
          if (!chosen.length) throw new Error("Marca al menos una pieza");
          if (chosen.some((i) => !i.title.trim() || !i.date)) throw new Error("Cada pieza necesita título y fecha");
          let created = 0;
          for (const it of chosen) {
            const res = await fetch(`/api/content/clients/${formData.clientId}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: it.date, type: it.type, title: it.title, hook: it.hook || undefined, script: it.script || undefined, caption: it.caption || undefined, cta: it.cta || undefined }) });
            if (!res.ok) throw new Error(`Se crearon ${created} de ${chosen.length}. ${((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Falló una pieza."}`);
            created++;
          }
          markDone(`${created} piezas creadas`);
          break;
        }
        case "edit_content_item":
        case "set_content_status": {
          const body: Record<string, unknown> = {};
          for (const key of ["title", "date", "type", "hook", "script", "caption", "cta", "publishStatus"]) if (formData[key]) body[key] = formData[key];
          if (action.type === "set_content_status" && !body.publishStatus) throw new Error("Elige el estado");
          const res = await fetch(`/api/content/items/${action.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Error al actualizar la pieza");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "edit_content_client_context": {
          const res = await fetch(`/api/content/clients/${action.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context: formData.context ?? "" }) });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Error al actualizar la voz de la marca");
          markDone(getSuccessMessage(action.type));
          break;
        }
        // ── Docs ──────────────────────────────────────────────────────────
        case "create_kb_doc": {
          const res = await fetch("/api/kb", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: formData.title, content: formData.content || "" }) });
          if (!res.ok) throw new Error("Error al crear el doc");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "edit_kb_doc": {
          const body: Record<string, unknown> = {};
          if (formData.title) body.title = formData.title;
          if (formData.content !== undefined && !("appendContent" in (action.prefill ?? {}))) body.content = formData.content;
          if (formData.appendContent) {
            const current = await fetch(`/api/kb/${action.id}`);
            if (!current.ok) throw new Error("No se pudo leer el doc");
            const page = (await current.json()) as { content?: string | null };
            body.content = `${page.content ?? ""}${page.content ? "\n\n" : ""}${formData.appendContent}`;
          }
          const res = await fetch(`/api/kb/${action.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!res.ok) throw new Error("Error al actualizar el doc");
          markDone(getSuccessMessage(action.type));
          break;
        }
        // ── Videos ────────────────────────────────────────────────────────
        case "create_video": {
          const body: Record<string, unknown> = { title: formData.title, platform: formData.platform };
          for (const key of ["hook", "hookType", "views", "leadsGenerated", "notes", "contentClientId"]) if (formData[key]) body[key] = formData[key];
          const res = await fetch("/api/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Error al registrar el video");
          markDone(getSuccessMessage(action.type));
          break;
        }
        case "create_ai_schedule": {
          const body = { ...formData, days: Number(formData.days) || undefined, weeklyDay: Number(formData.weeklyDay ?? 1), hour: Number(formData.hour ?? 8) };
          const res = await fetch("/api/ai/schedules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Error al crear la programación");
          markDone(getSuccessMessage(action.type));
          break;
        }
        // ── Pipeline ──────────────────────────────────────────────────────
        case "create_pipeline_category": {
          const res = await fetch("/api/pipelines", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: formData.name }) });
          if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Error al crear la categoría");
          markDone(getSuccessMessage(action.type));
          break;
        }
        // ── Cobros ────────────────────────────────────────────────────────
        case "create_client_report": {
          const res = await fetch(`/api/clients/${action.id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month: formData.month ? Number(formData.month) : undefined, year: formData.year ? Number(formData.year) : undefined, save: true }) });
          const data = (await res.json().catch(() => ({}))) as { error?: string; markdown?: string; docId?: string };
          if (!res.ok) throw new Error(data.error ?? "Error al crear el informe");
          markDone(`Informe guardado en Docs`);
          if (formData.email === "true" && data.markdown) {
            const params = new URLSearchParams({ subject: `Informe mensual — ${action.name}`, body: data.markdown.slice(0, 6000) });
            router.push(`/emails?${params.toString()}&compose=true`);
          }
          break;
        }
        case "record_client_payment": {
          const month = Number(formData.month);
          const year = Number(formData.year);
          if (!(month >= 1 && month <= 12) || !year) throw new Error("Indica el mes (1-12) y el año");
          const list = await fetch(`/api/clients/${action.id}/payments`);
          if (!list.ok) throw new Error("No se pudieron leer los cobros del cliente");
          const payments = (await list.json()) as { id: string; month: number; year: number }[];
          let paymentId = payments.find((p) => p.month === month && p.year === year)?.id;
          if (!paymentId) {
            const created = await fetch(`/api/clients/${action.id}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, year, amount: formData.amount || undefined }) });
            if (!created.ok) throw new Error("No se pudo crear el cobro de ese mes");
            paymentId = ((await created.json()) as { id: string }).id;
          }
          const res = await fetch(`/api/clients/${action.id}/payments`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId, status: "RECIBIDO" }) });
          if (!res.ok) throw new Error("No se pudo marcar el cobro como recibido");
          markDone(getSuccessMessage(action.type));
          break;
        }
      }
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg((err as Error)?.message ?? "Error desconocido");
    }
  }

  return (
    <div className="border border-border-subtle rounded-xl bg-surface-app p-4 my-2 max-w-[480px]">
      {/* Header */}
      {action.type !== "query_result" && (
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={config.icon} size={18} color={config.color} />
          <span className="text-sm font-semibold text-text-primary">{cardTitle}</span>
        </div>
      )}
      {action.type === "query_result" && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">{cardTitle}</span>
        </div>
      )}

      {/* Cancelled */}
      {cancelled && (
        <span className="text-xs text-text-secondary italic mt-2 block">Acción cancelada</span>
      )}

      {/* Success */}
      {!cancelled && status === "success" && (
        <div className="flex items-center gap-2 text-[#10B981] mt-3">
          <HugeiconsIcon icon={CheckmarkCircleIcon} size={18} />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* Error */}
      {!cancelled && status === "error" && (
        <div className="mt-3 flex flex-col gap-2">
          <span className="text-[#EF4444] text-sm">{errorMsg}</span>
          <button onClick={() => setStatus("pending")} className="text-text-secondary text-sm px-3 py-1.5 rounded-lg hover:bg-surface-elevated self-start">
            Reintentar
          </button>
        </div>
      )}

      {/* Pending / Loading */}
      {!cancelled && (status === "pending" || status === "loading") && (
        <>
          {/* Query result table */}
          {action.type === "query_result" && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    {action.columns.map((col) => (
                      <th key={col} className="text-left text-xs font-medium text-text-secondary py-1.5 pr-3">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {action.rows.map((row, i) => (
                    <tr key={i} className="border-b border-border-subtle/50">
                      {row.map((cell, j) => (
                        <td key={j} className="py-1.5 pr-3 text-text-primary">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Confirm-only warning */}
          {isConfirmOnly && (
            <p className="text-sm text-text-secondary mt-2">{warningText}</p>
          )}

          {/* Form fields */}
          {!isConfirmOnly && action.type !== "query_result" && (
            <FormFields
              action={action}
              formData={formData}
              onChange={handleFieldChange}
              companies={companies}
              availabilities={availabilities}
              stages={stages}
              contentClients={contentClients}
              batchItems={batchItems}
              onBatchChange={setBatchItems}
            />
          )}

          {/* Buttons */}
          {action.type !== "query_result" && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={executeAction}
                disabled={status === "loading"}
                className="bg-[#3545D6] text-white text-sm px-4 py-1.5 rounded-lg hover:bg-[#5363EE] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {status === "loading" && (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                {status === "loading" ? "Procesando..." : confirmLabel}
              </button>
              <button
                onClick={() => {
                  sessionStorage.setItem(cancelKey, "yes");
                  setCancelled(true);
                }}
                disabled={status === "loading"}
                className="text-text-secondary text-sm px-3 py-1.5 rounded-lg hover:bg-surface-elevated disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
