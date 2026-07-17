"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import {
  assistantConversationListReducer,
  INITIAL_ASSISTANT_CONVERSATION_LIST_STATE,
  type AiConversation,
} from "./assistant-conversation-list-state";
import { createAssistantConversationLoader } from "./assistant-conversation-loader";

export function useAssistantConversations(enabled: boolean) {
  const [state, dispatch] = useReducer(
    assistantConversationListReducer,
    INITIAL_ASSISTANT_CONVERSATION_LIST_STATE,
  );
  const [loader] = useState(() => createAssistantConversationLoader(
    dispatch,
    async (signal) => {
      const response = await fetch("/api/assistant/conversations", {
        signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Conversation request failed: ${response.status}`);
      return (await response.json()) as AiConversation[];
    },
  ));

  const refresh = useCallback(async () => {
    if (!enabled) return;
    await loader.refresh();
  }, [enabled, loader]);

  useEffect(() => {
    void refresh();
    return () => loader.dispose();
  }, [loader, refresh]);

  useEffect(() => {
    const onChanged = () => void refresh();
    window.addEventListener("assistant:conversations-changed", onChanged);
    return () => window.removeEventListener("assistant:conversations-changed", onChanged);
  }, [refresh]);

  return { ...state, refresh };
}
