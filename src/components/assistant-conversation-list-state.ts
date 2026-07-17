export interface AiConversation {
  id: string;
  title: string;
  updatedAt: string;
}

export type AssistantConversationListStatus = "loading" | "ready" | "refreshing" | "error";

export interface AssistantConversationListState {
  status: AssistantConversationListStatus;
  conversations: AiConversation[];
}

export type AssistantConversationListAction =
  | { type: "request" }
  | { type: "success"; conversations: AiConversation[] }
  | { type: "error" };

export const INITIAL_ASSISTANT_CONVERSATION_LIST_STATE: AssistantConversationListState = {
  status: "loading",
  conversations: [],
};

export function assistantConversationListReducer(
  state: AssistantConversationListState,
  action: AssistantConversationListAction,
): AssistantConversationListState {
  if (action.type === "request") {
    return {
      status: state.status === "loading" ? "loading" : "refreshing",
      conversations: state.conversations,
    };
  }
  if (action.type === "success") return { status: "ready", conversations: action.conversations };
  return { status: "error", conversations: state.conversations };
}
