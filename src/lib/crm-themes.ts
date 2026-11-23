export const DEFAULT_CRM_THEME_ID = "noxy-indigo" as const;

export type CrmThemeId =
  | "noxy-indigo"
  | "noxy-obsidian"
  | "noxy-discord"
  | "noxy-memory"
  | "noxy-lime"
  | "noxy-lavender"
  | "noxy-jasmine"
  | "noxy-silver"
  | "noxy-soft-indigo"
  | "noxy-monochrome"
  | "noxy-ocean"
  | "noxy-forest"
  | "noxy-sky"
  | "noxy-sand"
  | "noxy-sunset"
  | "noxy-coral"
  | "noxy-rose"
  | "noxy-slate";

export type CrmThemeTokens = {
  surfaceApp: string;
  surfaceSidebar: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textPlaceholder: string;
  navActive: string;
  navHover: string;
  borderSubtle: string;
  actionPrimary: string;
  actionPrimaryForeground: string;
  actionSecondary: string;
  focus: string;
  highlight: string;
};

export type CrmThemeDefinition = {
  id: CrmThemeId;
  label: string;
  description: string;
  isDark: false;
  swatches: readonly [string, string, string, string];
  tokens: CrmThemeTokens;
};

const OBSIDIAN = "#0B0B18";
const INDIGO = "#3545D6";
const DISCORD = "#5363EE";
const MEMORY = "#7F96F9";
const LIME = "#C8FE37";
const JASMINE = "#F5F6FB";
const LAVENDER = "#EBEDFA";
const WHITE = "#FFFFFF";
const SECONDARY_TEXT = "#555B6E";

export const CRM_THEMES: readonly CrmThemeDefinition[] = [
  {
    id: "noxy-indigo",
    label: "Noxy Índigo",
    description: "La identidad Noxy original, precisa y confiable.",
    isDark: false,
    swatches: [INDIGO, MEMORY, LAVENDER, JASMINE],
    tokens: {
      surfaceApp: JASMINE,
      surfaceSidebar: LAVENDER,
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#DDE3FE",
      navHover: "#F0F2FE",
      borderSubtle: "#DCDFE6",
      actionPrimary: INDIGO,
      actionPrimaryForeground: WHITE,
      actionSecondary: "#2C3ABA",
      focus: INDIGO,
      highlight: LIME,
    },
  },
  {
    id: "noxy-obsidian",
    label: "Obsidiana",
    description: "Fondo blanco y acciones negras de alto contraste.",
    isDark: false,
    swatches: [OBSIDIAN, WHITE, JASMINE, LAVENDER],
    tokens: {
      surfaceApp: WHITE,
      surfaceSidebar: JASMINE,
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: LAVENDER,
      navHover: JASMINE,
      borderSubtle: "#D9DCE5",
      actionPrimary: OBSIDIAN,
      actionPrimaryForeground: WHITE,
      actionSecondary: "#2B2B3D",
      focus: INDIGO,
      highlight: LIME,
    },
  },
  {
    id: "noxy-discord",
    label: "Discord",
    description: "Energía violeta equilibrada con superficies claras.",
    isDark: false,
    swatches: [DISCORD, INDIGO, MEMORY, JASMINE],
    tokens: {
      surfaceApp: "#F7F7FD",
      surfaceSidebar: "#EEEFFA",
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#E1E4FF",
      navHover: "#F1F2FF",
      borderSubtle: "#DCDFF0",
      actionPrimary: DISCORD,
      actionPrimaryForeground: WHITE,
      actionSecondary: INDIGO,
      focus: DISCORD,
      highlight: LIME,
    },
  },
  {
    id: "noxy-memory",
    label: "Recuerdo",
    description: "Azul luminoso con tipografía Obsidiana.",
    isDark: false,
    swatches: [MEMORY, INDIGO, WHITE, LAVENDER],
    tokens: {
      surfaceApp: "#F8F9FF",
      surfaceSidebar: "#EDF0FE",
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#DDE3FE",
      navHover: "#F0F2FE",
      borderSubtle: "#D9DFF2",
      actionPrimary: MEMORY,
      actionPrimaryForeground: OBSIDIAN,
      actionSecondary: "#6F86E8",
      focus: INDIGO,
      highlight: LIME,
    },
  },
  {
    id: "noxy-lime",
    label: "Lima",
    description: "Un acento fresco y directo sobre Jazmín.",
    isDark: false,
    swatches: [LIME, OBSIDIAN, JASMINE, LAVENDER],
    tokens: {
      surfaceApp: "#FAFCF4",
      surfaceSidebar: "#F1F5E8",
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#E8F9B8",
      navHover: "#F4F9E7",
      borderSubtle: "#DDE3D0",
      actionPrimary: LIME,
      actionPrimaryForeground: OBSIDIAN,
      actionSecondary: "#AEDD21",
      focus: INDIGO,
      highlight: LIME,
    },
  },
  {
    id: "noxy-lavender",
    label: "Lavanda",
    description: "Paneles suaves con profundidad visual serena.",
    isDark: false,
    swatches: [LAVENDER, INDIGO, MEMORY, WHITE],
    tokens: {
      surfaceApp: LAVENDER,
      surfaceSidebar: JASMINE,
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#D9DFFD",
      navHover: "#F0F2FE",
      borderSubtle: "#D3D7E8",
      actionPrimary: INDIGO,
      actionPrimaryForeground: WHITE,
      actionSecondary: DISCORD,
      focus: INDIGO,
      highlight: LIME,
    },
  },
  {
    id: "noxy-jasmine",
    label: "Jazmín",
    description: "Claridad cálida con acentos Discord.",
    isDark: false,
    swatches: [JASMINE, WHITE, DISCORD, LAVENDER],
    tokens: {
      surfaceApp: JASMINE,
      surfaceSidebar: WHITE,
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: LAVENDER,
      navHover: "#F0F1F8",
      borderSubtle: "#E0E2EA",
      actionPrimary: DISCORD,
      actionPrimaryForeground: WHITE,
      actionSecondary: INDIGO,
      focus: DISCORD,
      highlight: LIME,
    },
  },
  {
    id: "noxy-silver",
    label: "Plata",
    description: "Una lectura neutral para jornadas de alta concentración.",
    isDark: false,
    swatches: ["#9CA3B7", SECONDARY_TEXT, "#EFF0F4", WHITE],
    tokens: {
      surfaceApp: "#F6F7F9",
      surfaceSidebar: "#EFF0F4",
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#E1E4EA",
      navHover: "#F2F3F6",
      borderSubtle: "#D7DAE1",
      actionPrimary: SECONDARY_TEXT,
      actionPrimaryForeground: WHITE,
      actionSecondary: "#43495A",
      focus: INDIGO,
      highlight: LIME,
    },
  },
  {
    id: "noxy-soft-indigo",
    label: "Índigo suave",
    description: "Selecciones Azul Recuerdo con contraste contenido.",
    isDark: false,
    swatches: [INDIGO, "#DDE3FE", "#F0F2FE", WHITE],
    tokens: {
      surfaceApp: "#F9F9FD",
      surfaceSidebar: "#F0F2FE",
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#DDE3FE",
      navHover: "#EEF1FF",
      borderSubtle: "#DEE1EE",
      actionPrimary: INDIGO,
      actionPrimaryForeground: WHITE,
      actionSecondary: DISCORD,
      focus: INDIGO,
      highlight: LIME,
    },
  },
  {
    id: "noxy-monochrome",
    label: "Noxy monocromo",
    description: "Blanco, grises y Obsidiana sin distracciones.",
    isDark: false,
    swatches: [OBSIDIAN, SECONDARY_TEXT, "#E8E9ED", WHITE],
    tokens: {
      surfaceApp: "#F7F7F8",
      surfaceSidebar: "#EFEFF1",
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#E2E2E6",
      navHover: "#F1F1F3",
      borderSubtle: "#D8D8DE",
      actionPrimary: OBSIDIAN,
      actionPrimaryForeground: WHITE,
      actionSecondary: SECONDARY_TEXT,
      focus: INDIGO,
      highlight: LIME,
    },
  },
  {
    id: "noxy-ocean",
    label: "Océano",
    description: "Verde azulado sereno sobre superficies frías.",
    isDark: false,
    swatches: ["#0F766E", "#5EEAD4", "#E4F2F2", WHITE],
    tokens: {
      surfaceApp: "#F3FAFA",
      surfaceSidebar: "#E4F2F2",
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#CFE8E9",
      navHover: "#EAF5F5",
      borderSubtle: "#CFE0E1",
      actionPrimary: "#0F766E",
      actionPrimaryForeground: WHITE,
      actionSecondary: "#115E59",
      focus: "#0F766E",
      highlight: LIME,
    },
  },
  {
    id: "noxy-forest",
    label: "Bosque",
    description: "Verde natural con superficies suaves.",
    isDark: false,
    swatches: ["#2F7D3E", "#86EFAC", "#E7F1E8", WHITE],
    tokens: {
      surfaceApp: "#F5FAF5",
      surfaceSidebar: "#E7F1E8",
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#D3E8D6",
      navHover: "#EDF5EE",
      borderSubtle: "#D0DFD2",
      actionPrimary: "#2F7D3E",
      actionPrimaryForeground: WHITE,
      actionSecondary: "#276B35",
      focus: "#2F7D3E",
      highlight: LIME,
    },
  },
  {
    id: "noxy-sky",
    label: "Cielo",
    description: "Azul despejado, claro y directo.",
    isDark: false,
    swatches: ["#1D6FD8", "#93C5FD", "#E4EFFC", WHITE],
    tokens: {
      surfaceApp: "#F3F8FE",
      surfaceSidebar: "#E4EFFC",
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#CFE2F9",
      navHover: "#EBF3FD",
      borderSubtle: "#CFDDEE",
      actionPrimary: "#1D6FD8",
      actionPrimaryForeground: WHITE,
      actionSecondary: "#1659B0",
      focus: "#1D6FD8",
      highlight: LIME,
    },
  },
  {
    id: "noxy-sand",
    label: "Arena",
    description: "Tonos cálidos de papel y ámbar.",
    isDark: false,
    swatches: ["#8A5A12", "#E8C98A", "#F2EBDD", WHITE],
    tokens: {
      surfaceApp: "#FBF8F2",
      surfaceSidebar: "#F2EBDD",
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#E8DCC4",
      navHover: "#F6F0E4",
      borderSubtle: "#E0D5BF",
      actionPrimary: "#8A5A12",
      actionPrimaryForeground: WHITE,
      actionSecondary: "#6F480D",
      focus: "#8A5A12",
      highlight: LIME,
    },
  },
  {
    id: "noxy-sunset",
    label: "Atardecer",
    description: "Naranja cálido con superficies melocotón.",
    isDark: false,
    swatches: ["#B8470C", "#FDBA74", "#FBEBDF", WHITE],
    tokens: {
      surfaceApp: "#FEF8F3",
      surfaceSidebar: "#FBEBDF",
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#F7D9C2",
      navHover: "#FDF1E8",
      borderSubtle: "#EBD6C5",
      actionPrimary: "#B8470C",
      actionPrimaryForeground: WHITE,
      actionSecondary: "#9A3B09",
      focus: "#B8470C",
      highlight: LIME,
    },
  },
  {
    id: "noxy-coral",
    label: "Coral",
    description: "Rojo coral enérgico y cercano.",
    isDark: false,
    swatches: ["#BE3A34", "#FCA5A5", "#FBE8E8", WHITE],
    tokens: {
      surfaceApp: "#FEF6F6",
      surfaceSidebar: "#FBE8E8",
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#F6D3D3",
      navHover: "#FDEFEF",
      borderSubtle: "#EBD0D0",
      actionPrimary: "#BE3A34",
      actionPrimaryForeground: WHITE,
      actionSecondary: "#A22E29",
      focus: "#BE3A34",
      highlight: LIME,
    },
  },
  {
    id: "noxy-rose",
    label: "Rosa",
    description: "Magenta suave con superficies rosadas.",
    isDark: false,
    swatches: ["#B3306A", "#F9A8D4", "#FBE6EF", WHITE],
    tokens: {
      surfaceApp: "#FEF5F9",
      surfaceSidebar: "#FBE6EF",
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#F6D0E1",
      navHover: "#FDEDF4",
      borderSubtle: "#EACDDC",
      actionPrimary: "#B3306A",
      actionPrimaryForeground: WHITE,
      actionSecondary: "#962858",
      focus: "#B3306A",
      highlight: LIME,
    },
  },
  {
    id: "noxy-slate",
    label: "Pizarra",
    description: "Azul grisáceo sobrio para trabajar sin ruido.",
    isDark: false,
    swatches: ["#3D5A80", "#98B4D4", "#E8ECF1", WHITE],
    tokens: {
      surfaceApp: "#F5F7F9",
      surfaceSidebar: "#E8ECF1",
      surfaceElevated: WHITE,
      textPrimary: OBSIDIAN,
      textSecondary: SECONDARY_TEXT,
      textPlaceholder: SECONDARY_TEXT,
      navActive: "#D5DDE7",
      navHover: "#EEF1F5",
      borderSubtle: "#D3D9E1",
      actionPrimary: "#3D5A80",
      actionPrimaryForeground: WHITE,
      actionSecondary: "#2F4766",
      focus: "#3D5A80",
      highlight: LIME,
    },
  },
] as const;

const CRM_THEME_IDS = new Set<string>(CRM_THEMES.map(({ id }) => id));

export function isCrmThemeId(value: unknown): value is CrmThemeId {
  return typeof value === "string" && CRM_THEME_IDS.has(value);
}

export function resolveCrmTheme(value: unknown): CrmThemeDefinition {
  return CRM_THEMES.find(({ id }) => id === value) ?? CRM_THEMES[0];
}

type CrmThemeCssVariables = Record<`--${string}`, string>;

export function crmThemeCssVariables(theme: CrmThemeDefinition): CrmThemeCssVariables {
  const { tokens } = theme;
  return {
    "--color-background": tokens.surfaceApp,
    "--color-foreground": tokens.textPrimary,
    "--color-surface-app": tokens.surfaceApp,
    "--color-surface-sidebar": tokens.surfaceSidebar,
    "--color-surface-elevated": tokens.surfaceElevated,
    "--color-text-primary": tokens.textPrimary,
    "--color-text-secondary": tokens.textSecondary,
    "--color-text-secondary-strong": tokens.textSecondary,
    "--color-text-placeholder": tokens.textPlaceholder,
    "--color-nav-active": tokens.navActive,
    "--color-nav-hover": tokens.navHover,
    "--color-border-subtle": tokens.borderSubtle,
    "--color-action-primary": tokens.actionPrimary,
    "--color-action-primary-foreground": tokens.actionPrimaryForeground,
    "--color-action-secondary": tokens.actionSecondary,
    "--color-focus": tokens.focus,
    "--color-highlight": tokens.highlight,
    "--surface-app": tokens.surfaceApp,
    "--surface-sidebar": tokens.surfaceSidebar,
    "--surface-elevated": tokens.surfaceElevated,
    "--text-primary": tokens.textPrimary,
    "--text-secondary": tokens.textSecondary,
    "--text-secondary-strong": tokens.textSecondary,
    "--text-placeholder": tokens.textPlaceholder,
    "--nav-active": tokens.navActive,
    "--nav-hover": tokens.navHover,
    "--border-subtle": tokens.borderSubtle,
    "--action-primary": tokens.actionPrimary,
    "--action-primary-foreground": tokens.actionPrimaryForeground,
    "--action-secondary": tokens.actionSecondary,
    "--focus": tokens.focus,
    "--highlight": tokens.highlight,
    "--color-action-ink": actionInk(theme),
    "--color-action-ink-hover": actionInkHover(theme),
    "--action-ink": actionInk(theme),
    "--nav-active-ink": navActiveInk(theme),
  };
}

function relativeLuminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/g)?.map((part) => Number.parseInt(part, 16) / 255) ?? [];
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Color del destino activo en el marco claro (texto e icono sobre la pastilla `navActive`).
 * Usa la acción del tema cuando alcanza AA sobre la pastilla; si no (Azul Recuerdo, Lima),
 * vuelve al texto principal, como manda la regla de pares de DESIGN.md.
 */
export function navActiveInk(theme: CrmThemeDefinition): string {
  const { actionPrimary, navActive, textPrimary } = theme.tokens;
  return contrastRatio(actionPrimary, navActive) >= 4.5 ? actionPrimary : textPrimary;
}

function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Mezcla `from` hacia `to` (amount 0..1) en RGB. Oscurecer hacia Obsidiana conserva el matiz del color. */
function mixHex(from: string, to: string, amount: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/** Superficies sobre las que puede ir texto o un icono con color de acción. */
function inkSurfaces(theme: CrmThemeDefinition): string[] {
  const { surfaceApp, surfaceSidebar, surfaceElevated, navActive, navHover } = theme.tokens;
  return [surfaceApp, surfaceSidebar, surfaceElevated, navActive, navHover];
}

/**
 * Color de acción para TEXTO, enlaces e iconos (`text-action-ink`). El color de acción del tema sirve de fondo de botón
 * (con su texto encima) pero, como texto, puede ser ilegible: Lima sobre blanco da 1.2:1 y Azul Recuerdo 2.7:1.
 * Si el color de acción no llega a 4.5:1 en todas las superficies, se oscurece hacia el texto principal en pasos pequeños
 * hasta que llegue; así conserva su matiz y el tema sigue reconociéndose.
 */
export function actionInk(theme: CrmThemeDefinition): string {
  const { actionPrimary, textPrimary } = theme.tokens;
  const surfaces = inkSurfaces(theme);
  let ink = actionPrimary;
  for (let step = 0; step < 40 && !surfaces.every((surface) => contrastRatio(ink, surface) >= 4.5); step++) {
    ink = mixHex(ink, textPrimary, 0.06);
  }
  return ink;
}

/** Tinta de acción al pasar el puntero: un paso más oscura, nunca con menos contraste. */
export function actionInkHover(theme: CrmThemeDefinition): string {
  return mixHex(actionInk(theme), theme.tokens.textPrimary, 0.22);
}
