export type AssistantNewSidebarState = "closed" | "open";
export type SidebarFocusDirection = "forward" | "backward";

export type AssistantNewSidebarAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "toggle" }
  | { type: "navigate" };

export function isAssistantRoute(pathname: string): boolean {
  return /^\/assistant(?:\/new|\/[^/]+)?$/.test(pathname);
}

export function assistantNewSidebarReducer(
  state: AssistantNewSidebarState,
  action: AssistantNewSidebarAction,
): AssistantNewSidebarState {
  if (action.type === "open") return "open";
  if (action.type === "close") return "closed";
  if (action.type === "navigate") return state;
  return state === "open" ? "closed" : "open";
}

export const ASSISTANT_SIDEBAR_STORAGE_KEY = "assistant-sidebar-open";

function canUseSessionStorage(): boolean {
  try {
    return typeof globalThis.sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

export function readAssistantSidebarStoredState(): AssistantNewSidebarState {
  if (!canUseSessionStorage()) return "closed";
  try {
    return globalThis.sessionStorage.getItem(ASSISTANT_SIDEBAR_STORAGE_KEY) === "open" ? "open" : "closed";
  } catch {
    return "closed";
  }
}

export function writeAssistantSidebarStoredState(state: AssistantNewSidebarState): void {
  if (!canUseSessionStorage()) return;
  try {
    globalThis.sessionStorage.setItem(ASSISTANT_SIDEBAR_STORAGE_KEY, state);
  } catch {
    // Ignore quota / private-mode failures.
  }
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
