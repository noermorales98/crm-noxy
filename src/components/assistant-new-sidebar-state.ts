export type AssistantSidebarMode = "pinned" | "auto";

export type AssistantSidebarState = {
  mode: AssistantSidebarMode;
  peek: boolean;
};

export type SidebarFocusDirection = "forward" | "backward";

export type AssistantSidebarAction =
  | { type: "pin" }
  | { type: "unpin" }
  | { type: "peekOpen" }
  | { type: "peekClose" }
  | { type: "mobileOpen" }
  | { type: "navigate" };

export const INITIAL_ASSISTANT_SIDEBAR_STATE: AssistantSidebarState = {
  mode: "auto",
  peek: false,
};

export function isAssistantRoute(pathname: string): boolean {
  return /^\/assistant(?:\/new|\/[^/]+)?$/.test(pathname);
}

export function isAssistantSidebarVisible(state: AssistantSidebarState): boolean {
  return state.mode === "pinned" || state.peek;
}

export function assistantNewSidebarReducer(
  state: AssistantSidebarState,
  action: AssistantSidebarAction,
): AssistantSidebarState {
  switch (action.type) {
    case "pin":
      return { mode: "pinned", peek: false };
    case "unpin":
      return { mode: "auto", peek: false };
    case "peekOpen":
      if (state.mode === "pinned") return state;
      return { ...state, peek: true };
    case "peekClose":
      if (state.mode === "pinned") return state;
      return { ...state, peek: false };
    case "mobileOpen":
      return { ...state, peek: true };
    case "navigate":
      return state;
    default:
      return state;
  }
}

export const ASSISTANT_SIDEBAR_MODE_STORAGE_KEY = "assistant-sidebar-mode";

function canUseSessionStorage(): boolean {
  try {
    return typeof globalThis.sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

export function readAssistantSidebarStoredMode(): AssistantSidebarMode {
  if (!canUseSessionStorage()) return "auto";
  try {
    return globalThis.sessionStorage.getItem(ASSISTANT_SIDEBAR_MODE_STORAGE_KEY) === "pinned"
      ? "pinned"
      : "auto";
  } catch {
    return "auto";
  }
}

export function writeAssistantSidebarStoredMode(mode: AssistantSidebarMode): void {
  if (!canUseSessionStorage()) return;
  try {
    globalThis.sessionStorage.setItem(ASSISTANT_SIDEBAR_MODE_STORAGE_KEY, mode);
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
