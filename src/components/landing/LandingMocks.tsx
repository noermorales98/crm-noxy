"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { useInView, useLoop } from "./useLoop";
import type { IconSvgElement } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Clock01Icon,
  FileEditIcon,
  FolderLibraryIcon,
  SparklesIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";

/**
 * Vistas previas del CRM para la landing: componentes reales con datos inventados (nunca datos de clientes).
 * Reproducen la gramática visual del producto: hoja blanca, bordes sutiles, esquinas de 10/12 px, índigo para la acción.
 */

export function Icon({ icon, size = 18, className }: { icon: IconSvgElement; size?: number; className?: string }) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={1.75} className={className} aria-hidden="true" />;
}

const CARD = "rounded-control border border-line bg-surface-elevated";

const SUGGESTIONS = [
  { kind: "Tarea", title: "Enviar la propuesta a Ana el jueves", action: "Agregar" },
  { kind: "Cita de seguimiento", title: "Llamada el viernes 20 de noviembre, 10:00", action: "Agendar" },
  { kind: "Contacto nuevo", title: "Sofía Ruiz, sofia@estudiolumen.mx", action: "Crear" },
];

/** Página de una cita: notas de la reunión y sugerencias de la IA. Se agregan solas, una por una. */
export function AppointmentMock() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const tick = useLoop(inView, 3, 0, 900, 2000);
  const pending = 3 - tick;
  return (
    <div ref={ref} role="img" aria-label="Vista previa de una cita con las notas de la reunión y tres sugerencias de la IA: una tarea, una cita de seguimiento y un contacto nuevo, que se agregan una por una." className="rounded-surface border border-line bg-surface-elevated p-4 sm:p-5">
      <div aria-hidden="true">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-text-primary">Sesión de descubrimiento</p>
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">Confirmada</span>
        </div>
        <p className="mt-1 text-[11px] text-text-secondary">Martes 18 de noviembre, 12:00 a 13:00, con Ana Pérez</p>
        <div className="mt-4 rounded-control bg-surface-app p-3 text-[11px] text-text-primary">
          <p className="font-semibold">Siguientes pasos</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-text-secondary-strong">
            <li>Enviar la propuesta a Ana el jueves</li>
            <li>Llamada de seguimiento el viernes a las 10:00</li>
            <li>Su socia Sofía Ruiz quiere conocer el servicio</li>
          </ul>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-text-primary">
            <Icon icon={SparklesIcon} size={14} className="text-action-ink" />
            Sugerencias de la IA
          </p>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors duration-300 ${pending > 0 ? "bg-brand-lime text-brand-obsidian" : "bg-success-soft text-success"}`}>
            {pending > 0 ? `${pending} por revisar` : "Todo al día"}
          </span>
        </div>
        <ul className="mt-2 flex flex-col gap-2">
          {SUGGESTIONS.map((sg, i) => {
            const added = tick > i;
            return (
              <li key={sg.title} className={`${CARD} flex flex-col gap-2 px-3 py-2.5 transition-colors duration-300 sm:flex-row sm:items-center sm:justify-between ${added ? "border-success/40" : ""}`}>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-text-secondary">{sg.kind}</p>
                  <p className="text-[11px] font-semibold text-text-primary">{sg.title}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {added ? (
                    <span className="inline-flex items-center gap-1 rounded-control bg-success-soft px-3 py-1.5 text-[10px] font-semibold text-success motion-safe:animate-[crm-enter_300ms_ease-out]">
                      <Icon icon={CheckmarkCircle02Icon} size={12} />
                      Agregada
                    </span>
                  ) : (
                    <>
                      <span className="rounded-control bg-action-primary px-3 py-1.5 text-[10px] font-semibold text-action-primary-foreground">{sg.action}</span>
                      <span className="rounded-control border border-line px-3 py-1.5 text-[10px] font-semibold text-text-primary">Descartar</span>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Resumen diario por WhatsApp: las líneas llegan una por una. */
export function DigestMock() {
  const rows = ["3 tareas vencen hoy", "2 citas mañana, la primera a las 11:00", "Un cobro vence en 2 días", "4 leads sin respuesta desde hace 14 días"];
  const [ref, inView] = useInView<HTMLDivElement>();
  const tick = useLoop(inView, rows.length, rows.length, 650, 2200);
  return (
    <div ref={ref} role="img" aria-label="Vista previa del resumen diario por WhatsApp: tareas del día, citas de mañana, un cobro por vencer y leads sin respuesta." className="rounded-surface bg-surface-elevated p-4">
      <div aria-hidden="true" className="text-[11px] text-text-primary">
        <p className="flex items-center gap-2 font-semibold">
          <Icon icon={WhatsappIcon} size={16} className="text-success" />
          Resumen de hoy, 9:00 a. m.
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-text-secondary-strong">
          {rows.map((r, i) => (
            <li key={r} className={`flex items-start gap-2 transition-all duration-300 ${tick > i ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"}`}>
              <Icon icon={CheckmarkCircle02Icon} size={14} className="mt-0.5 shrink-0 text-action-ink" />
              {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Recorrido de una cotización: avanza sola de enviada a aceptada. */
export function QuoteMock() {
  const steps = [
    { t: "Cotización enviada", d: "Clínica Brisa, ayer 17:20" },
    { t: "Abierta por el cliente", d: "Hoy, 10:42" },
    { t: "Aceptada", d: "El cliente aprobó la propuesta" },
  ];
  const [ref, inView] = useInView<HTMLDivElement>();
  const tick = useLoop(inView, 3, 2, 850, 2000);
  return (
    <div ref={ref} role="img" aria-label="Vista previa del recorrido de una cotización: enviada, abierta por el cliente y aceptada." className={`${CARD} p-4`}>
      <div aria-hidden="true">
        <p className="flex items-center gap-2 text-[11px] font-semibold text-text-primary">
          <Icon icon={FileEditIcon} size={14} className="text-action-ink" />
          Propuesta de marca y contenido
        </p>
        <ol className="mt-3 flex flex-col gap-3">
          {steps.map((st, i) => {
            const done = tick > i;
            return (
              <li key={st.t} className="flex items-start gap-2.5">
                <Icon icon={CheckmarkCircle02Icon} size={14} className={`transition-colors duration-300 ${done ? "text-success" : "text-text-secondary/50"}`} />
                <div className={`transition-opacity duration-300 ${done ? "opacity-100" : "opacity-45"}`}>
                  <p className="text-[11px] font-semibold text-text-primary">{st.t}</p>
                  <p className="text-[10px] text-text-secondary-strong">{done ? st.d : "Pendiente"}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** Calendario semanal de contenido: las piezas se van programando. */
export function ContentMock() {
  const days: [string, string[]][] = [["Lun", ["Reel"]], ["Mar", []], ["Mié", ["Post", "Story"]], ["Jue", ["Grabar"]], ["Vie", ["Video"]]];
  const total = days.reduce((n, [, items]) => n + items.length, 0);
  const [ref, inView] = useInView<HTMLDivElement>();
  const tick = useLoop(inView, total, total, 550, 2200);
  let seen = 0;
  return (
    <div ref={ref} role="img" aria-label="Vista previa del calendario semanal de contenido con un recordatorio de grabación el jueves." className={`${CARD} p-3`}>
      <div aria-hidden="true">
        <div className="grid grid-cols-5 gap-1.5">
          {days.map(([d, items]) => (
            <div key={d}>
              <p className="mb-1.5 text-center text-[10px] font-semibold text-text-secondary-strong">{d}</p>
              <div className="flex min-h-[72px] flex-col gap-1 rounded-control bg-surface-sidebar p-1">
                {items.map((it) => {
                  const shown = tick > seen++;
                  return (
                    <span key={it} className={`truncate rounded px-1.5 py-1 text-[10px] font-medium transition-all duration-300 ${shown ? "translate-y-0 opacity-100" : "-translate-y-1.5 opacity-0"} ${it === "Grabar" ? "bg-brand-lime text-brand-obsidian" : "bg-surface-elevated text-action-ink"}`}>{it}</span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-text-secondary-strong">
          <Icon icon={Clock01Icon} size={13} className="text-action-ink" />
          Aviso el miércoles: mañana hay grabación
        </p>
      </div>
    </div>
  );
}

/** Portal de proyecto que ve el cliente: los entregables avanzan solos. */
export function ProjectMock() {
  const items = ["Identidad de marca", "Sitio web", "Campaña de lanzamiento"];
  const [ref, inView] = useInView<HTMLDivElement>();
  const tick = useLoop(inView, 3, 2, 850, 2000);
  return (
    <div ref={ref} role="img" aria-label="Vista previa del portal de proyecto que ve el cliente: los entregables se completan uno tras otro." className={`${CARD} p-4`}>
      <div aria-hidden="true">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[11px] font-semibold text-text-primary">
            <Icon icon={FolderLibraryIcon} size={14} className="text-action-ink" />
            Lanzamiento Casa Alba
          </p>
          <span className="rounded-full bg-surface-sidebar px-2 py-0.5 text-[10px] font-semibold text-action-ink">{tick} de 3</span>
        </div>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface-sidebar">
          <div className="h-full rounded-full bg-action-primary transition-[width] duration-500" style={{ width: `${(tick / 3) * 100}%` }} />
        </div>
        <ul className="mt-3 flex flex-col gap-2.5">
          {items.map((it, i) => {
            const done = tick > i;
            return (
              <li key={it} className="flex items-center gap-2.5 text-[11px]">
                <Icon icon={CheckmarkCircle02Icon} size={14} className={`transition-colors duration-300 ${done ? "text-success" : "text-text-secondary/50"}`} />
                <span className={done ? "text-text-primary" : "text-text-secondary-strong"}>{it}</span>
                <span className="ml-auto text-[10px] text-text-secondary">{done ? "Entregado" : "En curso"}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
