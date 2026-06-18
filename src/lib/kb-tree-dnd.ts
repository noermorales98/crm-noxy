import type { KbNode } from "@/src/context/KbContext";

export const KB_ROOT_DROPPABLE = "kb-root";

export function toDroppableId(parentId: string | null): string {
  return parentId ? `kb-parent-${parentId}` : KB_ROOT_DROPPABLE;
}

export function fromDroppableId(droppableId: string): string | null {
  if (droppableId === KB_ROOT_DROPPABLE) return null;
  if (droppableId.startsWith("kb-parent-")) return droppableId.slice("kb-parent-".length);
  return null;
}

export function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...list];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

export function moveBetweenLists(
  fromList: KbNode[],
  toList: KbNode[],
  fromIndex: number,
  toIndex: number
): { from: KbNode[]; to: KbNode[]; moved: KbNode } {
  const from = [...fromList];
  const to = [...toList];
  const [moved] = from.splice(fromIndex, 1);
  to.splice(toIndex, 0, moved);
  return { from, to, moved };
}
