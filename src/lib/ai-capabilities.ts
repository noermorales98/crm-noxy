// Sugerencias de un chat nuevo: lo que el asistente ya sabe hacer. Función pura (sin red ni React).
import type { AiSkill } from "./ai-skills";

export interface CapabilityChip {
  id: string;
  /** Texto corto del botón. */
  label: string;
  /** Lo que se escribe en el mensaje al elegirlo. */
  text: string;
  kind: "skill" | "example";
}

/** Una pregunta o acción de ejemplo por área del CRM que la IA ya cubre (clientes, contenido, videos, docs, pipeline, bóveda, programaciones). */
export const CAPABILITY_EXAMPLES: Array<{ id: string; label: string; text: string }> = [
  { id: "ex-pipeline", label: "Deals sin movimiento", text: "¿Qué deals llevan más de una semana sin movimiento y qué hago con cada uno?" },
  { id: "ex-content-late", label: "Contenido atrasado", text: "¿Qué piezas de contenido están atrasadas o por subir esta semana?" },
  { id: "ex-content-new", label: "Crear una pieza", text: "Crea una pieza de contenido para " },
  { id: "ex-videos", label: "Qué video rinde más", text: "¿Qué tipo de gancho y qué plataforma están funcionando mejor en mis videos?" },
  { id: "ex-brand", label: "Ideas para una marca", text: "Propón 5 ideas de contenido para la marca " },
  { id: "ex-payments", label: "Cobros pendientes", text: "¿Qué clientes tienen un cobro vencido o por vencer?" },
  { id: "ex-docs", label: "Crear un doc", text: "Crea un doc con los pasos para " },
  { id: "ex-followup", label: "Correo de seguimiento", text: "Redacta un correo de seguimiento para " },
  { id: "ex-tasks", label: "Crear una tarea", text: "Crea una tarea para dar seguimiento a " },
  { id: "ex-schedule", label: "Programar un aviso", text: "Avísame cada lunes a las 8 con los deals sin movimiento" },
  { id: "ex-report", label: "Informe de un cliente", text: "Genera el informe del mes del cliente " },
  { id: "ex-vault", label: "Qué hay en la bóveda", text: "¿Qué secciones y claves tengo en la bóveda? (solo nombres, nunca los valores)" },
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Habilidades activas primero (mezclando las propias con las de fábrica) y después ejemplos de áreas distintas.
 * Con la misma semilla siempre sale lo mismo; con otra, otro grupo de ejemplos.
 */
export function buildCapabilityChips(skills: AiSkill[], seed = "", max = 6): CapabilityChip[] {
  const active = skills.filter((s) => s.enabled);
  const toChip = (s: AiSkill): CapabilityChip => ({ id: s.id, label: s.name, text: `/${s.command} `, kind: "skill" });
  // Las propias primero (son las que la persona se tomó el trabajo de crear), luego las de fábrica.
  const ordered = [...active.filter((s) => !s.builtin), ...active.filter((s) => s.builtin)].map(toChip);
  const maxSkills = Math.ceil(max / 2);
  const pickedSkills = ordered.slice(0, maxSkills);

  const start = CAPABILITY_EXAMPLES.length ? hash(seed) % CAPABILITY_EXAMPLES.length : 0;
  const rotated = [...CAPABILITY_EXAMPLES.slice(start), ...CAPABILITY_EXAMPLES.slice(0, start)];
  const examples: CapabilityChip[] = rotated.slice(0, Math.max(0, max - pickedSkills.length)).map((e) => ({ ...e, kind: "example" as const }));

  return [...pickedSkills, ...examples].slice(0, max);
}
