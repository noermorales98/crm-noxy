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
  "src/components/NotificationsMenu.tsx",
  "src/components/PageBar.tsx",
  "src/components/PageControls.tsx",
  "src/components/MobileBottomTabBar.tsx",
  "src/components/MobileTopBar.tsx",
  "src/components/MobileMoreSheet.tsx",
  "src/components/MobileSidebarToggle.tsx",
] as const;

test("shell files carry no glass, lucide, hand-drawn icons, h-screen, sub-12px text or radii above 16px", () => {
  for (const file of SHELL) {
    const src = code(file);
    // Excepción pedida por el dueño (2026-11-08): la cápsula inferior móvil es de cristal translúcido.
    const glassAllowed = file === "src/components/MobileBottomTabBar.tsx";
    if (!glassAllowed) assert.doesNotMatch(src, /\bcrm-glass(?:-[\w-]+)?\b|backdrop-blur|backdrop-filter/, `${file}: glass`);
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
  assert.doesNotMatch(sheet, /rounded-tl/, "the sheet meets the frame with a straight corner");
  for (const cls of ["bg-surface-app", "lg:border-l", "lg:border-t", "border-line"]) {
    assert.match(sheet, new RegExp(`(?:^|[\\s"'\`])${cls.replace(/[[\]:.]/g, "\\$&")}(?=[\\s"'\`])`), `sheet has ${cls}`);
  }
});

const sidebar = code("src/components/Sidebar.tsx");
const sidebarParts = code("src/components/sidebar-parts.tsx");
const contextContent = code("src/components/ContextContent.tsx");

// Ronda 3 (2026-11-07): la sidebar es un selector de 3 modos con una lista plana, sin ramas que se
// desplieguen. Las listas propias de Correo, Docs, Bóveda y Contenido van en una segunda columna.
test("the sidebar renders the mode model: three tabs and a flat list, no tree branches", () => {
  assert.match(sidebar, /from ["']@\/src\/lib\/crm-navigation["']/, "uses the navigation model");
  for (const fn of ["visibleModes(", "resolveMode(", "activeNavHref("]) {
    assert.ok(sidebar.includes(fn), `calls ${fn.slice(0, -1)}`);
  }
  assert.match(sidebar, /role="tablist"/, "the modes are a tablist");
  assert.match(sidebar, /role="tab"/);
  assert.match(sidebar, /aria-selected=\{/);
  assert.match(sidebar, /\bMODE_STORAGE_KEY\b/, "the chosen mode is remembered");
  assert.doesNotMatch(sidebar, /data-tree-parent|aria-expanded=\{open\}|inert=\{!open\}|SIDEBAR_OPEN_STORAGE_KEY|branchForPath|initialOpenBranches/, "no inline branches");
  assert.doesNotMatch(sidebar, /role="listbox"|aria-haspopup="listbox"|SectionSwitcher/, "no dropdown switcher");
  assert.doesNotMatch(sidebar, /data-nav-back|>\s*Volver\s*</, "no «Volver» panel");
});

test("the sidebar header carries search and notifications; there is no top bar to host them", () => {
  assert.match(sidebar, /openSearch/, "⌘K search opens from the sidebar");
  assert.match(sidebar, /<NotificationsMenu\b/, "the bell lives in the sidebar");
  assert.match(sidebar, /<AccountMenu\b/, "the account stays at the bottom");
  assert.match(sidebar, /SIDEBAR_COLLAPSED_STORAGE_KEY/, "the icon rail is remembered");
  assert.match(sidebar, /isCollapseShortcut\(/, "⌘B folds the sidebar");
});

// Ronda 3: no hay barra superior global. Los controles de cada página (orden, filtros, botón principal,
// acciones, volver) viven en su PageHeader; las páginas sin PageHeader los llevan en una fila de la hoja.
test("there is no global top bar: controls live in PageHeader or in the sheet's own page bar", () => {
  const shell = code("src/components/DashboardShell.tsx");
  assert.doesNotMatch(shell, /<Header\b|components\/Header["']/, "the shell no longer renders a top Header");
  assert.throws(() => raw("src/components/Header.tsx"), "Header.tsx is gone");
  const sheet = openingTag(shell, "data-crm-sheet");
  assert.match(sheet, /\bpt-\[calc\(3\.5rem\+env\(safe-area-inset-top\)\)\]/, "mobile: the sheet clears the fixed top bar and the safe area");
  assert.match(sheet, /\blg:pt-0\b/, "desktop: no top bar");
  assert.match(shell, /<PageBar\b/, "pages without PageHeader keep their title and controls in a row of the sheet");
  const controls = code("src/components/PageControls.tsx");
  for (const piece of ["sortOptions", "filterGroups", "addButton", "actions", "backHref"]) {
    assert.match(`${controls}${code("src/components/PageBar.tsx")}`, new RegExp(piece), `controls cover ${piece}`);
  }
  assert.match(code("src/components/ui/PageHeader.tsx"), /<PageControls\b/, "PageHeader renders the page controls");
  assert.match(code("src/components/PageBar.tsx"), /<h1\b/, "pages without PageHeader keep an h1");
  assert.match(code("src/components/PageBar.tsx"), /pageHeader/, "the bar yields to PageHeader (one h1 per page)");
});

test("the unread-mail counter survives on the Correo destination", () => {
  assert.match(sidebar, /["']unread-mail["'][\s\S]{0,240}unreadEmailCount|unreadEmailCount[\s\S]{0,240}["']unread-mail["']/);
});

test("the context lists (Correo, Docs, Boveda, Contenido) live inside the same sidebar: no second column", () => {
  for (const nav of ["MailNav", "KbSidebarTree", "VaultNav"]) {
    assert.match(contextContent, new RegExp(`<${nav}\\b`), `${nav} rendered by the context list`);
  }
  assert.match(sidebar, /contextPanelFor\(/, "which list shows comes from the model");
  assert.match(sidebar, /<ContextContent\b/, "the sidebar renders the list under the mode list");
  assert.match(sidebar, /<AssistantNav\b/, "the assistant keeps its own conversations list");
  const shell = code("src/components/DashboardShell.tsx");
  assert.doesNotMatch(shell, /ContextPanel/, "the shell has no second column");
  assert.throws(() => raw("src/components/ContextPanel.tsx"), "ContextPanel.tsx is gone");
});

test("a context list opens right under the item that owns it, not at the end of the sidebar", () => {
  assert.match(sidebar, /ownsSection\(item\.href\)/, "the list is tied to its owner item");
  const ownerAt = sidebar.indexOf("ownsSection(item.href)");
  const rowAt = sidebar.lastIndexOf("itemRow(item)", ownerAt);
  assert.ok(rowAt > -1 && ownerAt - rowAt < 400, "rendered right after the owner's row, inside the group loop");
  assert.doesNotMatch(sidebar, /<\/nav>[\s\S]{0,0}lowerSection/, "no trailing list after the groups");
});

test("the docked sidebar has a right border and Docs actions sit on the Docs row", () => {
  assert.match(sidebar, /border-r border-line/, "right border on the docked sidebar");
  assert.match(sidebar, /<KbRootActions\b/, "new page / new folder live on the Docs row");
});

test("Ajustes and Perfil have their own sidebar and the main one does not render there", () => {
  assert.match(sidebar, /isSettingsRoute\(pathname\)\s*\?\s*<SettingsSidebar\b[\s\S]*?:\s*<MainSidebar\b/, "the entry component swaps sidebars");
  const settings = code("src/components/SettingsSidebar.tsx");
  assert.match(settings, /visibleSettingsItems\(/, "sections come from the model");
  assert.match(settings, /Volver al CRM/, "a way back to the CRM");
  assert.match(settings, /<AccountMenu\b/, "the account stays at the bottom");
});

test("the three modes are circular icon buttons with no visible text; Ajustes lives in the account menu", () => {
  const tabs = sidebar.slice(sidebar.indexOf('role="tablist"'));
  assert.match(tabs, /rounded-full/, "circular");
  assert.match(tabs, /aria-label=\{mode\.label\}/, "named for assistive tech");
  assert.doesNotMatch(sidebar, /<span className="truncate">\{mode\.label\}<\/span>/, "no visible mode text");
  assert.doesNotMatch(sidebar, /aria-label="Ajustes"/, "no Ajustes row in the sidebar");
  assert.match(raw("src/components/AccountMenu.tsx"), /href="\/settings"/, "Ajustes is in the account menu");
});

test("the active destination uses the theme ink from the model, with aria-current", () => {
  assert.match(raw("app/globals.css"), /--nav-active-ink:\s*#3545D6/i, ":root default ink (Noxy Índigo)");
  assert.match(sidebarParts, /\bNAV_ITEM_ACTIVE\b/, "active class comes from the model (tested there)");
  // La tinta llega al icono por currentColor: ningún icono de navegación lleva un color fijo.
  assert.doesNotMatch(`${sidebar}${sidebarParts}`, /\bICON_COLOR\b/, "no hard-coded icon colour constant");
  assert.doesNotMatch(`${sidebar}${sidebarParts}`, /<HugeiconsIcon\b[^>]*\bcolor=\{?["'#]/, "icons inherit currentColor");
  assert.match(`${sidebar}${sidebarParts}`, /aria-current=\{[^}]*["']page["']/);
});

test("the mobile bottom bar is a floating glass capsule: tabs from the model, «Más» opens the bottom sheet", () => {
  const bar = code("src/components/MobileBottomTabBar.tsx");
  assert.match(bar, /from ["']@\/src\/lib\/crm-navigation["']/);
  assert.ok(bar.includes("useMobileTabs("), "tabs come from the customizable hook (Inicio and Más fixed)");
  assert.doesNotMatch(bar, /localStorage|sessionStorage/, "storage lives in the hook, not in the bar");
  const nav = openingTag(bar, 'aria-label="Navegación principal"');
  for (const cls of ["fixed", "inset-x-0", "bottom-0", "lg:hidden"]) {
    assert.match(nav, new RegExp(`(?:^|[\\s"'\`])${cls.replace(/[:.]/g, "\\$&")}(?=[\\s"'\`])`), `bar has ${cls}`);
  }
  assert.match(bar, /rounded-full/, "capsule");
  assert.match(bar, /backdrop-blur/, "translucent glass");
  assert.ok(bar.includes("activeMobileTab("), "active tab comes from the model");
  assert.match(bar, />\s*Más\s*</);
  assert.match(bar, /openMobileSidebar\b/, "«Más» opens the sheet");
  assert.match(bar, /aria-current=/);
});

test("mobile: Settings has a section picker, the system bars take the navbar colour, and the sheet always leaves room for the bottom bar", () => {
  const shell = code("src/components/DashboardShell.tsx");
  assert.match(shell, /<SettingsMobileNav\b/, "Ajustes can reach every section on mobile");
  assert.match(code("src/components/SettingsMobileNav.tsx"), /lg:hidden/, "desktop uses the settings sidebar");
  assert.match(shell, /meta\[name="theme-color"\]/, "the browser/system bar colour follows the navbar");
  assert.match(raw("app/layout.tsx"), /themeColor:\s*"#EBEDFA"/i, "initial theme colour is the navbar colour, not the brand blue");
  // El espacio inferior va al final del scroll (no en una banda fija de la hoja, que se vería como un cuadro detrás de la cápsula).
  assert.doesNotMatch(shell, /pb-\[calc\(5\.75rem/, "no fixed band on the sheet");
  assert.match(raw("app/globals.css"), /\.crm-mobile-bottom-clearance\s*\{[^}]*padding-bottom:\s*calc\(6rem/, "scroll areas end with room for the capsule");
  assert.match(shell, /documentElement/, "html/body take the navbar colour behind the OS bottom bar");
});

test("the mobile chrome: fixed top bar, and «Más» is a bottom sheet that does not reuse the desktop sidebar", () => {
  const top = code("src/components/MobileTopBar.tsx");
  assert.match(top, /fixed inset-x-0 top-0/, "fixed top bar");
  assert.match(top, /lg:hidden/, "desktop has no top bar");
  assert.match(top, /sectionTitleFor\(/, "names the current screen");
  const sheet = code("src/components/MobileMoreSheet.tsx");
  assert.match(sheet, /role="dialog"/);
  assert.match(sheet, /aria-modal=/);
  assert.match(sheet, /useDialog\(/, "Escape and focus trap");
  assert.match(sheet, /registerOpenMobileSidebar\(/, "the bar and the menu button can open it");
  assert.match(sheet, /items-end/, "rises from the bottom");
  assert.match(sheet, /Personalizar barra/, "the bar can be customised from the sheet");
  assert.match(sheet, /useMobileTabs\(/);
  assert.match(sheet, /aria-pressed=/, "picking a section is a toggle");
  assert.doesNotMatch(sheet, /<Sidebar\b|from ["']@\/src\/components\/Sidebar["']/, "not the desktop sidebar");
  const shell = code("src/components/DashboardShell.tsx");
  for (const piece of ["<MobileTopBar", "<MobileMoreSheet", "<MobileBottomTabBar"]) assert.ok(shell.includes(piece), `${piece} rendered`);
  const toggle = code("src/components/MobileSidebarToggle.tsx");
  assert.match(toggle, /\bsize-11\b|\bmin-h-11\b[\s\S]*\bmin-w-11\b/, "44px toggle");
});
