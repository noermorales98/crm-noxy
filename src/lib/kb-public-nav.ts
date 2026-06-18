import type { PublicTreeNode } from "@/src/lib/kb-share-access";

export type PublicNavPage = { id: string; title: string };

export type PublicPageNav = {
  prev: PublicNavPage | null;
  next: PublicNavPage | null;
  index: number;
  total: number;
};

export function flattenPublicDocuments(tree: PublicTreeNode[]): PublicNavPage[] {
  const result: PublicNavPage[] = [];

  function walk(nodes: PublicTreeNode[]) {
    for (const node of nodes) {
      if (!node.isFolder) {
        result.push({ id: node.id, title: node.title || "Sin título" });
      } else if (node.children.length > 0) {
        walk(node.children);
      }
    }
  }

  walk(tree);
  return result;
}

export function resolvePublicPageNav(
  pages: PublicNavPage[],
  currentPageId: string
): PublicPageNav | null {
  const index = pages.findIndex((p) => p.id === currentPageId);
  if (index === -1) return null;

  return {
    prev: index > 0 ? pages[index - 1] : null,
    next: index < pages.length - 1 ? pages[index + 1] : null,
    index,
    total: pages.length,
  };
}
