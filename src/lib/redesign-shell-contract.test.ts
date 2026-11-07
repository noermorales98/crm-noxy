import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Contrato del shell «marco claro» (spec rediseno-obsidiana-estructural: Behaviour «Navegación»,
// AC1-AC4 y criterios de navegación; plan §3 Shell; T005). El modelo de navegación (destinos,
// permisos, secciones contextuales, destino activo, pestañas) se prueba ejecutándolo en
// crm-navigation.test.ts; aquí solo va lo que vive en el JSX y el CSS del shell.
const projectRoot = new URL("../../", import.meta.url);
const raw = (path: string) => readFileSync(new URL(path, projectRoot), "utf8");
/** Fuente sin comentarios (JS y JSX). */
const code = (path: string) =>
  raw(path)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/**
 * Etiqueta JSX de apertura completa que contiene `marker`: desde su `<` hasta el `>` que la cierra,
 * saltando `>` dentro de llaves o comillas (p. ej. `[&>*]:` o `() =>`).
 */
function openingTag(src: string, marker: string): string {
  const at = src.indexOf(marker);
  if (at < 0) return "";
  assert.equal(src.indexOf(marker, at + 1), -1, `marker ${marker} must be unique`);
  // Inicio de la etiqueta: el último «<» seguido de una letra (etiqueta JSX), no uno dentro de un atributo.
  let start = at;
  while (start > 0 && !(src[start] === "<" && /[A-Za-z]/.test(src[start + 1] ?? ""))) start--;
  let depth = 0;
  let quote: string | null = null;
  for (let i = start + 1; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return src.slice(start, i + 1);
  }
  return "";
}

/** Etiqueta JSX de apertura que empieza en `start` (mismo análisis de llaves y comillas). */
function openingTagAt(src: string, start: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start + 1; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return src.slice(start, i + 1);
  }
  return "";
}

const SHELL = [
  "src/components/DashboardShell.tsx",
  "src/components/Sidebar.tsx",
  "src/components/Header.tsx",
  "src/components/MobileBottomTabBar.tsx",
  "src/components/AssistantSidebarShell.tsx",
  "src/components/MobileSidebarToggle.tsx",
] as const;

test("shell files carry no glass, lucide, hand-drawn icons, h-screen, sub-12px text or radii above 16px", () => {
  for (const file of SHELL) {
    const src = code(file);
    assert.doesNotMatch(src, /\bcrm-glass(?:-[\w-]+)?\b|backdrop-blur|backdrop-filter/, `${file}: glass`);
    assert.doesNotMatch(src, /from ["']lucide-react["']/, `${file}: one icon family (Hugeicons)`);
    assert.doesNotMatch(src, /<svg\b/, `${file}: hand-drawn SVG icon`);
    assert.doesNotMatch(src, /\bh-screen\b/, `${file}: h-screen jumps on iOS; use h-dvh / h-full`);
    assert.doesNotMatch(src, /\b(?:border|divide|ring)-border-subtle\b/, `${file}: use border-line (legacy overrides hide border-subtle)`);
    for (const [, value, unit] of src.matchAll(/text-\[(\d*\.?\d+)(px|rem)\]/g)) {
      const px = unit === "rem" ? Number(value) * 16 : Number(value);
      assert.ok(px >= 12, `${file}: text-[${value}${unit}] under 12px`);
    }
    assert.doesNotMatch(src, /\brounded(?:-[trblse]{1,2})?-(?:3xl|4xl)\b/, `${file}: radius above 16px`);
    for (const [, value, unit] of src.matchAll(/rounded(?:-[trblse]{1,2})?-\[(\d*\.?\d+)(px|rem)\]/g)) {
      const px = unit === "rem" ? Number(value) * 16 : Number(value);
      assert.ok(px <= 16, `${file}: rounded-[${value}${unit}] above 16px`);
    }
  }
});

test("the shell is an L-frame: the themed root is the light frame and the content sheet sits inside", () => {
  const shell = code("src/components/DashboardShell.tsx");
  const root = openingTag(shell, "data-crm-theme={themeId}");
  assert.ok(root, "themed root element");
  assert.match(root, /\bbg-surface-sidebar\b/, "frame background on the themed root");
  assert.doesNotMatch(root, /\bbg-surface-app\b/, "the root is the frame, not the sheet");
  assert.match(root, /\bh-dvh\b/, "full dynamic viewport height");
  assert.match(root, /\bstyle=\{/, "the themed root receives the theme variables");
  assert.match(shell, /crmThemeCssVariables\(theme\)/, "themes still apply to the shell");
  const sheet = openingTag(shell, "data-crm-sheet");
  assert.ok(sheet, "content sheet is marked with data-crm-sheet");
  for (const cls of ["bg-surface-app", "lg:rounded-tl-surface", "lg:border-l", "lg:border-t", "border-line"]) {
    assert.match(sheet, new RegExp(`(?:^|[\\s"'\`])${cls.replace(/[[\]:.]/g, "\\$&")}(?=[\\s"'\`])`), `sheet has ${cls}`);
  }
});

const sidebar = code("src/components/Sidebar.tsx");

test("the sidebar renders the shared navigation model, not a section switcher", () => {
  assert.match(sidebar, /from ["']@\/src\/lib\/crm-navigation["']/, "uses the navigation model");
  for (const fn of ["visibleNavGroups(", "sidebarView(", "activeNavHref("]) {
    assert.ok(sidebar.includes(fn), `calls ${fn.slice(0, -1)}`);
  }
  assert.doesNotMatch(sidebar, /role="listbox"|aria-haspopup="listbox"/, "no section dropdown");
  assert.doesNotMatch(sidebar, /SectionSwitcher|const SECTIONS\b/, "switcher and its section list are gone");
});

test("the unread-mail counter survives on the Correo destination", () => {
  assert.match(sidebar, /["']unread-mail["'][\s\S]{0,240}unreadEmailCount|unreadEmailCount[\s\S]{0,240}["']unread-mail["']/);
});

test("«Volver» is a button that brings the flat list back", () => {
  const button = openingTag(sidebar, "data-nav-back");
  assert.ok(button.startsWith("<button"), "«Volver» is a <button> marked data-nav-back");
  assert.match(button, /\bonClick=\{/, "it has a click handler (behaviour: sidebarView in crm-navigation.test.ts)");
  const pathVar = sidebar.match(/const\s+(\w+)\s*=\s*usePathname\(\)/)?.[1];
  assert.ok(pathVar, "Sidebar reads the current route");
  assert.match(sidebar, new RegExp(`\\bset\\w*\\(\\s*${pathVar}\\s*\\)`), "«Volver» records the route it was pressed on");
  // Volver a pulsar un destino (p. ej. «Correo» estando en /emails) reabre su submenú.
  assert.match(sidebar, /\bset\w*\(\s*null\s*\)/, "choosing a destination clears the «Volver» dismissal");
  assert.match(sidebar, /data-nav-back[^]*?>\s*(?:<[^>]+>\s*)*Volver\s*</, "visible label «Volver»");
  for (const nav of ["MailNav", "KbNav", "VaultNav", "AssistantNav", "ContentNav"]) {
    assert.match(sidebar, new RegExp(`<${nav}\\b`), `${nav} still rendered`);
  }
});

test("the active destination uses the theme ink from the model, with aria-current", () => {
  assert.match(raw("app/globals.css"), /--nav-active-ink:\s*#3545D6/i, ":root default ink (Noxy Índigo)");
  assert.match(sidebar, /\bNAV_ITEM_ACTIVE\b/, "active class comes from the model (tested there)");
  // La tinta llega al icono por currentColor: ningún icono de navegación lleva un color fijo.
  assert.doesNotMatch(sidebar, /\bICON_COLOR\b/, "no hard-coded icon colour constant");
  assert.doesNotMatch(sidebar, /<HugeiconsIcon\b[^>]*\bcolor=\{?["'#]/, "icons inherit currentColor");
  assert.match(sidebar, /aria-current=\{[^}]*["']page["']/);
});

test("the mobile tab bar: fixed tabs from the model, solid full-width bar, «Más» opens the panel", () => {
  const bar = code("src/components/MobileBottomTabBar.tsx");
  assert.match(bar, /from ["']@\/src\/lib\/crm-navigation["']/);
  assert.ok(bar.includes("visibleMobileTabs("), "tabs come from the model");
  assert.doesNotMatch(bar, /Editar barra|localStorage|sessionStorage/, "per-user customisation retired");
  const nav = openingTag(bar, 'aria-label="Navegación principal"');
  for (const cls of ["fixed", "inset-x-0", "bottom-0", "lg:hidden"]) {
    assert.match(nav, new RegExp(`(?:^|[\\s"'\`])${cls.replace(/[:.]/g, "\\$&")}(?=[\\s"'\`])`), `bar has ${cls}`);
  }
  // Fondo sólido y borde superior: en la propia barra o en su primer contenedor.
  // La propia etiqueta <nav> o su primer elemento hijo, no una ventana de texto arbitraria.
  const afterNav = bar.slice(bar.indexOf(nav) + nav.length);
  const firstChildAt = afterNav.search(/<[A-Za-z]/);
  const firstChild = firstChildAt >= 0 ? openingTagAt(afterNav, firstChildAt) : "";
  const surface = `${nav} ${firstChild}`;
  assert.match(surface, /\bbg-surface-sidebar\b/, "solid frame colour");
  assert.match(surface, /\bborder-t\b/, "top border");
  assert.ok(bar.includes("activeMobileTab("), "active tab comes from the model");
  assert.match(bar, /\bMOBILE_TAB_ACTIVE\b/, "active tab style comes from the model");
  assert.match(bar, />\s*Más\s*</);
  assert.match(bar, /openMobileSidebar\b/, "«Más» opens the navigation panel");
  assert.match(bar, /aria-current=/);
});

test("the mobile navigation panel stays keyboard-operable and the toggle is a 44px target", () => {
  const shell = code("src/components/AssistantSidebarShell.tsx");
  assert.match(shell, /["']Escape["']/, "Escape closes the panel");
  assert.match(shell, /["']Tab["']/, "focus stays inside the panel");
  assert.match(shell, /aria-modal=/);
  assert.match(shell, /registerOpenMobileSidebar\(/, "«Más» and the toggle can open it");
  const toggle = code("src/components/MobileSidebarToggle.tsx");
  assert.match(toggle, /\bsize-11\b|\bmin-h-11\b[\s\S]*\bmin-w-11\b/, "44px toggle");
});
