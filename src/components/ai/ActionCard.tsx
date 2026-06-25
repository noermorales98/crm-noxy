"use client";

import { useState } from "react";
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
  AiBrainIcon,
} from "@hugeicons/core-free-icons";

export type ActionCardData =
  | { type: "create_contact"; prefill?: { firstName?: string; lastName?: string; email?: string; phone?: string; companyId?: string } }
  | { type: "edit_contact"; id: string; prefill?: { firstName?: string; lastName?: string; email?: string; phone?: string } }
  | { type: "delete_contact"; id: string; name: string }
  | { type: "create_deal"; prefill?: { title?: string; value?: string; stageId?: string; pipelineId?: string; contactId?: string } }
  | { type: "edit_deal"; id: string; prefill?: { title?: string; value?: string; stageId?: string } }
  | { type: "create_task"; prefill?: { title?: string; dueDate?: string; description?: string } }
  | { type: "complete_task"; id: string; title: string }
  | { type: "draft_email"; prefill?: { to?: string; subject?: string; body?: string } }
  | { type: "query_result"; title?: string; columns: string[]; rows: string[][] };

type CardStatus = "pending" | "loading" | "success" | "error";

type IconComponent = typeof UserAddIcon;

interface TypeConfig {
  icon: IconComponent;
  color: string;
  title: string;
}

const typeConfig: Record<ActionCardData["type"], TypeConfig> = {
  create_contact: { icon: UserAddIcon, color: "#10B981", title: "Crear contacto" },
  edit_contact:   { icon: UserEditIcon, color: "#6366F1", title: "Editar contacto" },
  delete_contact: { icon: UserRemoveIcon, color: "#EF4444", title: "Eliminar contacto" },
  create_deal:    { icon: SaleTagIcon, color: "#F59E0B", title: "Crear deal" },
  edit_deal:      { icon: PencilEditIcon, color: "#6366F1", title: "Editar deal" },
  create_task:    { icon: TaskAddIcon, color: "#10B981", title: "Crear tarea" },
  complete_task:  { icon: CheckmarkCircleIcon, color: "#10B981", title: "Completar tarea" },
  draft_email:    { icon: MailIcon, color: "#6366F1", title: "Redactar email" },
  query_result:   { icon: AiBrainIcon, color: "#6366F1", title: "Resultados" },
};

function getPrefill(action: ActionCardData): Record<string, string> {
  if (action.type === "delete_contact" || action.type === "complete_task" || action.type === "query_result") {
    return {};
  }
  const prefill = action.prefill ?? {};
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(prefill)) {
    if (v !== undefined) result[k] = v;
  }
  return result;
}

function getSuccessMessage(type: ActionCardData["type"]): string {
  switch (type) {
    case "create_contact": return "Contacto creado exitosamente";
    case "edit_contact":   return "Contacto actualizado";
    case "delete_contact": return "Contacto eliminado";
    case "create_deal":    return "Deal creado exitosamente";
    case "edit_deal":      return "Deal actualizado";
    case "create_task":    return "Tarea creada exitosamente";
    case "complete_task":  return "Tarea completada";
    case "draft_email":    return "Email abierto en compositor";
    case "query_result":   return "Consulta completada";
  }
}

const inputClass =
  "w-full text-sm border border-border-subtle rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[#6366F1]";

function FormFields({
  action,
  formData,
  onChange,
}: {
  action: ActionCardData;
  formData: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  switch (action.type) {
    case "create_contact":
    case "edit_contact":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input
            className={inputClass}
            placeholder="Nombre *"
            value={formData.firstName ?? ""}
            onChange={(e) => onChange("firstName", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Apellido"
            value={formData.lastName ?? ""}
            onChange={(e) => onChange("lastName", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Email"
            type="email"
            value={formData.email ?? ""}
            onChange={(e) => onChange("email", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Teléfono"
            type="tel"
            value={formData.phone ?? ""}
            onChange={(e) => onChange("phone", e.target.value)}
          />
        </div>
      );

    case "create_deal":
    case "edit_deal":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input
            className={inputClass}
            placeholder="Título *"
            value={formData.title ?? ""}
            onChange={(e) => onChange("title", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Valor"
            type="number"
            value={formData.value ?? ""}
            onChange={(e) => onChange("value", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="ID de etapa"
            value={formData.stageId ?? ""}
            onChange={(e) => onChange("stageId", e.target.value)}
          />
        </div>
      );

    case "create_task":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input
            className={inputClass}
            placeholder="Título *"
            value={formData.title ?? ""}
            onChange={(e) => onChange("title", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Descripción"
            value={formData.description ?? ""}
            onChange={(e) => onChange("description", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Fecha límite"
            type="date"
            value={formData.dueDate ?? ""}
            onChange={(e) => onChange("dueDate", e.target.value)}
          />
        </div>
      );

    case "draft_email":
      return (
        <div className="flex flex-col gap-2 mt-3">
          <input
            className={inputClass}
            placeholder="Para"
            type="email"
            value={formData.to ?? ""}
            onChange={(e) => onChange("to", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Asunto"
            value={formData.subject ?? ""}
            onChange={(e) => onChange("subject", e.target.value)}
          />
          <textarea
            className={`${inputClass} resize-none`}
            placeholder="Cuerpo del mensaje"
            rows={3}
            value={formData.body ?? ""}
            onChange={(e) => onChange("body", e.target.value)}
          />
        </div>
      );

    default:
      return null;
  }
}

export function ActionCard({ action }: { action: ActionCardData }) {
  const [status, setStatus] = useState<CardStatus>("pending");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>(() => getPrefill(action));
  const router = useRouter();

  const config = typeConfig[action.type];
  const cardTitle =
    action.type === "query_result"
      ? (action.title ?? "Resultados")
      : config.title;

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  async function executeAction() {
    setStatus("loading");
    try {
      switch (action.type) {
        case "create_contact": {
          const res = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });
          if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Error al crear contacto");
          setSuccessMessage(getSuccessMessage(action.type));
          setStatus("success");
          break;
        }
        case "edit_contact": {
          const res = await fetch(`/api/contacts/${action.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });
          if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Error al actualizar contacto");
          setSuccessMessage(getSuccessMessage(action.type));
          setStatus("success");
          break;
        }
        case "delete_contact": {
          const res = await fetch(`/api/contacts/${action.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Error al eliminar contacto");
          setSuccessMessage(getSuccessMessage(action.type));
          setStatus("success");
          break;
        }
        case "create_deal": {
          const res = await fetch("/api/deals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });
          if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Error al crear deal");
          setSuccessMessage(getSuccessMessage(action.type));
          setStatus("success");
          break;
        }
        case "edit_deal": {
          const res = await fetch(`/api/deals/${action.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });
          if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Error al actualizar deal");
          setSuccessMessage(getSuccessMessage(action.type));
          setStatus("success");
          break;
        }
        case "create_task": {
          const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });
          if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Error al crear tarea");
          setSuccessMessage(getSuccessMessage(action.type));
          setStatus("success");
          break;
        }
        case "complete_task": {
          const res = await fetch(`/api/tasks/${action.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isCompleted: true }),
          });
          if (!res.ok) throw new Error("Error al completar tarea");
          setSuccessMessage(getSuccessMessage(action.type));
          setStatus("success");
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
      }
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg((err as Error)?.message ?? "Error desconocido");
    }
  }

  const isConfirmOnly =
    action.type === "delete_contact" || action.type === "complete_task";

  const confirmLabel = action.type === "draft_email" ? "Abrir compositor" : "Confirmar";

  const warningText =
    action.type === "delete_contact"
      ? `¿Estás seguro de que deseas eliminar ${action.name}?`
      : action.type === "complete_task"
      ? `¿Estás seguro de que deseas completar ${action.title}?`
      : "";

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
        <span className="text-xs text-text-secondary italic mt-2 block">
          Acción cancelada
        </span>
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
          <button
            onClick={() => setStatus("pending")}
            className="text-text-secondary text-sm px-3 py-1.5 rounded-lg hover:bg-surface-elevated self-start"
          >
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
                      <th
                        key={col}
                        className="text-left text-xs font-medium text-text-secondary py-1.5 pr-3"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {action.rows.map((row, i) => (
                    <tr key={i} className="border-b border-border-subtle/50">
                      {row.map((cell, j) => (
                        <td key={j} className="py-1.5 pr-3 text-text-primary">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Warning message for confirm-only actions */}
          {isConfirmOnly && (
            <p className="text-sm text-text-secondary mt-2">{warningText}</p>
          )}

          {/* Form fields for other types */}
          {!isConfirmOnly && action.type !== "query_result" && (
            <FormFields
              action={action}
              formData={formData}
              onChange={handleFieldChange}
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
