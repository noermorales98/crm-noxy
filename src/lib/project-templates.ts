// Plantillas de proyecto por servicio: tareas base que se crean cuando un deal se gana.
// Funciones puras; la persistencia vive en deal-won.ts.

export type TemplateTask = { title: string; offsetDays: number; description?: string };
export type ProjectTemplateDef = { service: string; description: string; tasks: TemplateTask[] };

export const DEFAULT_TEMPLATES: ProjectTemplateDef[] = [
  {
    service: "General",
    description: "Arranque estándar para cualquier servicio",
    tasks: [
      { title: "Confirmar alcance y entregables con el cliente", offsetDays: 0 },
      { title: "Registrar anticipo y calendario de pagos", offsetDays: 1 },
      { title: "Agendar reunión de arranque", offsetDays: 1 },
      { title: "Recopilar accesos y materiales del cliente", offsetDays: 3 },
      { title: "Primera entrega para revisión", offsetDays: 10 },
    ],
  },
  {
    service: "Videos con IA",
    description: "Producción de videos con IA para redes",
    tasks: [
      { title: "Definir objetivo, público y tono de marca", offsetDays: 1 },
      { title: "Guion y hooks (3 opciones) para aprobación", offsetDays: 3 },
      { title: "Generar y editar primeros videos", offsetDays: 7 },
      { title: "Revisión del cliente y ajustes", offsetDays: 10 },
      { title: "Publicar y programar (IG, TikTok, Facebook)", offsetDays: 12 },
      { title: "Reporte de métricas de la primera tanda", offsetDays: 30 },
    ],
  },
  {
    service: "Gestión de redes",
    description: "Manejo mensual de redes sociales",
    tasks: [
      { title: "Pedir accesos a las cuentas y brand kit", offsetDays: 1 },
      { title: "Auditoría rápida de perfiles actuales", offsetDays: 3 },
      { title: "Calendario de contenido del primer mes", offsetDays: 5 },
      { title: "Primera tanda de piezas lista", offsetDays: 10 },
      { title: "Reporte mensual al cliente", offsetDays: 30 },
    ],
  },
  {
    service: "Sitio web",
    description: "Diseño y publicación de sitio o landing",
    tasks: [
      { title: "Brief: objetivo, páginas y referencias", offsetDays: 1 },
      { title: "Propuesta de diseño para aprobación", offsetDays: 6 },
      { title: "Desarrollo del sitio", offsetDays: 14 },
      { title: "Revisión del cliente y ajustes", offsetDays: 18 },
      { title: "Publicación y entrega de accesos", offsetDays: 21 },
    ],
  },
  {
    service: "Libro Editorial",
    description: "Libro con Noxy Editorial hasta publicación en KDP",
    tasks: [
      { title: "Entrevista con el autor", offsetDays: 3 },
      { title: "Primer borrador del manuscrito", offsetDays: 14 },
      { title: "Revisión del autor y correcciones", offsetDays: 24 },
      { title: "Portada, maquetación y formato KDP", offsetDays: 32 },
      { title: "Publicación en KDP", offsetDays: 40 },
    ],
  },
];

/** Elige el servicio por el pipeline (Editorial) o por palabras del título/notas; si no, «General». */
export function pickService(deal: { title: string; notes?: string | null; pipelineName?: string | null }): string {
  if (/editorial/i.test(deal.pipelineName ?? "")) return "Libro Editorial";
  const text = `${deal.title} ${deal.notes ?? ""}`.toLowerCase();
  if (/libro|manuscrito|kdp/.test(text)) return "Libro Editorial";
  if (/video|reel|tiktok/.test(text)) return "Videos con IA";
  if (/redes|social|community|instagram|facebook/.test(text)) return "Gestión de redes";
  if (/\bweb\b|sitio|landing|p[aá]gina/.test(text)) return "Sitio web";
  return "General";
}

export function parseTemplateTasks(raw: string): TemplateTask[] {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((t) => t && typeof t.title === "string" && t.title.trim())
      .map((t) => ({ title: t.title.trim(), offsetDays: Number.isFinite(t.offsetDays) ? Math.max(0, Math.round(t.offsetDays)) : 0, description: typeof t.description === "string" ? t.description : undefined }));
  } catch {
    return [];
  }
}

/** Fechas de entrega relativas al día en que se ganó el deal (mediodía UTC, sin saltos de zona). */
export function buildTaskDrafts(tasks: TemplateTask[], wonAt: Date): { title: string; description: string | null; dueDate: Date }[] {
  const base = Date.UTC(wonAt.getUTCFullYear(), wonAt.getUTCMonth(), wonAt.getUTCDate(), 12);
  return tasks.map((t) => ({
    title: t.title,
    description: t.description ?? null,
    dueDate: new Date(base + t.offsetDays * 86_400_000),
  }));
}
