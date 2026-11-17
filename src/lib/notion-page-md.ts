/**
 * Página de Notion → markdown. Funciones puras: la lectura de la API vive en `granola-service`.
 */

type RichText = { plain_text?: string; href?: string | null; annotations?: { bold?: boolean; italic?: boolean; code?: boolean; strikethrough?: boolean } };
export type NotionBlock = { id?: string; type?: string; has_children?: boolean; children?: NotionBlock[]; [key: string]: unknown };

const PAGE_ID_AT_END = /([0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Id de página (con guiones) a partir de un enlace de Notion o del id suelto; `null` si no hay ninguno. */
export function parseNotionPageId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  // En los enlaces el id va al final del camino (tras el título); se ignoran la consulta, el ancla y la barra final.
  const path = input.trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
  const found = PAGE_ID_AT_END.exec(path)?.[1];
  if (!found) return null;
  const hex = found.replace(/-/g, "").toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function inline(rich: unknown): string {
  if (!Array.isArray(rich)) return "";
  return (rich as RichText[])
    .map((part) => {
      let text = part.plain_text ?? "";
      if (!text) return "";
      const a = part.annotations ?? {};
      if (a.code) text = `\`${text}\``;
      if (a.bold) text = `**${text}**`;
      if (a.italic) text = `*${text}*`;
      if (a.strikethrough) text = `~~${text}~~`;
      if (part.href) text = `[${text}](${part.href})`;
      return text;
    })
    .join("");
}

const textOf = (block: NotionBlock): string => {
  const data = block[block.type ?? ""] as { rich_text?: unknown } | undefined;
  return inline(data?.rich_text);
};

function render(blocks: NotionBlock[], depth: number, out: string[]) {
  let numbered = 0;
  for (const block of blocks) {
    const pad = "  ".repeat(depth);
    const text = textOf(block);
    numbered = block.type === "numbered_list_item" ? numbered + 1 : 0;
    switch (block.type) {
      case "heading_1":
        out.push(`# ${text}`, "");
        break;
      case "heading_2":
        out.push(`## ${text}`, "");
        break;
      case "heading_3":
        out.push(`### ${text}`, "");
        break;
      case "bulleted_list_item":
        out.push(`${pad}- ${text}`);
        break;
      case "numbered_list_item":
        out.push(`${pad}${numbered}. ${text}`);
        break;
      case "to_do": {
        const checked = (block.to_do as { checked?: boolean } | undefined)?.checked;
        out.push(`${pad}- [${checked ? "x" : " "}] ${text}`);
        break;
      }
      case "quote":
        out.push(`> ${text}`, "");
        break;
      case "callout":
        out.push(`> ${text}`, "");
        break;
      case "code":
        out.push("```", text, "```", "");
        break;
      case "divider":
        out.push("---", "");
        break;
      case "paragraph":
        out.push(`${pad}${text}`, "");
        break;
      case "toggle":
        out.push(`${pad}- ${text}`);
        break;
      default:
        // Tipos sin texto útil (imágenes, incrustados, bases de datos…) se omiten.
        if (text) out.push(`${pad}${text}`, "");
    }
    if (block.children?.length) render(block.children, depth + 1, out);
  }
}

/** Markdown de una lista de bloques ya leídos (con `children` anidados). */
export function blocksToMarkdown(blocks: NotionBlock[]): string {
  const out: string[] = [];
  render(blocks, 0, out);
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Título de una página de Notion (la propiedad de tipo `title`). */
export function notionPageTitle(page: unknown): string | null {
  const properties = (page as { properties?: Record<string, { type?: string; title?: unknown }> } | null)?.properties;
  if (!properties) return null;
  for (const property of Object.values(properties)) {
    if (property?.type === "title") return inline(property.title).trim() || null;
  }
  return null;
}
