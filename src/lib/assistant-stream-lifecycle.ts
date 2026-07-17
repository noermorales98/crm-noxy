export interface PendingConversationTransition {
  id: string;
  publishAfterStream: boolean;
}

export interface CompletedConversationTransition {
  url: string;
  notifySidebar: true;
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
