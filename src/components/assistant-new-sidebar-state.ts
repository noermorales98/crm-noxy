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
  | { type: "mobileClose" }
  | { type: "navigate" };

/** La barra del asistente arranca visible y fijada; ocultarla es una elección que se recuerda. */
export const INITIAL_ASSISTANT_SIDEBAR_STATE: AssistantSidebarState = {
  mode: "pinned",
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
    case "mobileClose":
      return { ...state, peek: false };
    case "navigate":
      return state;
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export const ASSISTANT_SIDEBAR_MODE_STORAGE_KEY = "assistant-sidebar-mode";

// localStorage (no sessionStorage): la elección sobrevive a recargas, pestañas nuevas y cambios de ruta.
function storage(): Storage | null {
  try {
    return typeof globalThis.localStorage !== "undefined" ? globalThis.localStorage : null;
  } catch {
    return null;
  }
}

/** Modo guardado; sin preferencia (o sin almacenamiento) la barra queda fijada. */
export function readAssistantSidebarStoredMode(): AssistantSidebarMode {
  const store = storage();
  if (!store) return "pinned";
  try {
    return store.getItem(ASSISTANT_SIDEBAR_MODE_STORAGE_KEY) === "auto" ? "auto" : "pinned";
  } catch {
    return "pinned";
  }
}

export function writeAssistantSidebarStoredMode(mode: AssistantSidebarMode): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(ASSISTANT_SIDEBAR_MODE_STORAGE_KEY, mode);
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
