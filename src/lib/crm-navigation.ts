// Modelo de navegación del shell «marco claro» (spec rediseno-obsidiana-estructural; plan §3).
// Puro: sin React ni iconos, para probarlo ejecutándolo con `node --test`.
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { SECTION_PERMISSION, hasPermission, type ModulePermissions, type PermissionModule, type RoleName } from "./permissions.ts";

/** Áreas del primer nivel que agrupan varios destinos (ronda 2). */
export type AreaSection = "contacts" | "sales" | "agenda";
/** Espacios con su propio submenú (correo, docs…). */
export type SpaceSection = "mail" | "kb" | "vault" | "assistant" | "content";
export type ContextualSection = AreaSection | SpaceSection;
export type NavItem = { kind?: "link"; href: string; label: string; permission: PermissionModule; badge?: "unread-mail" };
/** Entrada de área: abre su primer destino y la sidebar muestra el submenú del área. */
export type NavArea = { kind: "area"; section: AreaSection; href: string; label: string; permission: PermissionModule };
export type NavEntry = NavItem | NavArea;
export type NavGroup = { label: string; items: NavEntry[] };
export type MobileTab = { href: string; label: string; permission: PermissionModule };

const space = (href: string, label: string, section: SpaceSection, badge?: NavItem["badge"]): NavItem => ({
  href,
  label,
  permission: SECTION_PERMISSION[section],
  ...(badge ? { badge } : {}),
});

/** Destinos de cada área, con las etiquetas y rutas de siempre; el primero es el que abre la entrada. */
export const AREA_ITEMS: Readonly<Record<AreaSection, readonly NavItem[]>> = {
  contacts: [
    { href: "/contacts", label: "Contactos", permission: "crm" },
    { href: "/companies", label: "Empresas", permission: "crm" },
  ],
  sales: [
    { href: "/pipeline", label: "Pipeline de ventas", permission: "crm" },
    { href: "/pipeline/clientes", label: "Clientes", permission: "crm" },
    { href: "/pipeline/historial", label: "Historial de tratos", permission: "crm" },
    { href: "/cotizaciones", label: "Cotizaciones", permission: "crm" },
    { href: "/forms", label: "Formularios", permission: "crm" },
  ],
  agenda: [
    { href: "/appointments", label: "Citas Agendadas", permission: "crm" },
    { href: "/appointment-types", label: "Tipos de Cita", permission: "crm" },
    { href: "/availability", label: "Disponibilidad", permission: "crm" },
  ],
};

const area = (section: AreaSection, label: string): NavArea => ({
  kind: "area",
  section,
  label,
  href: AREA_ITEMS[section][0].href,
  permission: AREA_ITEMS[section][0].permission,
});

/** Primer nivel de la sidebar: 11 entradas en 3 grupos (ronda 2). */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "Principal",
    items: [
      { href: "/", label: "Inicio", permission: "crm" },
      area("contacts", "Contactos"),
      { href: "/tasks", label: "Tareas", permission: "crm" },
      { href: "/projects", label: "Proyectos", permission: "crm" },
    ],
  },
  {
    label: "Áreas",
    items: [area("sales", "Ventas"), area("agenda", "Agenda")],
  },
  {
    label: "Espacios",
    items: [
      space("/emails", "Correo", "mail", "unread-mail"),
      space("/kb", "Docs", "kb"),
      space("/assistant", "Asistente", "assistant"),
      space("/boveda", "Bóveda", "vault"),
      space("/contenido/general", "Gestión de contenido", "content"),
    ],
  },
];

const isArea = (entry: NavEntry): entry is NavArea => entry.kind === "area";

/** Los 18 destinos de siempre, en una lista plana (directos + los de cada área). */
export const NAV_DESTINATIONS: readonly NavItem[] = NAV_GROUPS.flatMap((group) =>
  group.items.flatMap((entry) => (isArea(entry) ? AREA_ITEMS[entry.section] : [entry])),
);

export const AREA_SECTIONS: readonly AreaSection[] = ["contacts", "sales", "agenda"];
export const CONTEXTUAL_SECTIONS: readonly ContextualSection[] = [...AREA_SECTIONS, "mail", "kb", "vault", "assistant", "content"];

export function isAreaSection(section: ContextualSection): section is AreaSection {
  return (AREA_SECTIONS as readonly string[]).includes(section);
}

/** Prefijos de ruta de cada sección contextual (Correo incluye las campañas). */
const SECTION_ROUTES: Record<ContextualSection, readonly string[]> = {
  contacts: ["/contacts", "/companies"],
  sales: ["/pipeline", "/cotizaciones", "/forms"],
  agenda: ["/appointments", "/appointment-types", "/availability"],
  mail: ["/emails", "/campaigns"],
  kb: ["/kb"],
  vault: ["/boveda"],
  assistant: ["/assistant"],
  content: ["/contenido"],
};

const SECTION_LABEL: Record<ContextualSection, string> = {
  contacts: "Contactos",
  sales: "Ventas",
  agenda: "Agenda",
  mail: "Correo",
  kb: "Docs",
  vault: "Bóveda",
  assistant: "Asistente",
  content: "Gestión de contenido",
};

export const MOBILE_TABS: readonly MobileTab[] = [
  { href: "/", label: "Inicio", permission: "crm" },
  { href: "/contacts", label: "Contactos", permission: "crm" },
  { href: "/pipeline", label: "Pipeline", permission: "crm" },
  { href: "/tasks", label: "Tareas", permission: "crm" },
];

/**
 * Clases del destino activo de la sidebar (escalera de acento): pastilla `nav-active` del tema,
 * tinta del tema en texto e icono y peso 600. Dos señales sin color (fondo y peso); sin barra izquierda.
 */
export const NAV_ITEM_ACTIVE = "before:bg-nav-active before:border-line font-semibold text-[var(--nav-active-ink)]";

/** Clases de la pestaña móvil activa: tinta y peso. */
export const MOBILE_TAB_ACTIVE = "font-semibold text-[var(--nav-active-ink)]";

type Role = RoleName | null | undefined;
type Permissions = Partial<ModulePermissions> | null | undefined;

function matchesRoute(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function visibleAreaItems(section: AreaSection, role: Role, permissions: Permissions): NavItem[] {
  return AREA_ITEMS[section].filter((item) => hasPermission(role, permissions, item.permission));
}

/** Filtra por permiso; un área se ve si alguno de sus destinos se ve, y entonces abre el primero visible. */
export function visibleNavGroups(role: Role, permissions: Permissions): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.flatMap((entry): NavEntry[] => {
      if (!isArea(entry)) return hasPermission(role, permissions, entry.permission) ? [entry] : [];
      const first = visibleAreaItems(entry.section, role, permissions)[0];
      return first ? [{ ...entry, href: first.href, permission: first.permission }] : [];
    }),
  })).filter((group) => group.items.length > 0);
}

/** Entrada activa de la lista plana: la de la sección de la ruta (área o espacio), o el destino más específico. */
export function activeFlatEntry(pathname: string, groups: readonly NavGroup[]): string | null {
  const section = contextualSectionFor(pathname);
  const entries = groups.flatMap((group) => group.items);
  const sectionEntry =
    section &&
    entries.find((entry) => (isArea(entry) ? entry.section : contextualSectionFor(entry.href)) === section);
  if (sectionEntry) return sectionEntry.href;
  return activeNavHref(
    pathname,
    entries.filter((entry) => !isArea(entry)).map((entry) => entry.href),
  );
}

export function visibleMobileTabs(role: Role, permissions: Permissions): MobileTab[] {
  return MOBILE_TABS.filter((tab) => hasPermission(role, permissions, tab.permission));
}

export function contextualSectionFor(pathname: string): ContextualSection | null {
  for (const section of CONTEXTUAL_SECTIONS) {
    if (SECTION_ROUTES[section].some((prefix) => matchesRoute(pathname, prefix))) return section;
  }
  return null;
}

export function contextualSectionLabel(section: ContextualSection): string {
  return SECTION_LABEL[section];
}

/** El destino más específico que coincide con la ruta; «/» solo coincide exactamente. */
export function activeNavHref(pathname: string, hrefs: readonly string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const matches = href === "/" ? pathname === "/" : matchesRoute(pathname, href);
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

export function activeMobileTab(pathname: string, tabs: readonly MobileTab[]): string | null {
  return activeNavHref(
    pathname,
    tabs.map((tab) => tab.href),
  );
}

// ─── Ajustes ───────────────────────────────────────────────────────────────────

export type SettingsGroup = "Organización" | "Conexiones" | "Personal";
export type SettingsItem = NavItem & { requiresTeam?: boolean; group: SettingsGroup };

/** Apartados de Ajustes, cada uno en su propia pantalla; Equipo solo para quien gestiona el equipo. */
export const SETTINGS_ITEMS: readonly SettingsItem[] = [
  { href: "/settings", label: "General", permission: "settings", group: "Organización" },
  { href: "/settings/equipo", label: "Equipo", permission: "settings", requiresTeam: true, group: "Organización" },
  { href: "/settings/notificaciones", label: "Notificaciones", permission: "settings", group: "Organización" },
  { href: "/settings/digest", label: "Resumen diario", permission: "settings", group: "Organización" },
  { href: "/settings/integraciones", label: "Integraciones", permission: "settings", group: "Conexiones" },
  { href: "/settings/ai-models", label: "Modelos de IA", permission: "settings", group: "Conexiones" },
  { href: "/settings/apariencia", label: "Apariencia y sonidos", permission: "settings", group: "Personal" },
];

/** Ajustes y Perfil tienen su propia sidebar: la principal no aparece ahí. */
export function isSettingsRoute(pathname: string): boolean {
  return matchesRoute(pathname, "/settings") || matchesRoute(pathname, "/profile");
}

export function visibleSettingsItems(role: Role, permissions: Permissions, canManageTeam: boolean): SettingsItem[] {
  return SETTINGS_ITEMS.filter(
    (item) => hasPermission(role, permissions, item.permission) && (!item.requiresTeam || canManageTeam),
  );
}

export const SIDEBAR_COLLAPSED_STORAGE_KEY = "noxy.sidebar.collapsed";

/** ⌘B / Ctrl+B contrae la sidebar, salvo cuando se escribe (en un editor ⌘B es negrita). */
export function isCollapseShortcut(event: { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; editable: boolean }): boolean {
  if (event.editable || event.altKey || event.shiftKey) return false;
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b";
}


// ─── Modos de la sidebar (Ronda 3: selector tipo Claude, listas planas y cortas) ─────────────

export type NavMode = "work" | "sales" | "spaces";
export type NavModeDef = { key: NavMode; label: string; groups: NavGroup[] };

const spaceItems = (NAV_GROUPS.find((group) => group.label === "Espacios")?.items ?? []) as NavItem[];

/**
 * Tres modos, cada uno con una lista plana de 5 a 8 entradas (sin ramas desplegables). Reparten los mismos
 * 18 destinos de siempre; un destino vive en un solo modo.
 */
export const NAV_MODES: readonly NavModeDef[] = [
  {
    key: "work",
    label: "Trabajo",
    groups: [
      {
        label: "Principal",
        items: [
          { href: "/", label: "Inicio", permission: "crm" },
          { href: "/tasks", label: "Tareas", permission: "crm" },
          { href: "/projects", label: "Proyectos", permission: "crm" },
          ...AREA_ITEMS.contacts,
        ],
      },
      { label: "Agenda", items: [...AREA_ITEMS.agenda] },
    ],
  },
  { key: "sales", label: "Ventas", groups: [{ label: "Ventas", items: [...AREA_ITEMS.sales] }] },
  { key: "spaces", label: "Espacios", groups: [{ label: "Espacios", items: spaceItems }] },
];

export const MODE_STORAGE_KEY = "noxy.sidebar.mode";

function visibleGroups(groups: readonly NavGroup[], role: Role, permissions: Permissions): NavGroup[] {
  return groups
    .map((group) => ({ label: group.label, items: group.items.filter((item) => hasPermission(role, permissions, item.permission)) }))
    .filter((group) => group.items.length > 0);
}

/** Grupos visibles de un modo (por permiso); vacío si la persona no puede ver nada de ese modo. */
export function modeGroups(mode: NavMode, role: Role, permissions: Permissions): NavGroup[] {
  const def = NAV_MODES.find((candidate) => candidate.key === mode);
  return def ? visibleGroups(def.groups, role, permissions) : [];
}

/** Modos con al menos un destino visible, con sus grupos ya filtrados. */
export function visibleModes(role: Role, permissions: Permissions): NavModeDef[] {
  return NAV_MODES.map((def) => ({ ...def, groups: visibleGroups(def.groups, role, permissions) })).filter((def) => def.groups.length > 0);
}

const MODE_BY_SECTION: Partial<Record<ContextualSection, NavMode>> = {
  contacts: "work",
  agenda: "work",
  sales: "sales",
  mail: "spaces",
  kb: "spaces",
  vault: "spaces",
  assistant: "spaces",
  content: "spaces",
};

/** Modo dueño de la ruta: el destino más específico y, si no, la sección de la ruta; `null` en Ajustes, Perfil, etc. */
export function modeForPath(pathname: string): NavMode | null {
  const owners = new Map<string, NavMode>();
  for (const def of NAV_MODES) for (const group of def.groups) for (const item of group.items) owners.set(item.href, def.key);
  const best = activeNavHref(pathname, [...owners.keys()]);
  if (best) return owners.get(best) ?? null;
  const section = contextualSectionFor(pathname);
  return section ? (MODE_BY_SECTION[section] ?? null) : null;
}

export function parseMode(raw: string | null | undefined): NavMode | null {
  return NAV_MODES.some((def) => def.key === raw) ? (raw as NavMode) : null;
}

/** La ruta manda; si no tiene modo (Ajustes, Perfil), el guardado; si no hay, Trabajo. */
export function resolveMode(pathname: string, stored: string | null | undefined): NavMode {
  return modeForPath(pathname) ?? parseMode(stored) ?? "work";
}

export type ContextPanelKey = "mail" | "kb" | "vault" | "content";

/** Pantallas con lista propia en la segunda columna (el Asistente conserva su chrome propio). */
export function contextPanelFor(pathname: string): ContextPanelKey | null {
  const section = contextualSectionFor(pathname);
  return section === "mail" || section === "kb" || section === "vault" || section === "content" ? section : null;
}

/** Primera pantalla visible de un modo: a donde lleva hacer clic en el modo. */
export function modeHome(mode: NavModeDef): string | null {
  return mode.groups[0]?.items[0]?.href ?? null;
}
