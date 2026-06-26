"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "@hugeicons/core-free-icons";

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
  // Email
  | { type: "draft_email"; prefill?: { to?: string; subject?: string; body?: string } }
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
  edit_contact:          { icon: UserEditIcon,        color: "#6366F1", title: "Editar contacto" },
  delete_contact:        { icon: UserRemoveIcon,      color: "#EF4444", title: "Eliminar contacto" },
  // Deals
  create_deal:           { icon: SaleTagIcon,         color: "#F59E0B", title: "Crear deal" },
  edit_deal:             { icon: PencilEditIcon,      color: "#6366F1", title: "Editar deal" },
  delete_deal:           { icon: Delete01Icon,        color: "#EF4444", title: "Eliminar deal" },
  // Tasks
  create_task:           { icon: TaskAddIcon,         color: "#10B981", title: "Crear tarea" },
  complete_task:         { icon: CheckmarkCircleIcon, color: "#10B981", title: "Completar tarea" },
  // Email
  draft_email:           { icon: MailIcon,            color: "#6366F1", title: "Redactar email" },
  // Appointments
  update_appointment:    { icon: PencilEditIcon,      color: "#6366F1", title: "Actualizar cita" },
  delete_appointment:    { icon: Delete01Icon,        color: "#EF4444", title: "Eliminar cita" },
  // Availability
  create_availability:   { icon: AiBrainIcon,         color: "#10B981", title: "Crear disponibilidad" },
  edit_availability:     { icon: PencilEditIcon,      color: "#6366F1", title: "Editar disponibilidad" },
  delete_availability:   { icon: Delete01Icon,        color: "#EF4444", title: "Eliminar disponibilidad" },
  // Appointment types
  create_appointment_type: { icon: AiBrainIcon,       color: "#10B981", title: "Crear tipo de cita" },
  edit_appointment_type:   { icon: PencilEditIcon,    color: "#6366F1", title: "Editar tipo de cita" },
  delete_appointment_type: { icon: Delete01Icon,      color: "#EF4444", title: "Eliminar tipo de cita" },
  // Forms
  create_form:           { icon: AiBrainIcon,         color: "#10B981", title: "Crear formulario" },
  edit_form:             { icon: PencilEditIcon,      color: "#6366F1", title: "Editar formulario" },
  delete_form:           { icon: Delete01Icon,        color: "#EF4444", title: "Eliminar formulario" },
  // Query
  query_result:          { icon: AiBrainIcon,         color: "#6366F1", title: "Resultados" },
};

const CONFIRM_ONLY_TYPES: ActionCardData["type"][] = [
  "delete_contact", "delete_deal", "complete_task",
  "delete_appointment", "delete_availability",
  "delete_appointment_type", "delete_form",
];

// Only truly one-time operations are persisted in localStorage.
// Edits and creates are repeatable and must NOT be persisted.
const PERSIST_DONE_TYPES: ActionCardData["type"][] = [
  "delete_contact", "delete_deal", "complete_task",
  "delete_appointment", "delete_availability",
  "delete_appointment_type", "delete_form",
];

function getActionStorageKey(action: ActionCardData): string {
  const id = "id" in action ? (action as { id: string }).id : JSON.stringify(action);
  return `ai_card_done_${action.type}_${id}`;
}

function getPrefill(action: ActionCardData): Record<string, string> {
  if (CONFIRM_ONLY_TYPES.includes(action.type) || action.type === "query_result") return {};
  const prefill = (action as { prefill?: Record<string, string | undefined> }).prefill ?? {};
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(prefill)) {
    if (v !== undefined) result[k] = v;
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
    default: return "";
  }
}

const inputClass =
  "w-full text-sm border border-border-subtle rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[#6366F1]";
const selectClass = `${inputClass} text-text-primary`;

function FormFields({
  action,
  formData,
  onChange,
  companies,
  availabilities,
}: {
  action: ActionCardData;
  formData: Record<string, string>;
  onChange: (key: string, value: string) => void;
  companies: { id: string; name: string }[];
  availabilities: { id: string; name: string }[];
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
    case "edit_deal":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input className={inputClass} placeholder="Título *" value={formData.title ?? ""} onChange={(e) => onChange("title", e.target.value)} />
          <input className={inputClass} placeholder="Valor" type="number" value={formData.value ?? ""} onChange={(e) => onChange("value", e.target.value)} />
          <input className={inputClass} placeholder="ID de etapa" value={formData.stageId ?? ""} onChange={(e) => onChange("stageId", e.target.value)} />
        </div>
      );

    case "create_task":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input className={inputClass} placeholder="Título *" value={formData.title ?? ""} onChange={(e) => onChange("title", e.target.value)} />
          <input className={inputClass} placeholder="Descripción" value={formData.description ?? ""} onChange={(e) => onChange("description", e.target.value)} />
          <input className={inputClass} placeholder="Fecha límite" type="date" value={formData.dueDate ?? ""} onChange={(e) => onChange("dueDate", e.target.value)} />
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

    default:
      return null;
  }
}

export function ActionCard({ action }: { action: ActionCardData }) {
  const shouldPersist = PERSIST_DONE_TYPES.includes(action.type);
  const storageKey = getActionStorageKey(action);
  const alreadyDone =
    shouldPersist && typeof window !== "undefined" && localStorage.getItem(storageKey) === "done";

  const [status, setStatus] = useState<CardStatus>(alreadyDone ? "success" : "pending");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    alreadyDone ? getSuccessMessage(action.type) : ""
  );
  const [cancelled, setCancelled] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>(() => getPrefill(action));
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [availabilities, setAvailabilities] = useState<{ id: string; name: string }[]>([]);
  const router = useRouter();

  const markDone = (msg: string) => {
    if (shouldPersist) localStorage.setItem(storageKey, "done");
    setSuccessMessage(msg);
    setStatus("success");
  };

  // Load companies for contact + form actions
  useEffect(() => {
    const needsCompanies = ["create_contact", "edit_contact", "create_form"].includes(action.type);
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
  const confirmLabel = action.type === "draft_email" ? "Abrir compositor" : "Confirmar";
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
        // ── Email ─────────────────────────────────────────────────────────
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
            />
          )}

          {/* Buttons */}
          {action.type !== "query_result" && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={executeAction}
                disabled={status === "loading"}
                className="bg-[#6366F1] text-white text-sm px-4 py-1.5 rounded-lg hover:bg-[#4F46E5] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {status === "loading" && (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                {status === "loading" ? "Procesando..." : confirmLabel}
              </button>
              <button
                onClick={() => setCancelled(true)}
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
