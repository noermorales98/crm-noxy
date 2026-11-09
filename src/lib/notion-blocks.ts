// Markdown de un documento del /kb → bloques de Notion. Solo los bloques básicos; lo demás queda como párrafo.

export type NotionBlock = { object: "block"; type: string; [key: string]: unknown };

const MAX_TEXT = 2000;
const LANGUAGES: Record<string, string> = {
  js: "javascript", javascript: "javascript", ts: "typescript", typescript: "typescript", tsx: "typescript", jsx: "javascript",
  json: "json", html: "html", css: "css", bash: "bash", sh: "shell", shell: "shell", sql: "sql", python: "python", py: "python",
  md: "markdown", markdown: "markdown", yaml: "yaml", yml: "yaml", php: "php", java: "java", go: "go", ruby: "ruby", xml: "xml",
};

/** Trozos de ≤2000 caracteres: es el máximo de Notion por elemento de texto. */
export function richText(content: string): { type: "text"; text: { content: string } }[] {
  const text = content.length ? content : " ";
  const items: { type: "text"; text: { content: string } }[] = [];
  for (let i = 0; i < text.length; i += MAX_TEXT) items.push({ type: "text", text: { content: text.slice(i, i + MAX_TEXT) } });
  return items;
}

const stripInline = (line: string) => line.replace(/\*\*(.+?)\*\*/g, "$1").replace(/(?<!\*)\*(?!\*)(.+?)\*/g, "$1").replace(/`([^`]+)`/g, "$1");

const block = (type: string, content: string): NotionBlock => ({ object: "block", type, [type]: { rich_text: richText(stripInline(content)) } });

export function markdownToNotionBlocks(markdown: string | null | undefined): NotionBlock[] {
  if (!markdown?.trim()) return [];
  const blocks: NotionBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^```\s*(\w*)/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      blocks.push({
        object: "block",
        type: "code",
        code: { rich_text: richText(body.join("\n")), language: LANGUAGES[fence[1].toLowerCase()] ?? "plain text" },
      });
      continue;
    }
    if (!line.trim()) continue;
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) blocks.push({ object: "block", type: "divider", divider: {} });
    else if (/^###\s+/.test(line)) blocks.push(block("heading_3", line.replace(/^###\s+/, "")));
    else if (/^##\s+/.test(line)) blocks.push(block("heading_2", line.replace(/^##\s+/, "")));
    else if (/^#\s+/.test(line)) blocks.push(block("heading_1", line.replace(/^#\s+/, "")));
    else if (/^\s*[-*+]\s+/.test(line)) blocks.push(block("bulleted_list_item", line.replace(/^\s*[-*+]\s+/, "")));
    else if (/^\s*\d+[.)]\s+/.test(line)) blocks.push(block("numbered_list_item", line.replace(/^\s*\d+[.)]\s+/, "")));
    else if (/^>\s?/.test(line)) blocks.push(block("quote", line.replace(/^>\s?/, "")));
    else blocks.push(block("paragraph", line));
  }
  return blocks;
}
