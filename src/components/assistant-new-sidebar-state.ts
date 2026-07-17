export type AssistantNewSidebarState = "closed" | "open";
export type SidebarFocusDirection = "forward" | "backward";

export type AssistantNewSidebarAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "toggle" };

export function isAssistantNewRoute(pathname: string): boolean {
  return pathname === "/assistant/new";
}

export function assistantNewSidebarReducer(
  state: AssistantNewSidebarState,
  action: AssistantNewSidebarAction,
): AssistantNewSidebarState {
  if (action.type === "open") return "open";
  if (action.type === "close") return "closed";
  return state === "open" ? "closed" : "open";
}

export function getSidebarFocusTarget(
  currentIndex: number,
  focusableCount: number,
  direction: SidebarFocusDirection,
): number | null {
  if (focusableCount <= 0) return null;
  if (currentIndex < 0) return direction === "backward" ? focusableCount - 1 : 0;
  if (direction === "forward" && currentIndex === focusableCount - 1) return 0;
  if (direction === "backward" && currentIndex === 0) return focusableCount - 1;
  return null;
}
