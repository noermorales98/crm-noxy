import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";

const processor = unified().use(remarkParse).use(remarkGfm);

export function parseKbMarkdown(content: string): Root {
  return processor.parse(content) as Root;
}
