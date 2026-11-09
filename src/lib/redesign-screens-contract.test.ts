import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

// Contrato de las 7 pantallas del rediseño (spec rediseno-obsidiana-estructural: AC3, AC7, AC8;
// plan T007). Cada pantalla compone las piezas comunes; su carga de datos no cambia.
// Colores: DESIGN.md manda conservar los de datos, categorías, semántica y los guardados por el
// usuario, así que solo se prohíben los neutros crudos (deben ser tokens de superficie/texto).
const projectRoot = new URL("../../", import.meta.url);
const source = (path: string) => {
  const url = new URL(path, projectRoot);
  if (!existsSync(url)) return "";
  return readFileSync(url, "utf8")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
};

/** Etiqueta JSX de apertura que empieza en `start` (salta `>` dentro de llaves y comillas). */
function tagAt(src: string, start: number): string {
  let depth = 0;
  let quote: string | null = null;
  let i = start + 1;
  while (i < src.length && /[\w.]/.test(src[i])) i++; // nombre del componente
  if (src[i] === "<") {
    // Argumento de tipo genérico (`<DataTable<Row>`): saltarlo con su anidamiento.
    let angle = 0;
    for (; i < src.length; i++) {
      if (src[i] === "<") angle++;
      else if (src[i] === ">" && --angle === 0) {
        i++;
        break;
      }
    }
  }
  for (; i < src.length; i++) {
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
const tags = (src: string, name: string) =>
  [...src.matchAll(new RegExp(`<${name}\\b`, "g"))].map((m) => tagAt(src, m.index ?? 0));
/** Literales de texto: cada tipo de comilla por separado; en plantillas, `${…}` se sustituye por un espacio. */
const literals = (src: string) => [
  ...[...src.matchAll(/"([^"\n]*)"/g)].map((m) => m[1]),
  ...[...src.matchAll(/'([^'\n]*)'/g)].map((m) => m[1]),
  ...[...src.matchAll(/`([^`]*)`/g)].map((m) => m[1].replace(/\$\{[^}]*\}/g, " ")),
];

type Screen = {
  /** Archivos con su propio PageHeader (páginas y subpáginas de la pantalla). */
  pages: string[];
  /** Todos los archivos que se recomponen. */
  files: string[];
  /** La pantalla es un tablero (pipeline) en vez de una lista. */
  board?: boolean;
  /**
   * Ronda 2: «pass» = pasada de lenguaje en editores y detalles grandes (no se exige DataList ni
   * Board; el resto de reglas sí). Por defecto, «recompose».
   */
  level?: "recompose" | "pass";
};

const SCREENS: Record<string, Screen> = {
  dashboard: {
    pages: ["src/components/dashboard/DashboardCustomizer.tsx"],
    files: [
      "app/page.tsx",
      "src/components/dashboard/DashboardCustomizer.tsx",
      "src/components/dashboard/DashboardGrid.tsx",
      "src/components/dashboard/WidgetCard.tsx",
      "src/components/dashboard/KpiWidget.tsx",
      "src/components/dashboard/WidgetPicker.tsx",
      "src/lib/dashboardWidgets.tsx",
      "src/components/DashboardWidgets.tsx",
      "src/lib/dashboardTabs.tsx",
    ],
  },
  pipeline: {
    pages: ["app/pipeline/page.tsx", "app/pipeline/clientes/page.tsx", "app/pipeline/historial/page.tsx"],
    files: ["app/pipeline/page.tsx", "app/pipeline/clientes/page.tsx", "app/pipeline/historial/page.tsx", "src/components/pipeline/PipelineShared.tsx"],
    board: true,
  },
  contacts: { pages: ["app/contacts/page.tsx"], files: ["app/contacts/page.tsx"] },
  companies: { pages: ["app/companies/page.tsx"], files: ["app/companies/page.tsx"] },
  projects: {
    pages: ["app/projects/page.tsx", "src/components/ProjectWorkspaceHeader.tsx"],
    files: ["app/projects/page.tsx", "app/projects/[id]/layout.tsx", "src/components/ProjectWorkspaceHeader.tsx"],
  },
  tasks: { pages: ["app/tasks/page.tsx"], files: ["app/tasks/page.tsx"] },
  appointments: { pages: ["app/appointments/page.tsx"], files: ["app/appointments/page.tsx"] },
  // ── Ronda 2 (spec, Revisions 2026-11-06) ──
  forms: { pages: ["app/forms/page.tsx"], files: ["app/forms/page.tsx"] },
  // El constructor es chrome de editor: su h1 vive en la barra del constructor, no en PageHeader.
  "forms-builder": { pages: [], files: ["app/forms/[id]/page.tsx", "src/components/FormWhatsAppRecipients.tsx", "src/components/FormApiConfig.tsx"], level: "pass" },
  quotes: {
    pages: ["app/cotizaciones/page.tsx", "app/cotizaciones/configuracion/page.tsx", "app/cotizaciones/nueva/page.tsx", "app/cotizaciones/[folio]/page.tsx"],
    files: ["app/cotizaciones/page.tsx", "app/cotizaciones/configuracion/page.tsx", "app/cotizaciones/nueva/page.tsx", "app/cotizaciones/[folio]/page.tsx", "src/components/quotes/QuoteForm.tsx", "src/components/quotes/shared.tsx"],
  },
  agenda: {
    pages: ["app/appointment-types/page.tsx", "app/availability/page.tsx"],
    files: ["app/appointment-types/page.tsx", "app/availability/page.tsx"],
  },
  mail: { pages: [], files: ["app/emails/page.tsx"], level: "pass" },
  campaigns: { pages: ["app/campaigns/page.tsx"], files: ["app/campaigns/page.tsx"] },
  kb: { pages: ["app/kb/page.tsx"], files: ["app/kb/page.tsx"] },
  "kb-editor": { pages: [], files: ["app/kb/[id]/page.tsx", "src/components/kb/KbEditor.tsx", "src/components/kb/KbEditorNavbar.tsx", "src/components/kb/KbSharePanel.tsx", "src/components/kb/KbFolderView.tsx", "src/components/kb/KbMobileMenus.tsx", "src/components/kb/KbRelationsInline.tsx"], level: "pass" },
  vault: { pages: [], files: ["app/boveda/page.tsx", "app/boveda/[clientId]/page.tsx", "src/components/vault/VaultPanel.tsx", "src/components/vault/AddClientModal.tsx", "src/components/vault/ImportExistingModal.tsx", "src/components/vault/SocialRow.tsx", "src/components/vault/VaultNav.tsx", "src/components/vault/VaultPasswordRow.tsx"], level: "pass" },
  content: {
    pages: [],
    files: ["app/contenido/page.tsx", "app/contenido/general/page.tsx", "app/contenido/[clientId]/page.tsx", "src/components/content/GeneralCalendarView.tsx", "src/components/content/ContentCalendarView.tsx", "src/components/content/ContentCalendar.tsx", "src/components/content/ContentClientsView.tsx", "src/components/content/ContentMiniMonth.tsx"],
    level: "pass",
  },
  settings: {
    pages: ["app/settings/page.tsx", "app/settings/notificaciones/page.tsx", "app/settings/integraciones/page.tsx", "app/settings/apariencia/page.tsx", "app/settings/ai-models/page.tsx", "app/settings/digest/page.tsx", "app/settings/equipo/page.tsx", "app/profile/page.tsx"],
    files: ["app/settings/page.tsx", "app/settings/notificaciones/page.tsx", "app/settings/integraciones/page.tsx", "app/settings/apariencia/page.tsx", "app/settings/ai-models/page.tsx", "app/settings/digest/page.tsx", "app/settings/equipo/page.tsx", "app/profile/page.tsx"],
    level: "pass",
  },
  details: {
    pages: ["src/components/DealDetailClient.tsx"],
    files: ["app/pipeline/[id]/page.tsx", "src/components/DealDetailClient.tsx", "app/projects/[id]/page.tsx", "app/projects/[id]/info/page.tsx"],
    level: "pass",
  },
};

const UI_IMPORT = /from ["']@\/src\/components\/ui(?:\/\w+)?["']/;
const NEUTRAL_PALETTE =
  /\b(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline)-(?:gray|slate|zinc|neutral|stone)-\d{2,3}\b|\bbg-white\b|\btext-black\b|\bbg-black\b/;

for (const [name, screen] of Object.entries(SCREENS)) {
  test(`${name}: every page of the screen opens with the shared PageHeader`, () => {
    for (const page of screen.pages) {
      const src = source(page);
      assert.ok(src, `${page} exists`);
      assert.match(src, UI_IMPORT, `${page}: imports the common pieces`);
      assert.match(src, /<PageHeader\b/, `${page}: renders PageHeader`);
    }
  });

  if (screen.level !== "pass") test(`${name}: lists and boards come from the common pieces, each list with its own empty state`, () => {
    const all = screen.files.map(source);
    const joined = all.join("\n");
    if (screen.board) {
      assert.match(joined, /<Board\b/, "the pipeline uses the common Board");
      assert.match(source("app/pipeline/page.tsx"), /<DragDropContext\b/, "the page keeps owning drag-and-drop");
    }
    const lists = all.flatMap((src) => [...tags(src, "DataList"), ...tags(src, "DataTable")]);
    assert.ok(lists.length > 0, "at least one DataList/DataTable");
    for (const tag of lists) assert.match(tag, /\bempty=\{/, `list without empty state: ${tag.slice(0, 60)}`);
    assert.match(joined, /<EmptyState\b/, "an EmptyState explains how to fill it");
    for (const [i, src] of all.entries()) {
      assert.doesNotMatch(src, /from ["']@\/src\/components\/dashboard\/EmptyState["']/, `${screen.files[i]}: use the common EmptyState`);
    }
  });

  test(`${name}: neutral colours are tokens, 12px floor, one icon family, no shouty labels`, () => {
    for (const file of screen.files) {
      const src = source(file);
      assert.ok(src, `${file} exists`);
      assert.doesNotMatch(src, NEUTRAL_PALETTE, `${file}: raw neutral colour (use surface/text/border tokens)`);
      for (const [, value, unit] of src.matchAll(/text-\[(\d*\.?\d+)(px|rem)\]/g)) {
        const px = unit === "rem" ? Number(value) * 16 : Number(value);
        assert.ok(px >= 12, `${file}: text-[${value}${unit}] under 12px`);
      }
      assert.doesNotMatch(src, /from ["']lucide-react["']/, `${file}: one icon family (Hugeicons)`);
      for (const lit of literals(src)) {
        const shouty = /(?:^|\s)uppercase(?=\s|$)/.test(lit) && /(?:^|\s)tracking-(?:wide|wider|widest|\[)/.test(lit);
        assert.ok(!shouty, `${file}: uppercase + wide tracking label "${lit.slice(0, 50)}"`);
      }
      assert.doesNotMatch(src, /backdrop-blur|crm-glass/, `${file}: glass`);
      assert.doesNotMatch(src, /\b(?:border|divide|ring)-border-subtle\b/, `${file}: use border-line (legacy overrides hide border-subtle)`);
      assert.doesNotMatch(src, /\brounded-(?:3xl|4xl)\b/, `${file}: radius above 16px`);
    }
  });
}

test("pages with a PageHeader stop the page bar from rendering a second h1 and keep their primary action", () => {
  assert.match(source("src/context/HeaderContext.tsx"), /pageHeader\?\s*:\s*boolean/, "HeaderConfig.pageHeader flag");
  const header = source("src/components/PageBar.tsx");
  assert.match(header, /<h1\b/, "the page bar still has an h1 for pages without PageHeader");
  // La condición que decide entre h1 y texto lleva `pageHeader` (directo o desestructurado) en la misma expresión JSX.
  assert.match(
    header,
    /if\s*\(\s*(?:config\.)?pageHeader\s*\)\s*return null;[\s\S]*?<h1\b|\{\s*!\s*(?:config\.)?pageHeader\s*&&[\s\S]{0,400}?<h1\b|(?:config\.)?pageHeader\s*\?[\s\S]{0,400}?:\s*\(?\s*<h1\b/,
    "the h1 is rendered only when pageHeader is not set",
  );
  for (const [name, screen] of Object.entries(SCREENS)) {
    for (const file of screen.files) {
      const src = source(file);
      if (!/\bsetConfig\(/.test(src)) continue;
      // Ronda 2: en una pasada («pass»), un archivo sin PageHeader deja el h1 a la barra superior.
      // La acción principal solo se mueve a PageHeader donde lo hay; en un editor sin PageHeader la barra superior la conserva.
      if (screen.level === "pass" && !/<PageHeader\b/.test(src)) continue;
      assert.match(src, /pageHeader:\s*true/, `${name} · ${file}: sets pageHeader: true`);
      assert.doesNotMatch(src, /\baddButton\s*:/, `${name} · ${file}: the primary action lives in PageHeader`);
    }
  }
});
