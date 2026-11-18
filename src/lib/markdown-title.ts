/** Extrae el título de la primera línea `# …` del markdown y lo quita del cuerpo. */
export function extractMarkdownTitle(markdown: string): { title: string | null; body: string } {
  const text = markdown.replace(/^\uFEFF/, "");
  const match = text.match(/^#[ \t]+([^\r\n]+?)[ \t]*(?:\r?\n|$)/);
  if (!match) return { title: null, body: text };
  const title = match[1].replace(/\s+#+\s*$/, "").trim();
  if (!title) return { title: null, body: text };
  const body = text.slice(match[0].length).replace(/^\r?\n/, "");
  return { title: title.slice(0, 190), body };
}
