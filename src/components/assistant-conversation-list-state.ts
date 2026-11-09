export interface AiConversation {
  id: string;
  title: string;
  updatedAt: string;
}

export type AssistantConversationListStatus = "loading" | "ready" | "refreshing" | "error";

export interface AssistantConversationListState {
  status: AssistantConversationListStatus;
  conversations: AiConversation[];
  hasSnapshot: boolean;
}

export type AssistantConversationListAction =
  | { type: "request" }
  | { type: "success"; conversations: AiConversation[] }
  | { type: "error" };

export const INITIAL_ASSISTANT_CONVERSATION_LIST_STATE: AssistantConversationListState = {
  status: "loading",
  conversations: [],
  hasSnapshot: false,
};

export function assistantConversationListReducer(
  state: AssistantConversationListState,
  action: AssistantConversationListAction,
): AssistantConversationListState {
  if (action.type === "request") {
    return {
      status: state.hasSnapshot ? "refreshing" : "loading",
      conversations: state.conversations,
      hasSnapshot: state.hasSnapshot,
    };
  }
  if (action.type === "success") {
    return { status: "ready", conversations: action.conversations, hasSnapshot: true };
  }
  return {
    status: "error",
    conversations: state.conversations,
    hasSnapshot: state.hasSnapshot,
  };
}

export type ConversationDayGroup = { label: "Hoy" | "Ayer" | "Últimos 7 días" | "Anteriores"; conversations: AiConversation[] };

/**
 * Agrupa el historial por día local, en el orden recibido (más reciente primero):
 * Hoy, Ayer, Últimos 7 días y Anteriores. Los grupos vacíos no se devuelven.
 */
export function groupConversationsByDay(conversations: readonly AiConversation[], now: Date = new Date()): ConversationDayGroup[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  const order: ConversationDayGroup["label"][] = ["Hoy", "Ayer", "Últimos 7 días", "Anteriores"];
  const buckets = new Map<ConversationDayGroup["label"], AiConversation[]>(order.map((label) => [label, []]));
  for (const conversation of conversations) {
    const at = new Date(conversation.updatedAt).getTime();
    const label: ConversationDayGroup["label"] = Number.isNaN(at)
      ? "Anteriores"
      : at >= startOfToday
        ? "Hoy"
        : at >= startOfToday - day
          ? "Ayer"
          : at >= startOfToday - 7 * day
            ? "Últimos 7 días"
            : "Anteriores";
    buckets.get(label)!.push(conversation);
  }
  return order.map((label) => ({ label, conversations: buckets.get(label)! })).filter((group) => group.conversations.length > 0);
}
