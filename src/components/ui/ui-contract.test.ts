import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

// Contrato de las piezas comunes del rediseño (spec rediseno-obsidiana-estructural, plan §3 y
// «T004 — Interfaces», T003). Se verifica sobre el código fuente, como el resto de contratos del repo.
const uiDir = new URL("./", import.meta.url);
const projectRoot = new URL("../../../", import.meta.url);

const PIECES = {
  PageHeader: "PageHeader.tsx",
  StatStrip: "StatStrip.tsx",
  Block: "Block.tsx",
  DataList: "DataList.tsx",
  DataTable: "DataTable.tsx",
  FilterBar: "FilterBar.tsx",
  Segmented: "Segmented.tsx",
  Chip: "Chip.tsx",
  Board: "Board.tsx",
  EmptyState: "EmptyState.tsx",
  ErrorState: "ErrorState.tsx",
  Skeleton: "Skeleton.tsx",
  Enter: "Enter.tsx",
} as const;
// Board.tsx exporta además BoardColumn y BoardCard: 14 patrones del plan en 13 archivos.

/** Fuente sin comentarios; "" si la pieza aún no existe (el test falla por aserción, no por E/S). */
function code(file: string): string {
  const url = new URL(file, uiDir);
  if (!existsSync(url)) return "";
  return readFileSync(url, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
}

const pieces = () => Object.values(PIECES).map((file) => [file, code(file)] as const);
/**
 * Una entrada por elemento: el valor completo de cada `className=` (literal o expresión `{…}` con
 * llaves equilibradas, p. ej. `cn("a", cond && "b")`), con todos sus literales de texto unidos.
 * Es la unidad correcta: las clases de un mismo elemento pueden venir en varios argumentos.
 */
function classExpressions(src: string): string[] {
  const out: string[] = [];
  for (const match of src.matchAll(/className=/g)) {
    let i = (match.index ?? 0) + "className=".length;
    let raw = "";
    if (src[i] === '"' || src[i] === "'") {
      const end = src.indexOf(src[i], i + 1);
      raw = src.slice(i, end + 1);
    } else if (src[i] === "{") {
      let depth = 0;
      const start = i;
      for (; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}" && --depth === 0) break;
      }
      raw = src.slice(start, i + 1);
    }
    out.push(raw);
  }
  return out;
}
/**
 * Tokens con forma de clase en toda la expresión, sin emparejar comillas (así no se pierden
 * literales dentro de `${cond ? "a" : "b"}`). Incluye variantes (`hover:`) y valores arbitrarios.
 * Los identificadores sueltos (cn, dragging…) también salen, pero no afectan a las reglas.
 */
const classTokens = (expr: string) =>
  expr.match(/(?:[a-z0-9-]+:)*!?-?[a-z][\w-]*(?:\[[^\]\s"'`]*\])?(?:\/[\w.]+)?/gi) ?? [];

test("pieces use the `line` token so legacy border overrides never apply to them", () => {
  for (const [file, src] of pieces()) {
    assert.ok(src, `${file} missing`);
    assert.doesNotMatch(src, /\b(?:border|divide|ring)-border-subtle\b/, `${file}: use border-line / divide-line`);
  }
});

test("every common piece exists and exports its component by name", () => {
  for (const [name, file] of Object.entries(PIECES)) {
    const src = code(file);
    assert.ok(src, `${file} exists`);
    assert.match(src, new RegExp(`export (?:function|const) ${name}\\b`), `${file} exports ${name} by name`);
    assert.doesNotMatch(src, /export default/, `${file}: named exports only`);
  }
  for (const name of ["BoardColumn", "BoardCard"]) {
    assert.match(code(PIECES.Board), new RegExp(`export (?:function|const) ${name}\\b`), `Board.tsx exports ${name}`);
  }
});

test("pieces use only theme tokens: no raw Tailwind palette, hard-coded colours or sub-12px text", () => {
  for (const [file, src] of pieces()) {
    assert.ok(src, `${file} missing`);
    assert.doesNotMatch(
      src,
      /\b(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
      `${file}: raw Tailwind palette`,
    );
    assert.doesNotMatch(src, /(?<!href=["'])#[0-9a-f]{6}(?:[0-9a-f]{2})?\b|(?<!href=["'])#[0-9a-f]{3}\b(?![\w-])/i, `${file}: hard-coded hex colour`);
    for (const [, value] of src.matchAll(/text-\[(\d*\.?\d+)px\]/g)) {
      assert.ok(Number(value) >= 12, `${file}: text-[${value}px] under 12px`);
    }
    for (const [, value] of src.matchAll(/text-\[(\d*\.?\d+)rem\]/g)) {
      assert.ok(Number(value) * 16 >= 12, `${file}: text-[${value}rem] under 12px`);
    }
    assert.doesNotMatch(src, /\btext-\[(?:9|10|11)px\]|\btext-2xs\b/, `${file}: text under 12px`);
  }
});

test("pieces keep the shape and elevation rules: no glass, decorative shadows or radii above 16px", () => {
  for (const [file, src] of pieces()) {
    assert.ok(src, `${file} missing`);
    assert.doesNotMatch(src, /backdrop-blur|backdrop-filter|crm-glass/, `${file}: glass`);
    assert.doesNotMatch(src, /\bshadow-(?:sm|md|lg|xl|2xl)\b/, `${file}: decorative shadow`);
    // rounded-2xl = --radius-2xl = 16px en este repo (permitido); 3xl y valores > 16 px no.
    assert.doesNotMatch(src, /\brounded-3xl\b/, `${file}: radius above 16px`);
    for (const [, value] of src.matchAll(/rounded(?:-[trblse]{1,2})?-\[(\d+)px\]/g)) {
      assert.ok(Number(value) <= 16, `${file}: rounded-[${value}px] above 16px`);
    }
    assert.doesNotMatch(src, /from ["']lucide-react["']/, `${file}: one icon family (Hugeicons)`);
  }
});

test("motion rule: an element with crm-lift/crm-press carries no competing Tailwind transition", () => {
  for (const [file, src] of pieces()) {
    assert.ok(src, `${file} missing`);
    // Las clases van en línea para que la regla sea comprobable; solo se admite reenviar `className`.
    for (const expr of classExpressions(src)) {
      if (/^\{\s*[A-Za-z_$][\w$]*\s*\}$/.test(expr)) {
        assert.equal(expr.replace(/\s/g, ""), "{className}", `${file}: className={identifier} hides classes from the contract`);
      }
    }
    for (const expr of classExpressions(src)) {
      const tokens = classTokens(expr);
      if (tokens.some((t) => t === "crm-lift" || t === "crm-press")) {
        const competing = tokens.filter((t) => /^transition(?:$|-)/.test(t.split(":").pop() ?? ""));
        assert.deepEqual(competing, [], `${file}: crm-lift/press with ${competing.join(" ")} in ${expr}`);
      }
    }
  }
});

test("status tokens exist in the global theme and are not personalised by themes", () => {
  const globals = readFileSync(new URL("app/globals.css", projectRoot), "utf8");
  const themes = readFileSync(new URL("src/lib/crm-themes.ts", projectRoot), "utf8");
  const block = (selector: string) => {
    const start = globals.indexOf(`${selector} {`);
    assert.ok(start >= 0, `${selector} block`);
    return globals.slice(start, globals.indexOf("}", start));
  };
  const themeBlock = block("@theme");
  const rootBlock = block(":root");
  for (const [token, hex] of [
    ["danger", "#B42318"],
    ["danger-soft", "#FDECEA"],
    ["success", "#067647"],
    ["success-soft", "#E7F6EE"],
  ]) {
    assert.match(themeBlock, new RegExp(`--color-${token}:\\s*${hex}`, "i"), `@theme --color-${token}`);
    assert.match(rootBlock, new RegExp(`--${token}:\\s*${hex}`, "i"), `:root --${token}`);
    assert.doesNotMatch(themes, new RegExp(`--color-${token}\\b`), `themes must not override --color-${token}`);
  }
});

test("PageHeader renders one 24/600 h1 and uses its subtitle and actions props", () => {
  const src = code(PIECES.PageHeader);
  assert.equal((src.match(/<h1\b/g) ?? []).length, 1, "exactly one h1");
  assert.match(src, /<h1\b[^>]*\btext-2xl\b[^>]*\bfont-semibold\b|<h1\b[^>]*\bfont-semibold\b[^>]*\btext-2xl\b/, "h1 24px / 600");
  assert.match(src, /subtitle\?\s*:/, "subtitle is optional in the props type");
  assert.match(src, /actions\?\s*:/, "actions is optional in the props type");
  assert.match(src, /\{\s*subtitle\b/, "subtitle is rendered");
  assert.match(src, /\{\s*actions\b/, "actions are rendered");
});

test("StatStrip is a definition list with tabular numbers, 2→4 columns, tone and flag", () => {
  const src = code(PIECES.StatStrip);
  for (const tag of ["dl", "dt", "dd"]) assert.match(src, new RegExp(`<${tag}\\b`), `<${tag}>`);
  assert.match(src, /tabular-nums/);
  assert.match(src, /\bgrid-cols-2\b/);
  assert.match(src, /\blg:grid-cols-4\b/);
  assert.match(src, /tone\?\s*:\s*["']up["']\s*\|\s*["']down["']/, "tone: up | down");
  assert.match(src, /flag\?\s*:\s*string/, "flag?: string");
  // Se usan en el JSX devuelto (por propiedad o desestructurados), no solo en el tipo de props.
  const start = src.search(/export (?:function|const) StatStrip\b/);
  const render = src.slice(src.indexOf("return", start));
  assert.match(render, /\bflag\b/, "flag is used in the render");
  assert.match(render, /\btone\b/, "tone is used in the render");
});

test("Block is a flat surface with an h2 title and a 44px action", () => {
  const src = code(PIECES.Block);
  assert.match(src, /<h2\b[^>]*>\s*\{\s*title\s*\}/, "h2 renders the title");
  assert.match(src, /\brounded-surface\b/);
  assert.match(src, /\bborder-line\b/);
  assert.doesNotMatch(src, /\bshadow-/, "flat at rest");
  assert.match(src, /action\?\s*:/, "action is optional");
  assert.match(src, /\bmin-h-11\b/, "action touch target 44px");
  if (/onClick/.test(src)) assert.match(src, /^["']use client["']/m, "client boundary for onClick");
});

test("DataList and DataTable require an empty state and stable keys", () => {
  for (const file of [PIECES.DataList, PIECES.DataTable]) {
    const src = code(file);
    assert.match(src, /\bempty\s*:\s*(?:React\.)?ReactNode/, `${file}: empty is required`);
    assert.match(src, /getKey\s*:/, `${file}: getKey in props`);
    assert.match(src, /key=\{\s*getKey\(/, `${file}: rows keyed by getKey`);
    assert.match(src, /rows\.length\s*===\s*0|!rows\.length|rows\.length\s*<\s*1/, `${file}: renders empty when there are no rows`);
  }
  const list = code(PIECES.DataList);
  assert.match(list, /\bmin-h-14\b/, "DataList rows at least 56px");
  assert.match(list, /\bdivide-y\b|\bborder-b\b/, "a divider between rows");
});

test("DataTable shows a table from lg up and stacked 56px rows below", () => {
  const src = code(PIECES.DataTable);
  assert.match(src, /<table\b/);
  assert.match(src, /<th\b[^>]*scope="col"/);
  assert.match(src, /\bhidden\s+lg:(?:block|table)\b/, "table hidden below lg");
  assert.match(src, /\blg:hidden\b/, "stacked rows hidden from lg");
  assert.match(src, /mobileRow\(/, "mobileRow is rendered");
  // Las filas apiladas son <div>/<li>: el mínimo de 56 px sí aplica ahí (no en <tr>).
  assert.match(src, /\blg:hidden\b[\s\S]*\bmin-h-14\b/, "stacked rows at least 56px");
});

test("FilterBar wraps on small screens and never overflows", () => {
  const src = code(PIECES.FilterBar);
  assert.match(src, /\bflex-wrap\b/);
  assert.match(src, /\bmin-w-0\b/);
});

test("Segmented is an accessible client toggle group with 44px targets", () => {
  const src = code(PIECES.Segmented);
  assert.match(src, /^["']use client["']/m);
  assert.match(src, /role="group"/);
  assert.match(src, /aria-label=\{\s*label\s*\}/);
  assert.match(src, /aria-pressed=\{/);
  assert.match(src, /\bmin-h-11\b|\bmin-h-\[44px\]/, "44px touch target");
});

test("Chip tones map to tokens: hot Lima+Obsidiana, late danger, done success, neutral Lavanda", () => {
  const src = code(PIECES.Chip);
  // Valor de cada tono: la expresión que sigue a `hot:` / `"hot":` hasta la coma o la llave de cierre.
  const tone = (name: string) =>
    src.match(new RegExp(`["']?\\b${name}["']?\\s*:\\s*([^,}\\n]+)`))?.[1] ?? "";
  assert.match(tone("hot"), /\bbg-highlight\b/);
  assert.match(tone("hot"), /\btext-text-primary\b/);
  assert.match(tone("late"), /\bbg-danger-soft\b/);
  assert.match(tone("late"), /\btext-danger\b/);
  assert.match(tone("done"), /\bbg-success-soft\b/);
  assert.match(tone("done"), /\btext-success\b/);
  // 2026-11-08: el neutral es minimalista (solo borde fino y texto), sin relleno de color.
  assert.match(tone("neutral"), /\bborder-line\b/);
  assert.doesNotMatch(tone("neutral"), /\bbg-/);
  assert.match(src, /\brounded-full\b/);
  assert.match(src, /children\s*:\s*(?:React\.)?ReactNode/, "children is required: chips always carry text");
});

test("Board keeps drag-and-drop in the page; dragging cards use the overlay shadow", () => {
  const src = code(PIECES.Board);
  assert.doesNotMatch(src, /from ["']@hello-pangea\/dnd["']|<DragDropContext\b/, "Board does not own drag-and-drop");
  assert.match(src, /\bsnap-x\b/, "scroll-snap on small screens");
  assert.match(src, /dragging\?\s*:\s*boolean/);
  const overlay = /shadow-\[0_8px_8px_rgba\(11,11,24,(?:0)?\.10?\)\]/;
  const dragExpr = classExpressions(src).find((expr) => overlay.test(expr));
  assert.ok(dragExpr, "a className applies the overlay shadow");
  assert.match(dragExpr, /\bdragging\b/, "the overlay shadow is conditioned on dragging");
  assert.equal(classExpressions(src).filter((expr) => overlay.test(expr) && !/\bdragging\b/.test(expr)).length, 0, "no unconditional overlay shadow");
  assert.match(src, /\bcrm-lift\b/, "cards lift on hover");
});

test("EmptyState, ErrorState and Skeleton announce their state", () => {
  const empty = code(PIECES.EmptyState);
  assert.match(empty, /title\s*:\s*string/);
  assert.match(empty, /\{\s*title\s*\}/);
  assert.match(empty, /action\?\s*:/);
  const error = code(PIECES.ErrorState);
  assert.match(error, /^["']use client["']/m);
  assert.match(error, /role="alert"/);
  assert.match(error, /onRetry\?\s*:/);
  assert.match(error, /onClick=\{[^}]*\bonRetry\b/, "retry button calls onRetry");
  assert.match(error, /\bmin-h-11\b/, "retry touch target 44px");
  const skeleton = code(PIECES.Skeleton);
  assert.match(skeleton, /aria-busy="true"/);
  assert.match(skeleton, /role="status"/);
  for (const shape of ["rows", "stats", "board"]) assert.match(skeleton, new RegExp(`["']${shape}["']`), `shape ${shape}`);
});

test("Enter applies the entry motion once with an index clamped to 0-5", () => {
  const src = code(PIECES.Enter);
  assert.match(src, /\bcrm-enter\b/);
  assert.match(src, /["']--i["']/);
  // Acotado a 0-5 en cualquier orden de Math.min/Math.max.
  assert.match(src, /Math\.min\(/, "upper clamp");
  assert.match(src, /Math\.max\(/, "lower clamp");
  // El límite va dentro de los paréntesis de su propia llamada (admite un nivel de anidamiento).
  const call = (fn: string, bound: string) =>
    new RegExp(`Math\\.${fn}\\((?:[^()]|\\([^()]*\\))*\\b${bound}\\b(?:[^()]|\\([^()]*\\))*\\)`);
  assert.match(src, call("min", "5"), "upper bound 5");
  assert.match(src, call("max", "0"), "lower bound 0");
});
