export type AssistantNewSidebarState = "closed" | "open";

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
