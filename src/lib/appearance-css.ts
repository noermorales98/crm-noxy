// CSS de la apariencia sobre un tema: modo oscuro (fijo o según el dispositivo), bordes y radios. Puro.
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { crmThemeCssVariables, darkTheme, type CrmThemeDefinition } from "./crm-themes.ts";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { radiusVars, type Appearance, type BorderStyle } from "./appearance.ts";

type Vars = Record<`--${string}`, string>;

function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}
const mix = (a: string, b: string, t: number): string => `#${hexToRgb(a).map((v, i) => Math.round(v + (hexToRgb(b)[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;

/** Color de bordes y separadores según el estilo: normal, casi invisibles (se funden con la tarjeta) o ninguno. */
export function borderVars(theme: CrmThemeDefinition, style: BorderStyle): Vars {
  const { borderSubtle, surfaceElevated } = theme.tokens;
  const color = style === "none" ? "transparent" : style === "soft" ? mix(borderSubtle, surfaceElevated, 0.6) : borderSubtle;
  return { "--color-border-subtle": color, "--border-subtle": color, "--color-control": style === "none" ? "transparent" : style === "soft" ? mix(borderSubtle, surfaceElevated, 0.4) : mix(borderSubtle, theme.isDark ? "#FFFFFF" : "#8A90A6", 0.25) };
}

/** Estados (peligro, éxito, aviso) en oscuro: texto claro sobre fondo traslúcido en vez de pastel claro. */
const DARK_STATUS: Vars = {
  "--color-danger": "#FF9A8C",
  "--color-danger-soft": "rgba(255,154,140,0.14)",
  "--color-success": "#4ADE9A",
  "--color-success-soft": "rgba(74,222,154,0.14)",
  "--color-warning": "#F5B461",
  "--color-warning-soft": "rgba(245,180,97,0.14)",
  "--danger": "#FF9A8C",
  "--danger-soft": "rgba(255,154,140,0.14)",
  "--success": "#4ADE9A",
  "--success-soft": "rgba(74,222,154,0.14)",
};

/** Variables completas de una variante (tema + estados si es oscura + bordes). */
export function themeVarsFor(theme: CrmThemeDefinition, appearance: Appearance): Vars {
  return { ...crmThemeCssVariables(theme), ...(theme.isDark ? DARK_STATUS : {}), ...borderVars(theme, appearance.borders) };
}

/** Lo que la apariencia suma a las variables del tema: estados en oscuro, bordes y radios. */
export function appearanceVars(theme: CrmThemeDefinition, appearance: Appearance): Vars {
  return { ...(theme.isDark ? DARK_STATUS : {}), ...borderVars(theme, appearance.borders), ...radiusVars(appearance.radius) };
}

/** Variables que van en línea en el marco: las de la variante elegida (en automático, la clara; el CSS cambia a oscuro si el dispositivo lo pide). */
export function frameVars(base: CrmThemeDefinition, appearance: Appearance): Vars {
  const active = appearance.mode === "dark" ? darkTheme(base) : base;
  return { ...crmThemeCssVariables(active), ...appearanceVars(active, appearance) };
}

const FAMILIES: Record<string, [number, number, number]> = {
  green: [34, 197, 94], emerald: [16, 185, 129], teal: [20, 184, 166], cyan: [6, 182, 212], sky: [14, 165, 233], blue: [59, 130, 246],
  indigo: [99, 102, 241], violet: [139, 92, 246], purple: [168, 85, 247], fuchsia: [217, 70, 239], pink: [236, 72, 153], rose: [244, 63, 94],
  red: [239, 68, 68], orange: [249, 115, 22], amber: [245, 158, 11], yellow: [234, 179, 8], lime: [132, 204, 22],
};
const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/**
 * Colores que el código tiene escritos a mano (`bg-white`, grises y pasteles de Tailwind) llevados al modo oscuro, para que
 * ninguna pieza quede clara sobre un fondo oscuro. Fondos pastel → el mismo matiz, traslúcido; textos de matiz → más claros.
 */
export function darkPaletteOverrides(scope: string): string {
  const rules: string[] = [
    `${scope} :is(.bg-white,.focus\\:bg-white:focus,.hover\\:bg-white:hover,.bg-\\[\\#ffffff\\],.bg-\\[\\#FFFFFF\\],.bg-\\[\\#fafafa\\]){background-color:var(--color-surface-elevated)}`,
    `${scope} :is(.bg-gray-50,.bg-slate-50,.bg-zinc-50,.bg-neutral-50,.hover\\:bg-gray-50:hover){background-color:var(--color-nav-hover)}`,
    `${scope} :is(.bg-gray-100,.bg-gray-200,.bg-slate-100,.bg-slate-200,.bg-zinc-100,.hover\\:bg-gray-100:hover){background-color:var(--color-nav-active)}`,
    // Fondos con hex escrito a mano (marca y neutros claros) → el token que les corresponde.
    `${scope} :is(.bg-\\[\\#F5F6FB\\],.bg-\\[\\#f7f6f3\\],.bg-\\[\\#EEF1F7\\]){background-color:var(--color-surface-app)}`,
    `${scope} :is(.bg-\\[\\#EBEDFA\\],.bg-\\[\\#F5F3FF\\],.bg-\\[\\#F0F2FE\\]){background-color:var(--color-surface-sidebar)}`,
    `${scope} .bg-\\[\\#DDE3FE\\]{background-color:var(--color-nav-active)}`,
    `${scope} :is(.text-gray-900,.text-gray-800,.text-black,.text-slate-900,.text-\\[\\#0B0B18\\]){color:var(--color-text-primary)}`,
    `${scope} :is(.text-gray-700,.text-gray-600,.text-gray-500,.text-gray-400,.text-slate-600,.text-slate-500,.text-\\[\\#6B7184\\]){color:var(--color-text-secondary)}`,
    `${scope} :is(.text-\\[\\#3545D6\\],.text-\\[\\#5363EE\\]){color:var(--color-action-ink)}`,
    `${scope} :is(.border-gray-100,.border-gray-200,.border-gray-300,.border-slate-200,.border-\\[\\#DCDFE6\\],.border-\\[\\#EDE9FE\\]){border-color:var(--color-border-subtle)}`,
    `${scope} :is(.divide-gray-100,.divide-gray-200)>:not([hidden])~:not([hidden]){border-color:var(--color-border-subtle)}`,
    // Iconos con color oscuro fijo (atributo `color` de Hugeicons) y el isotipo azul de Noxy, que pasa a blanco.
    `${scope} :is(svg[color="#0B0B18"],svg[color="#0b0b18"],svg[color="#000000"],svg[color="#000"],svg[color="black"]){color:var(--color-text-primary)}`,
    `${scope} :is(svg[color="#6B7184"],svg[color="#6B7280"],svg[color="#555B6E"]){color:var(--color-text-secondary)}`,
    `${scope} img[src$="Isotipo_Azul.svg"]{filter:brightness(0) invert(1)}`,
    // Colores escritos en línea (`style="color:#0B0B18"`, fondos blancos): ganan a las clases, así que se corrigen con !important.
    `${scope} :is([style^="color:#0B0B18" i],[style*=";color:#0B0B18" i]){color:var(--color-text-primary) !important}`,
    `${scope} :is([style^="color:#6B7184" i],[style*=";color:#6B7184" i],[style^="color:#6B7280" i],[style*=";color:#6B7280" i]){color:var(--color-text-secondary) !important}`,
    `${scope} :is([style*="background:#ffffff" i],[style*="background-color:#ffffff" i],[style*="background:#fff;" i]){background-color:var(--color-surface-elevated) !important}`,
    `${scope} :is([style*="background:#F5F6FB" i],[style*="background-color:#F5F6FB" i]){background-color:var(--color-surface-app) !important}`,
  ];
  for (const [name, rgb] of Object.entries(FAMILIES)) {
    const soft = `rgba(${rgb.join(",")},0.16)`;
    const text = toHex(rgb.map((v) => v + (255 - v) * 0.5));
    rules.push(`${scope} :is(.bg-${name}-50,.bg-${name}-100,.bg-${name}-200,.hover\\:bg-${name}-50:hover){background-color:${soft}}`);
    rules.push(`${scope} :is(.text-${name}-500,.text-${name}-600,.text-${name}-700,.text-${name}-800){color:${text}}`);
    rules.push(`${scope} :is(.border-${name}-100,.border-${name}-200){border-color:rgba(${rgb.join(",")},0.3)}`);
  }
  return rules.join("\n");
}

const decls = (vars: Vars, important: boolean) => Object.entries(vars).map(([k, v]) => `${k}:${v}${important ? " !important" : ""}`).join(";");

/**
 * Hoja de estilos del marco para esta apariencia:
 * - oscuro fijo: ajustes de colores escritos a mano y `color-scheme: dark`;
 * - automático: lo mismo dentro de `prefers-color-scheme: dark`, con las variables del tema oscuro (con !important porque las
 *   de la variante clara van en línea);
 * - sin bordes: una sombra ligera en tarjetas y paneles para que sigan separados del fondo.
 */
export function appearanceStyleSheet(base: CrmThemeDefinition, appearance: Appearance): string {
  const parts: string[] = [];
  const frame = ".noxy-product-frame";
  // Fuera del marco (menús, Spotlight, el flotante de IA) lo oscuro lo marca `data-crm-scheme` en la raíz, que pone el marco ya resuelto
  // (en automático, según el dispositivo). Así los ajustes de colores escritos a mano también llegan allí.
  if (appearance.mode !== "light") parts.push(darkPaletteOverrides('html[data-crm-scheme="dark"]'));
  if (appearance.mode === "dark") {
    parts.push(`${frame}[data-appearance="dark"]{color-scheme:dark}`, darkPaletteOverrides(`${frame}[data-appearance="dark"]`));
  } else if (appearance.mode === "auto") {
    const dark = darkTheme(base);
    const scope = `${frame}[data-appearance="auto"]`;
    parts.push(`@media (prefers-color-scheme: dark){${scope}{color-scheme:dark;${decls(themeVarsFor(dark, appearance), true)}}\n${darkPaletteOverrides(scope)}}`);
  }
  // Las esquinas escritas a mano (`rounded-lg`, `rounded-xl`…) siguen el radio elegido; se activa con `data-crm-radius` en la raíz
  // (la pone el marco mientras está abierto), así también llega al Spotlight y a los menús que se pintan fuera del marco.
  if (appearance.radius !== "normal") {
    parts.push(
      `html[data-crm-radius] :is(.rounded-md,.rounded-lg){border-radius:var(--radius-control)}`,
      `html[data-crm-radius] :is(.rounded-xl,.rounded-2xl,.rounded-3xl){border-radius:var(--radius-surface)}`,
    );
  }
  if (appearance.borders === "none") {
    const shadow = appearance.mode === "dark" ? "0 1px 2px rgba(0,0,0,.5)" : "0 1px 2px rgba(11,11,24,.08), 0 0 0 1px rgba(11,11,24,.02)";
    parts.push(`${frame}[data-borders="none"] :is(.rounded-surface,.crm-floating-menu){box-shadow:${shadow}}`);
  }
  return parts.join("\n");
}
