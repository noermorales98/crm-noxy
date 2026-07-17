export interface PendingConversationTransition {
  id: string;
  publishAfterStream: boolean;
}

export interface CompletedConversationTransition {
  url: string;
  notifySidebar: true;
}

interface ConversationCreationResponse {
  ok: boolean;
  json: () => Promise<unknown>;
}

export type CreateConversationRequest = (
  signal: AbortSignal,
) => Promise<ConversationCreationResponse>;

export interface AssistantStreamOperation {
  readonly signal: AbortSignal;
  isCurrent: () => boolean;
  finish: () => boolean;
}

export interface AssistantStreamOperationManager {
  start: () => AssistantStreamOperation;
  abortCurrent: () => void;
  dispose: () => void;
}

export function createAssistantStreamOperationManager(): AssistantStreamOperationManager {
  let current: { controller: AbortController; token: object } | null = null;
  let disposed = false;

  return {
    start() {
      disposed = false;
      current?.controller.abort();
      const operation = { controller: new AbortController(), token: {} };
      current = operation;

      return {
        signal: operation.controller.signal,
        isCurrent: () => (
          !disposed
          && current?.token === operation.token
          && !operation.controller.signal.aborted
        ),
        finish: () => {
          if (disposed || current?.token !== operation.token) return false;
          current = null;
          return true;
        },
      };
    },
    abortCurrent() {
      current?.controller.abort();
    },
    dispose() {
      disposed = true;
      current?.controller.abort();
      current = null;
    },
  };
}

export function beginConversationTransition(
  activeConversationId: string,
  createdConversationId?: string,
): PendingConversationTransition {
  if (activeConversationId !== "new") {
    return { id: activeConversationId, publishAfterStream: false };
  }

  if (!createdConversationId) {
    throw new Error("A newly created conversation requires an id");
  }

  return { id: createdConversationId, publishAfterStream: true };
}

export function completeConversationTransition(
  conversation: PendingConversationTransition,
): CompletedConversationTransition | null {
  if (!conversation.publishAfterStream) return null;
  return {
    url: `/assistant/${conversation.id}`,
    notifySidebar: true,
  };
}

export async function ensureConversationTransition(
  activeConversationId: string,
  signal: AbortSignal,
  createConversation: CreateConversationRequest = async (requestSignal) => (
    fetch("/api/assistant/conversations", {
      method: "POST",
      signal: requestSignal,
    })
  ),
): Promise<PendingConversationTransition | null> {
  if (activeConversationId !== "new") {
    return beginConversationTransition(activeConversationId);
  }

  signal.throwIfAborted();
  const response = await createConversation(signal);
  signal.throwIfAborted();
  if (!response.ok) return null;

  const payload = await response.json();
  signal.throwIfAborted();
  if (
    typeof payload !== "object"
    || payload === null
    || !("id" in payload)
    || typeof payload.id !== "string"
    || payload.id.length === 0
  ) {
    return null;
  }

  return beginConversationTransition("new", payload.id);
}

export async function persistBeforeClosingStream(
  persist: () => Promise<void>,
  close: () => void,
): Promise<void> {
  try {
    await persist();
  } finally {
    close();
  }
}

export function assistantRequestErrorMessage(status?: number): string {
  const suffix = status ? ` (Error ${status})` : "";
  return `No pude generar una respuesta en este momento. Intenta de nuevo o selecciona otro modelo.${suffix}`;
}
