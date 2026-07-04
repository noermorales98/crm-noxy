export type CrmSearchPage = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  keywords: string[];
};

export const CRM_SEARCH_PAGES: CrmSearchPage[] = [
  { id: "nav-home", title: "Inicio", subtitle: "Dashboard", href: "/", keywords: ["inicio", "dashboard", "home"] },
  { id: "nav-companies", title: "Empresas", href: "/companies", keywords: ["empresas", "companies", "company"] },
  { id: "nav-contacts", title: "Contactos", href: "/contacts", keywords: ["contactos", "contacts", "contact"] },
  { id: "nav-tasks", title: "Tareas", href: "/tasks", keywords: ["tareas", "tasks", "task"] },
  { id: "nav-pipeline", title: "Ventas", subtitle: "Pipeline", href: "/pipeline", keywords: ["ventas", "pipeline", "deals", "oportunidades"] },
  { id: "nav-forms", title: "Formularios", href: "/forms", keywords: ["formularios", "forms", "form"] },
  { id: "nav-emails", title: "Correo", subtitle: "Bandeja de entrada", href: "/emails", keywords: ["correo", "emails", "mail", "bandeja"] },
  { id: "nav-campaigns", title: "Campañas", href: "/campaigns", keywords: ["campañas", "campaigns", "email marketing"] },
  { id: "nav-kb", title: "Docs", subtitle: "Knowledge base", href: "/kb", keywords: ["docs", "documentos", "kb", "knowledge"] },
  { id: "nav-vault", title: "Bóveda", href: "/boveda", keywords: ["bóveda", "boveda", "vault", "contraseñas", "clientes"] },
  { id: "nav-assistant", title: "Asistente IA", href: "/assistant", keywords: ["asistente", "assistant", "ia", "ai", "chat"] },
  { id: "nav-projects", title: "Proyectos", href: "/projects", keywords: ["proyectos", "projects", "project"] },
  { id: "nav-appointments", title: "Citas agendadas", href: "/appointments", keywords: ["citas", "appointments", "agenda"] },
  { id: "nav-appointment-types", title: "Tipos de cita", href: "/appointment-types", keywords: ["tipos de cita", "appointment types"] },
  { id: "nav-availability", title: "Disponibilidad", href: "/availability", keywords: ["disponibilidad", "availability", "horarios"] },
  { id: "nav-settings", title: "Configuración", href: "/settings", keywords: ["configuración", "settings", "ajustes"] },
];

export function matchCrmSearchPages(q: string, limit = 5): CrmSearchPage[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];

  return CRM_SEARCH_PAGES.filter((page) => {
    const haystack = [page.title, page.subtitle ?? "", ...page.keywords]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle) || page.keywords.some((k) => k.includes(needle));
  }).slice(0, limit);
}
