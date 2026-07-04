/** Strip inline markdown from a heading title string. */
function cleanMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export type LeadingMarkdownTitle = {
  title: string;
  contentWithoutTitle: string;
};

/**
 * If the document starts with a single `#` heading (after optional blank lines
 * and YAML front matter), returns that title and content with the heading removed.
 */
export function extractLeadingMarkdownTitle(content: string): LeadingMarkdownTitle | null {
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length && lines[i].trim() === "") i++;

  if (i < lines.length && lines[i].trim() === "---") {
    i++;
    while (i < lines.length && lines[i].trim() !== "---") i++;
    if (i < lines.length) i++;
    while (i < lines.length && lines[i].trim() === "") i++;
  }

  if (i >= lines.length) return null;

  const h1Match = lines[i].match(/^#\s+(?!#)(.+?)\s*$/);
  if (!h1Match) return null;

  const title = cleanMarkdownInline(h1Match[1]);
  if (!title) return null;

  const after = lines.slice(i + 1);
  const skipBlank = after.length > 0 && after[0].trim() === "" ? 1 : 0;
  const contentWithoutTitle = [...lines.slice(0, i), ...after.slice(skipBlank)]
    .join("\n")
    .replace(/^\n+/, "");

  return { title, contentWithoutTitle };
}
