export const PERMISSION_MODULES = [
  { key: "crm", label: "Inicio / CRM", description: "Contactos, empresas, pipeline, tareas, citas y proyectos" },
  { key: "mail", label: "Correo", description: "Bandeja, campañas y cuentas de email" },
  { key: "kb", label: "Docs", description: "Base de conocimiento" },
  { key: "assistant", label: "Asistente", description: "Chat con IA" },
  { key: "vault", label: "Bóveda", description: "Contraseñas y datos sensibles de clientes" },
  { key: "content", label: "Gestión de contenido", description: "Calendarios y avisos de grabación" },
  { key: "settings", label: "Configuración", description: "Ajustes, digest e integraciones" },
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number]["key"];
export type RoleName = "OWNER" | "ADMIN" | "MEMBER";
export type ModulePermissions = Record<PermissionModule, boolean>;

export const ALL_PERMISSIONS: ModulePermissions = {
  crm: true,
  mail: true,
  kb: true,
  assistant: true,
  vault: true,
  content: true,
  settings: true,
};

export const MEMBER_DEFAULT_PERMISSIONS: ModulePermissions = {
  crm: true,
  mail: false,
  kb: false,
  assistant: false,
  vault: false,
  content: false,
  settings: false,
};

const MODULE_KEYS = PERMISSION_MODULES.map((m) => m.key);

export function isRoleName(value: unknown): value is RoleName {
  return value === "OWNER" || value === "ADMIN" || value === "MEMBER";
}

export function sanitizePermissions(raw: unknown, fallback: ModulePermissions = MEMBER_DEFAULT_PERMISSIONS): ModulePermissions {
  const out: ModulePermissions = { ...fallback };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const obj = raw as Record<string, unknown>;
  for (const key of MODULE_KEYS) {
    if (typeof obj[key] === "boolean") out[key] = obj[key];
  }
  return out;
}

export function normalizePermissions(raw: unknown, role: RoleName | null | undefined): ModulePermissions {
  if (role === "OWNER" || role === "ADMIN") return { ...ALL_PERMISSIONS };
  return sanitizePermissions(raw, MEMBER_DEFAULT_PERMISSIONS);
}

export function hasPermission(
  role: RoleName | null | undefined,
  permissions: Partial<ModulePermissions> | null | undefined,
  module: PermissionModule,
): boolean {
  // JWT antiguo sin rol: no bloquear al dueño hasta que vuelva a entrar.
  if (!role) return true;
  if (role === "OWNER" || role === "ADMIN") return true;
  return permissions?.[module] === true;
}

export function canManageTeam(role: RoleName | null | undefined): boolean {
  if (!role) return true;
  return role === "OWNER" || role === "ADMIN";
}

export type RouteAccess =
  | { kind: "public" }
  | { kind: "auth" }
  | { kind: "team" }
  | { kind: "module"; module: PermissionModule };

const PUBLIC_PAGE_PREFIXES = [
  "/login",
  "/register",
  "/book/",
  "/form/",
  "/schedule/",
  "/docs/",
  "/cotizar/",
  "/calendario/",
  "/proyecto/",
];

const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/cron",
  "/api/public",
  "/api/webhooks",
  "/api/oauth",
  "/api/mcp",
];

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isPublicPagePath(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/register") return true;
  return PUBLIC_PAGE_PREFIXES.some((prefix) => prefix.endsWith("/") && pathname.startsWith(prefix));
}

const PAGE_MODULE_PREFIXES: Array<[string, PermissionModule]> = [
  ["/emails", "mail"],
  ["/campaigns", "mail"],
  ["/kb", "kb"],
  ["/assistant", "assistant"],
  ["/boveda", "vault"],
  ["/contenido", "content"],
  ["/settings", "settings"],
  ["/companies", "crm"],
  ["/contacts", "crm"],
  ["/tasks", "crm"],
  ["/pipeline", "crm"],
  ["/forms", "crm"],
  ["/cotizaciones", "crm"],
  ["/projects", "crm"],
  ["/appointment-types", "crm"],
  ["/availability", "crm"],
  ["/appointments", "crm"],
  ["/clients", "crm"],
];

const API_MODULE_PREFIXES: Array<[string, PermissionModule]> = [
  ["/api/emails", "mail"],
  ["/api/campaigns", "mail"],
  ["/api/kb", "kb"],
  ["/api/assistant", "assistant"],
  ["/api/ai", "assistant"],
  ["/api/content", "content"],
  ["/api/settings", "settings"],
  ["/api/google-calendar", "settings"],
  ["/api/companies", "crm"],
  ["/api/contacts", "crm"],
  ["/api/tasks", "crm"],
  ["/api/task-categories", "crm"],
  ["/api/pipelines", "crm"],
  ["/api/stages", "crm"],
  ["/api/deals", "crm"],
  ["/api/forms", "crm"],
  ["/api/quotes", "crm"],
  ["/api/quote-settings", "crm"],
  ["/api/projects", "crm"],
  ["/api/appointments", "crm"],
  ["/api/appointment-types", "crm"],
  ["/api/availability", "crm"],
  ["/api/sales", "crm"],
  ["/api/dashboard-preferences", "crm"],
];

function matchPrefix(pathname: string, prefixes: Array<[string, PermissionModule]>): PermissionModule | null {
  for (const [prefix, module] of prefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return module;
  }
  return null;
}

export function resolveRouteAccess(pathname: string): RouteAccess {
  if (pathname.startsWith("/api/")) {
    if (isPublicApiPath(pathname)) return { kind: "public" };
    if (pathname === "/api/members" || pathname.startsWith("/api/members/")) return { kind: "team" };
    if (pathname.includes("/vault")) return { kind: "module", module: "vault" };
    if (pathname === "/api/clients" || pathname.startsWith("/api/clients/")) return { kind: "module", module: "crm" };
    const apiModule = matchPrefix(pathname, API_MODULE_PREFIXES);
    if (apiModule) return { kind: "module", module: apiModule };
    return { kind: "auth" };
  }

  if (isPublicPagePath(pathname)) return { kind: "public" };
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return { kind: "auth" };
  if (pathname === "/settings/equipo" || pathname.startsWith("/settings/equipo/")) return { kind: "team" };
  if (pathname === "/") return { kind: "module", module: "crm" };

  const pageModule = matchPrefix(pathname, PAGE_MODULE_PREFIXES);
  if (pageModule) return { kind: "module", module: pageModule };
  return { kind: "auth" };
}

const HOME_BY_MODULE: Array<[PermissionModule, string]> = [
  ["crm", "/"],
  ["mail", "/emails"],
  ["kb", "/kb"],
  ["assistant", "/assistant"],
  ["content", "/contenido"],
  ["vault", "/boveda"],
  ["settings", "/settings"],
];

export function firstAllowedPath(
  role: RoleName | null | undefined,
  permissions: Partial<ModulePermissions> | null | undefined,
): string {
  for (const [module, path] of HOME_BY_MODULE) {
    if (hasPermission(role, permissions, module)) return path;
  }
  return "/profile";
}

export const SECTION_PERMISSION: Record<string, PermissionModule> = {
  home: "crm",
  mail: "mail",
  kb: "kb",
  assistant: "assistant",
  vault: "vault",
  content: "content",
};

export function parsePermissionsFromBody(raw: unknown): ModulePermissions {
  const empty: ModulePermissions = {
    crm: false,
    mail: false,
    kb: false,
    assistant: false,
    vault: false,
    content: false,
    settings: false,
  };
  return sanitizePermissions(raw, empty);
}
