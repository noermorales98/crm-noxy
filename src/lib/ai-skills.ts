// Habilidades del asistente: comandos que se escriben en el chat (/guion, /resumen-semanal…) con instrucciones guardadas.
// Funciones puras, sin base de datos: se prueban solas.

export type AiSkill = {
  id: string;
  /** Lo que se escribe tras la barra, en minúsculas y con guiones: `guion` → `/guion`. */
  command: string;
  name: string;
  description: string;
  /** Qué debe hacer la IA. Recibe además lo que la persona escriba después del comando. */
  instructions: string;
  enabled: boolean;
  /** De fábrica: no se borra, solo se puede desactivar. */
  builtin?: boolean;
};

export const MAX_SKILLS = 30;
export const MAX_INSTRUCTIONS = 4000;

export const FACTORY_SKILLS: AiSkill[] = [
  {
    id: "factory-guion",
    command: "guion",
    name: "Guion de video",
    description: "Escribe un guion corto con gancho, desarrollo y CTA con la voz de la marca.",
    instructions: "Escribe un guion para video corto (30–45 s) para lo que la persona pide. Estructura: GANCHO (primeros 3 segundos), DESARROLLO (3–4 frases cortas), CTA. Usa la voz y el contexto de la marca si se nombra una; si no hay voz guardada, dilo. Entrega también un caption y 3 ganchos alternativos. Si la persona confirma, propón la tarjeta create_content_item.",
    enabled: true,
    builtin: true,
  },
  {
    id: "factory-resumen-semanal",
    command: "resumen-semanal",
    name: "Resumen semanal",
    description: "Resume la semana: ventas, tareas, citas, contenido y cobros.",
    instructions: "Haz un resumen de la semana con los datos del CRM, en secciones cortas: Ventas (deals abiertos, ganados, seguimientos vencidos), Tareas y citas, Contenido (piezas atrasadas y próximas), Cobros de clientes. Cierra con las 3 prioridades más importantes para la semana que viene. No inventes cifras: usa solo lo que aparece en el contexto.",
    enabled: true,
    builtin: true,
  },
  {
    id: "factory-plan-contenido",
    command: "plan-contenido",
    name: "Plan de contenido del mes",
    description: "Propone ganchos y un calendario del mes para una marca según lo que mejor le ha funcionado.",
    instructions: "Nombra la marca. Con su voz y el rendimiento de sus videos (tipos de gancho, plataformas, vistas), propón: (1) 3 conclusiones de lo que ha funcionado, citando los títulos de los videos en los que te basas; (2) un calendario de 8 a 12 piezas para el mes con fecha, tipo, título y gancho; (3) abre la tarjeta create_content_batch con esas piezas para que la persona las cree de una vez. Si hay pocos videos con vistas, dilo y no afirmes tendencias.",
    enabled: true,
    builtin: true,
  },
  {
    id: "factory-informe-cliente",
    command: "informe-cliente",
    name: "Informe mensual de un cliente",
    description: "Prepara el informe del mes de un cliente de la agencia y lo guarda en Docs.",
    instructions: "Identifica el cliente de la lista CLIENTES y el mes (por defecto el mes anterior). Explica en 3 líneas qué incluirá el informe (cobros, contenido entregado, videos) y abre la tarjeta create_client_report con el id del cliente. Después de crearlo, ofrece redactar un mensaje breve para enviárselo.",
    enabled: true,
    builtin: true,
  },
  {
    id: "factory-propuesta",
    command: "propuesta",
    name: "Propuesta comercial",
    description: "Redacta una propuesta para un deal o cliente.",
    instructions: "Redacta una propuesta comercial breve (resumen del problema, solución, entregables, inversión y siguientes pasos) para el deal o cliente que la persona indique, usando sus datos del CRM. Tono profesional y claro. Si faltan datos de precio, pregunta o deja el campo marcado como [por definir].",
    enabled: true,
    builtin: true,
  },
  {
    id: "factory-seguimiento",
    command: "seguimiento",
    name: "Mensaje de seguimiento",
    description: "Redacta un mensaje de seguimiento para un deal o contacto.",
    instructions: "Redacta un mensaje de seguimiento (WhatsApp o correo, el que la persona prefiera; por defecto WhatsApp) para el contacto o deal indicado. Breve, humano y con una sola pregunta o acción clara. Basado en la última interacción que aparezca en el contexto. Ofrece una versión alternativa más formal.",
    enabled: true,
    builtin: true,
  },
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Convierte lo que escribió la persona en un comando válido: minúsculas, sin acentos, letras, números y guiones. */
export function slugCommand(value: string): string {
  return norm(value).replace(/^\/+/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
}

/** Lee lo guardado sin fiarse de su forma. Devuelve solo habilidades propias válidas, sin comandos repetidos ni de fábrica. */
export function parseCustomSkills(stored: string | null | undefined): AiSkill[] {
  let raw: unknown;
  try {
    raw = JSON.parse(stored ?? "");
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const taken = new Set(FACTORY_SKILLS.map((s) => s.command));
  const out: AiSkill[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const command = slugCommand(typeof r.command === "string" ? r.command : "");
    const instructions = typeof r.instructions === "string" ? r.instructions.trim().slice(0, MAX_INSTRUCTIONS) : "";
    if (!command || !instructions || taken.has(command)) continue;
    taken.add(command);
    out.push({
      id: typeof r.id === "string" && r.id ? r.id : `custom-${command}`,
      command,
      name: (typeof r.name === "string" && r.name.trim()) || command,
      description: typeof r.description === "string" ? r.description.trim().slice(0, 200) : "",
      instructions,
      enabled: r.enabled !== false,
    });
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
}

/** Fábrica (con su estado activado/desactivado guardado) más las propias. */
export function mergeSkills(custom: AiSkill[], disabledFactory: string[] = []): AiSkill[] {
  return [...FACTORY_SKILLS.map((s) => ({ ...s, enabled: !disabledFactory.includes(s.id) })), ...custom];
}

/** Si el mensaje empieza con `/comando` de una habilidad activa, devuelve la habilidad y lo que sigue. */
export function matchSkill(message: string, skills: AiSkill[]): { skill: AiSkill; rest: string } | null {
  const m = /^\/([a-zA-Z0-9áéíóúñÁÉÍÓÚÑ-]+)(?:\s+([\s\S]*))?$/.exec(message.trim());
  if (!m) return null;
  const command = slugCommand(m[1]);
  const skill = skills.find((s) => s.enabled && s.command === command);
  return skill ? { skill, rest: (m[2] ?? "").trim() } : null;
}

/** El mensaje que de verdad recibe el modelo: las instrucciones de la habilidad y el pedido de la persona. */
export function expandSkill(skill: AiSkill, rest: string): string {
  return `[HABILIDAD /${skill.command} — ${skill.name}]\n${skill.instructions}\n\nPedido de la persona: ${rest || "(sin detalles; usa el contexto del CRM y pregunta lo que falte)"}`;
}

/** Habilidades que coinciden con lo escrito tras la barra (para el menú del chat). */
export function suggestSkills(typed: string, skills: AiSkill[]): AiSkill[] {
  if (!typed.startsWith("/") || /\s/.test(typed)) return [];
  const q = slugCommand(typed);
  return skills.filter((s) => s.enabled && s.command.startsWith(q));
}
