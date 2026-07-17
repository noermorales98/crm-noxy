import type {
  AiConversation,
  AssistantConversationListAction,
} from "./assistant-conversation-list-state";

type DispatchConversationAction = (action: AssistantConversationListAction) => void;
type LoadConversations = (signal: AbortSignal) => Promise<AiConversation[]>;

export interface AssistantConversationLoader {
  refresh: () => Promise<void>;
  dispose: () => void;
}

export function createAssistantConversationLoader(
  dispatch: DispatchConversationAction,
  loadConversations: LoadConversations,
): AssistantConversationLoader {
  let currentController: AbortController | null = null;
  let disposed = false;

  return {
    async refresh() {
      disposed = false;
      currentController?.abort();
      const controller = new AbortController();
      currentController = controller;
      dispatch({ type: "request" });

      try {
        const conversations = await loadConversations(controller.signal);
        if (
          disposed
          || controller.signal.aborted
          || currentController !== controller
        ) return;
        dispatch({ type: "success", conversations });
      } catch {
        if (
          disposed
          || controller.signal.aborted
          || currentController !== controller
        ) return;
        dispatch({ type: "error" });
      } finally {
        if (currentController === controller) currentController = null;
      }
    },
    dispose() {
      disposed = true;
      currentController?.abort();
      currentController = null;
    },
  };
}
