import type { KbTreeNodeDto } from "@/src/components/kb/KbFolderView";

export type KbPdfDoc = { id: string; title: string; depth: number };

export function flattenKbDocuments(tree: KbTreeNodeDto[]): KbPdfDoc[] {
  const result: KbPdfDoc[] = [];

  function walk(nodes: KbTreeNodeDto[], depth: number) {
    for (const node of nodes) {
      if (!node.isFolder) {
        result.push({
          id: node.id,
          title: node.title || "Sin título",
          depth,
        });
      } else if (node.children.length > 0) {
        walk(node.children, depth + 1);
      }
    }
  }

  walk(tree, 0);
  return result;
}

export function slugifyPdfFilename(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "documento"
  );
}
