import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { markdownToNotionBlocks, richText } from "./notion-blocks.ts";

const text = (block: any) => block[block.type].rich_text.map((t: any) => t.text.content).join("");

test("markdownToNotionBlocks maps headings, lists, quotes, code and paragraphs", () => {
  const blocks: any[] = markdownToNotionBlocks("# Título\n\nHola **mundo**\n\n## Sub\n- uno\n- dos\n1. primero\n> cita\n```js\nconst a = 1;\n```\n---");
  assert.deepEqual(blocks.map((b: any) => b.type), [
    "heading_1", "paragraph", "heading_2", "bulleted_list_item", "bulleted_list_item", "numbered_list_item", "quote", "code", "divider",
  ]);
  assert.equal(text(blocks[0]), "Título");
  assert.equal(text(blocks[7]), "const a = 1;");
  assert.equal(blocks[7].code.language, "javascript");
});

test("long text is split below Notion's 2000-character limit per rich-text item", () => {
  const items = richText("a".repeat(4500));
  assert.equal(items.length, 3);
  assert.ok(items.every((item: any) => item.text.content.length <= 2000));
});

test("empty or missing content gives no blocks and unknown code languages fall back", () => {
  assert.deepEqual(markdownToNotionBlocks(""), []);
  assert.deepEqual(markdownToNotionBlocks(null), []);
  assert.equal((markdownToNotionBlocks("```zzz\nx\n```") as any[])[0].code.language, "plain text");
});
