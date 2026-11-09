export type CrmSearchPage = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  keywords: string[];
};

// Catálogo de secciones y opciones del CRM que la búsqueda encuentra. La prueba exige que cada
// destino del menú y de Ajustes esté aquí; las opciones (acciones frecuentes) se añaden a mano.
export const CRM_SEARCH_PAGES: CrmSearchPage[] = [
  // Trabajo
  { id: "nav-home", title: "Inicio", subtitle: "Dashboard", href: "/", keywords: ["inicio", "dashboard", "home", "resumen", "personalizar", "widgets"] },
  { id: "nav-tasks", title: "Tareas", subtitle: "Pendientes y completadas", href: "/tasks", keywords: ["tareas", "tasks", "task", "pendientes", "completadas"] },
  { id: "nav-projects", title: "Proyectos", href: "/projects", keywords: ["proyectos", "projects", "project"] },
  { id: "nav-project-create", title: "Nuevo proyecto", subtitle: "Proyectos", href: "/projects/create", keywords: ["crear proyecto", "nuevo proyecto", "agregar proyecto"] },
  { id: "nav-contacts", title: "Contactos", href: "/contacts", keywords: ["contactos", "contacts", "contact", "personas", "leads"] },
  { id: "nav-companies", title: "Empresas", href: "/companies", keywords: ["empresas", "companies", "company", "cuentas", "smtp"] },
  { id: "nav-appointments", title: "Citas agendadas", subtitle: "Agenda", href: "/appointments", keywords: ["citas", "appointments", "agenda", "reuniones", "calendario"] },
  { id: "nav-appointment-types", title: "Tipos de cita", subtitle: "Agenda", href: "/appointment-types", keywords: ["tipos de cita", "appointment types", "reunion", "duracion"] },
  { id: "nav-availability", title: "Disponibilidad", subtitle: "Agenda", href: "/availability", keywords: ["disponibilidad", "availability", "horarios", "horas"] },
  // Ventas
  { id: "nav-pipeline", title: "Pipeline de ventas", subtitle: "Ventas", href: "/pipeline", keywords: ["ventas", "pipeline", "deals", "oportunidades", "tratos", "embudo"] },
  { id: "nav-pipeline-clientes", title: "Clientes", subtitle: "Cobros recurrentes", href: "/pipeline/clientes", keywords: ["clientes", "recurrente", "mrr", "cobros", "pagos", "mensualidad"] },
  { id: "nav-pipeline-historial", title: "Historial de tratos", subtitle: "Ventas", href: "/pipeline/historial", keywords: ["historial", "tratos", "cerrados", "ganados", "perdidos"] },
  { id: "nav-cotizaciones", title: "Cotizaciones", subtitle: "Ventas", href: "/cotizaciones", keywords: ["cotizaciones", "presupuestos", "propuestas", "quotes"] },
  { id: "nav-cotizacion-nueva", title: "Nueva cotización", subtitle: "Cotizaciones", href: "/cotizaciones/nueva", keywords: ["crear cotizacion", "nueva cotizacion", "presupuesto"] },
  { id: "nav-cotizacion-config", title: "Configuración de cotizaciones", subtitle: "Cotizaciones", href: "/cotizaciones/configuracion", keywords: ["configuracion cotizaciones", "plantilla", "folio", "impuestos"] },
  { id: "nav-forms", title: "Formularios", subtitle: "Ventas", href: "/forms", keywords: ["formularios", "forms", "form", "registros", "leads"] },
  // Espacios
  { id: "nav-emails", title: "Correo", subtitle: "Bandeja de entrada", href: "/emails", keywords: ["correo", "emails", "mail", "bandeja", "redactar", "programar"] },
  { id: "nav-campaigns", title: "Campañas", subtitle: "Correo", href: "/campaigns", keywords: ["campañas", "campaigns", "email marketing", "envios masivos"] },
  { id: "nav-kb", title: "Docs", subtitle: "Documentos", href: "/kb", keywords: ["docs", "documentos", "kb", "knowledge", "notas", "wiki"] },
  { id: "nav-assistant", title: "Asistente IA", href: "/assistant", keywords: ["asistente", "assistant", "ia", "ai", "chat", "inteligencia artificial"] },
  { id: "nav-assistant-new", title: "Nuevo chat con la IA", subtitle: "Asistente IA", href: "/assistant/new", keywords: ["nueva conversacion", "nuevo chat", "preguntar"] },
  { id: "nav-vault", title: "Bóveda", subtitle: "Credenciales de clientes", href: "/boveda", keywords: ["boveda", "vault", "contraseñas", "credenciales", "accesos"] },
  { id: "nav-content-home", title: "Contenido", subtitle: "Resumen de piezas y clientes", href: "/contenido", keywords: ["contenido", "resumen", "pendientes", "por subir", "atrasadas", "dashboard"] },
  { id: "nav-content-clients", title: "Clientes de contenido", subtitle: "Contenido", href: "/contenido/clientes", keywords: ["clientes", "marcas", "calendarios", "contenido"] },
  { id: "nav-content", title: "Calendario de contenido", subtitle: "Gestión de contenido", href: "/contenido/general", keywords: ["gestion de contenido", "calendario", "publicaciones", "redes sociales", "piezas"] },
  { id: "nav-content-reminders", title: "Recordatorios de contenido", subtitle: "Contenido", href: "/contenido/recordatorios", keywords: ["recordatorios", "avisos", "whatsapp", "grabacion", "publicar"] },
  // Cuenta y ajustes
  { id: "nav-profile", title: "Perfil", subtitle: "Tu cuenta", href: "/profile", keywords: ["perfil", "profile", "cuenta", "mi usuario", "contraseña", "foto"] },
  { id: "nav-settings", title: "Ajustes", subtitle: "General", href: "/settings", keywords: ["ajustes", "configuracion", "settings", "general", "organizacion", "zona horaria", "pipeline", "archivar"] },
  { id: "nav-settings-notifications", title: "Notificaciones", subtitle: "Ajustes", href: "/settings/notificaciones", keywords: ["notificaciones", "alertas", "correo de notificacion", "whatsapp", "callmebot"] },
  { id: "nav-settings-integrations", title: "Integraciones", subtitle: "Ajustes", href: "/settings/integraciones", keywords: ["integraciones", "google calendar", "calendario de google", "conectar"] },
  { id: "nav-settings-appearance", title: "Apariencia y sonidos", subtitle: "Ajustes", href: "/settings/apariencia", keywords: ["apariencia", "tema", "colores", "sonidos", "modo oscuro"] },
  { id: "nav-settings-team", title: "Equipo", subtitle: "Ajustes", href: "/settings/equipo", keywords: ["equipo", "team", "miembros", "invitar", "roles", "permisos"] },
  { id: "nav-settings-ai", title: "Modelos de IA", subtitle: "Ajustes", href: "/settings/ai-models", keywords: ["modelos", "ia", "openrouter", "llm", "api key"] },
  { id: "nav-settings-digest", title: "Resumen diario", subtitle: "Ajustes", href: "/settings/digest", keywords: ["resumen diario", "digest", "whatsapp", "notificaciones"] },
];

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Coincidencias por palabras (sin acentos ni mayúsculas); el título exacto o por prefijo va primero. */
export function matchCrmSearchPages(q: string, limit = 5): CrmSearchPage[] {
  const needle = normalize(q.trim());
  if (!needle) return [];
  const words = needle.split(/\s+/).filter(Boolean);

  const scored: Array<{ page: CrmSearchPage; score: number }> = [];
  for (const page of CRM_SEARCH_PAGES) {
    const title = normalize(page.title);
    const haystack = normalize([page.title, page.subtitle ?? "", ...page.keywords].join(" "));
    if (!words.every((word) => haystack.includes(word))) continue;
    const score = title === needle ? 0 : title.startsWith(needle) ? 1 : title.includes(needle) ? 2 : 3;
    scored.push({ page, score });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((entry) => entry.page);
}
