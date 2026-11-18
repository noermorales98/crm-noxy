"use client";

import { CheckmarkCircle02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Icon } from "./LandingMocks";
import { useInView, useLoop } from "./useLoop";

/** Mini vistas de los tres pasos de "Cómo funciona". Se animan solas mientras están en pantalla. */

const SOURCES: [string, string][] = [
  ["Formulario web", "bg-[#DDE3FE] text-[#3545D6]"],
  ["Agenda en línea", "bg-sky-100 text-sky-700"],
  ["Granola", "bg-violet-100 text-violet-700"],
  ["Notion", "bg-amber-100 text-amber-700"],
];

export function SourcesPreview() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const tick = useLoop(inView, SOURCES.length, SOURCES.length, 450, 1800);
  return (
    <div ref={ref} className="flex min-h-10 flex-wrap content-start gap-1.5">
      {SOURCES.map(([t, cls], i) => (
        <span key={t} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-300 ${cls} ${tick > i ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}>{t}</span>
      ))}
    </div>
  );
}

const IDEAS = ["Enviar la propuesta a Ana el jueves", "Llamada de seguimiento, viernes 10:00", "Crear contacto: Sofía Ruiz"];

export function SuggestionPreview() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const tick = useLoop(inView, IDEAS.length, 0, 1000, 400);
  const idx = Math.min(tick, IDEAS.length - 1);
  return (
    <div ref={ref} className="flex h-10 items-center gap-2 overflow-hidden rounded-control border border-violet-200 bg-surface-elevated px-3 text-[11px] font-medium text-text-primary">
      <Icon icon={SparklesIcon} size={14} className="shrink-0 text-violet-600" />
      <span key={idx} className="truncate motion-safe:animate-[crm-enter_300ms_ease-out]">{IDEAS[idx]}</span>
    </div>
  );
}

export function DecidePreview() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const tick = useLoop(inView, 2, 0, 950, 1300);
  const added = tick >= 1;
  return (
    <div ref={ref} className="flex h-10 items-center gap-2">
      <span className={`inline-flex items-center gap-1 rounded-control px-3 py-1.5 text-[11px] font-semibold transition-all duration-300 ${added ? "bg-emerald-100 text-emerald-700" : "bg-action-primary text-action-primary-foreground"} ${tick === 0 ? "" : "scale-[0.97]"}`}>
        {added && <Icon icon={CheckmarkCircle02Icon} size={12} />}
        {added ? "Agregada" : "Agregar"}
      </span>
      {!added && <span className="rounded-control border border-line bg-surface-elevated px-3 py-1.5 text-[11px] font-semibold text-text-primary">Descartar</span>}
    </div>
  );
}
