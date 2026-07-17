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
