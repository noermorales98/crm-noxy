import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { blocksToMarkdown, notionPageTitle, parseNotionPageId } from "./notion-page-md.ts";

const ID = "0123abcd-4567-89ab-cdef-0123456789ab";

test("id de página: enlace con título, enlace corto, id con y sin guiones", () => {
  assert.equal(parseNotionPageId(`https://www.notion.so/espacio/Reunion-con-Acme-0123abcd456789abcdef0123456789ab`), ID);
  assert.equal(parseNotionPageId(`https://notion.so/0123abcd456789abcdef0123456789ab?v=zzz#ancla`), ID);
  assert.equal(parseNotionPageId("0123ABCD456789ABCDEF0123456789AB"), ID);
  assert.equal(parseNotionPageId(ID), ID);
  assert.equal(parseNotionPageId(` https://notion.so/x/Titulo-0123abcd456789abcdef0123456789ab/ `), ID);
});

test("id de página: lo que no es un id de Notion se rechaza", () => {
  assert.equal(parseNotionPageId(""), null);
  assert.equal(parseNotionPageId("https://notion.so/sin-id"), null);
  assert.equal(parseNotionPageId(42), null);
  assert.equal(parseNotionPageId("0123abcd"), null);
});

const rich = (text: string, annotations: Record<string, boolean> = {}, href: string | null = null) => [{ plain_text: text, annotations, href }];

test("bloques → markdown: títulos, listas, casillas, citas, código y anidación", () => {
  const md = blocksToMarkdown([
    { type: "heading_2", heading_2: { rich_text: rich("Siguientes pasos") } },
    { type: "to_do", to_do: { rich_text: rich("Enviar propuesta"), checked: false } },
    { type: "to_do", to_do: { rich_text: rich("Ya listo"), checked: true } },
    { type: "bulleted_list_item", bulleted_list_item: { rich_text: rich("Uno", { bold: true }) }, children: [{ type: "bulleted_list_item", bulleted_list_item: { rich_text: rich("Hijo") } }] },
    { type: "numbered_list_item", numbered_list_item: { rich_text: rich("Primero") } },
    { type: "numbered_list_item", numbered_list_item: { rich_text: rich("Segundo") } },
    { type: "paragraph", paragraph: { rich_text: rich("Ver ", {}, null).concat(rich("sitio", { italic: true }, "https://x.com")) } },
    { type: "quote", quote: { rich_text: rich("Cita") } },
    { type: "code", code: { rich_text: rich("let a = 1") } },
    { type: "divider", divider: {} },
    { type: "image", image: {} },
  ]);
  assert.equal(
    md,
    ["## Siguientes pasos", "", "- [ ] Enviar propuesta", "- [x] Ya listo", "- **Uno**", "  - Hijo", "1. Primero", "2. Segundo", "Ver [*sitio*](https://x.com)", "", "> Cita", "", "```", "let a = 1", "```", "", "---"].join("\n"),
  );
});

test("título de la página y página sin título", () => {
  assert.equal(notionPageTitle({ properties: { Tags: { type: "multi_select" }, Name: { type: "title", title: rich("Reunión Acme") } } }), "Reunión Acme");
  assert.equal(notionPageTitle({ properties: {} }), null);
  assert.equal(notionPageTitle(null), null);
});

test("un toggle se muestra como viñeta con sus hijos anidados", () => {
  const md = blocksToMarkdown([{ type: "toggle", toggle: { rich_text: rich("Detalles") }, children: [{ type: "paragraph", paragraph: { rich_text: rich("Dentro") } }] }]);
  assert.equal(md, "- Detalles\n  Dentro");
});
