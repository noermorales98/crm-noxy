"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  assistantConversationListReducer,
  INITIAL_ASSISTANT_CONVERSATION_LIST_STATE,
  type AiConversation,
} from "./assistant-conversation-list-state";

export function useAssistantConversations(enabled: boolean) {
  const [state, dispatch] = useReducer(
    assistantConversationListReducer,
    INITIAL_ASSISTANT_CONVERSATION_LIST_STATE,
  );
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    dispatch({ type: "request" });
    try {
      const response = await fetch("/api/assistant/conversations", {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Conversation request failed: ${response.status}`);
      const conversations = (await response.json()) as AiConversation[];
      dispatch({ type: "success", conversations });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      dispatch({ type: "error" });
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
    return () => controllerRef.current?.abort();
  }, [refresh]);

  useEffect(() => {
    const onChanged = () => void refresh();
    window.addEventListener("assistant:conversations-changed", onChanged);
    return () => window.removeEventListener("assistant:conversations-changed", onChanged);
  }, [refresh]);

  return { ...state, refresh };
}
