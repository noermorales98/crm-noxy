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
  | "noxy-monochrome";

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
