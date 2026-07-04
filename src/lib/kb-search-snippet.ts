export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function markdownContentSnippet(
  content: string | null | undefined,
  query: string,
  maxLen = 96
): string | undefined {
  if (!content?.trim() || !query.trim()) return undefined;

  const plain = stripMarkdown(content);
  const needle = query.trim().toLowerCase();
  const idx = plain.toLowerCase().indexOf(needle);
  if (idx === -1) return undefined;

  const half = Math.floor((maxLen - needle.length) / 2);
  const start = Math.max(0, idx - half);
  const end = Math.min(plain.length, idx + needle.length + half);
  let snippet = plain.slice(start, end).trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < plain.length) snippet = `${snippet}…`;
  return snippet;
}
