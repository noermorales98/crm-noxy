"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import { AI_MODELS, DEFAULT_MODEL_ID, normalizeModelId } from "@/src/lib/ai-models";
import { providerOfModelId } from "@/src/lib/ai-provider";
import ChatSettings from "@/src/components/ai/ChatSettings";
import ChatIdentityPicker, { CHAT_TITLE_MAX } from "@/src/components/ai/ChatIdentityPicker";
import ChatBlobatar, { randomBlobSeed, type BlobMood } from "@/src/components/ai/ChatBlobatar";
import { blobColors, chatBlobSeed } from "@/src/lib/chat-blob";
import styles from "../assistant-chat.module.css";
import {
  assistantRequestErrorMessage,
  completeConversationTransition,
  createAssistantStreamOperationManager,
  createPendingConversationTransitionStore,
  ensureConversationTransition,
} from "@/src/lib/assistant-stream-lifecycle";

function AssistantNewExperienceFallback() {
  return <div className="h-full w-full bg-[#EEF1F7]" aria-hidden="true" />;
}

const AssistantNewExperience = dynamic(
  () => import("@/app/assistant/new/_components/AssistantNewExperience"),
  {
    ssr: false,
    loading: AssistantNewExperienceFallback,
  },
);

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  model?: string;
  keyUsed?: string;
  accountLabel?: string;
}

interface Props {
  conversationId: string;
  initialMessages: Message[];
  emptyExperience?: "references";
}

const SUGGESTIONS = [
  "¿Cuántos contactos nuevos tengo esta semana?",
  "Crea una tarea para dar seguimiento a un cliente",
  "¿Qué ventas están en proceso actualmente?",
  "Ayúdame a redactar un email de seguimiento",
];

const MARKER_MAP: Record<string, string> = {
  P: "primaria",
  S: "secundaria",
  F: "fallback",
  G: "rfallback",
};

function getStored(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

function setStored(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

/** Nombre legible de un modelo que no está en la lista fija (p. ej. uno de NVIDIA): «nvidia:z-ai/glm-5.3-flash» → «glm-5.3-flash». */
function prettyModelName(id: string): string {
  const bare = id.replace(/^nvidia:/, "").replace(/:free$/, "");
  return bare.split("/").pop() || id;
}

function defaultKeyUsed(modelId: string, preferKey: "1" | "2"): string | undefined {
  if (providerOfModelId(modelId) !== "openrouter") return undefined;
  return preferKey === "2" ? "secundaria" : "primaria";
}

export default function ChatView({ conversationId, initialMessages, emptyExperience }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState<string>(DEFAULT_MODEL_ID);
  const [preferredKey, setPreferredKey] = useState<"1" | "2">("1");
  // Nombres de TODOS los modelos disponibles (también los de NVIDIA): sin esto un modelo fuera de la lista fija se mostraba como Gemma.
  // Cada chat tiene su propia criatura: la de un chat guardado se recuerda por su id; la de uno nuevo es al azar.
  const [blobSeed, setBlobSeed] = useState(() => randomBlobSeed());
  const [justFinished, setJustFinished] = useState(false);
  // Nombre que la persona le puso al chat (vacío = automático, del primer mensaje).
  const [chatTitle, setChatTitle] = useState("");
  const [modelNames, setModelNames] = useState<Record<string, string>>({});
  const nameOfModel = (id: string) => modelNames[id] ?? AI_MODELS.find((m) => m.id === id)?.name ?? prettyModelName(id);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const streamingIdRef = useRef<string | null>(null);
  const messagesRef = useRef(messages);
  const activeConversationIdRef = useRef(conversationId);
  const [streamManager] = useState(createAssistantStreamOperationManager);
  const [conversationTransitions] = useState(createPendingConversationTransitionStore);

  useEffect(() => {
    streamManager.abortCurrent();
    conversationTransitions.discard();
    activeConversationIdRef.current = conversationId;
    streamingIdRef.current = null;
    setStreaming(false);
  }, [conversationId, conversationTransitions, streamManager]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [conversationId, initialMessages]);

  useEffect(() => () => {
    conversationTransitions.discard();
    streamManager.dispose();
  }, [conversationTransitions, streamManager]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => {
    if (conversationId === "new") return;
    setBlobSeed(chatBlobSeed(conversationId));
  }, [conversationId]);
  const colors = blobColors(blobSeed);
  // En un chat guardado, cambiar la cara se recuerda en el navegador y el nombre se guarda en el servidor.
  const changeSeed = (next: string) => {
    setBlobSeed(next);
    if (activeConversationIdRef.current !== "new") {
      setStored(`assistant-blob-${activeConversationIdRef.current}`, next);
      window.dispatchEvent(new CustomEvent("assistant:conversations-changed"));
    }
  };
  const changeTitle = (next: string) => {
    setChatTitle(next);
  };
  const identityPicker = (size: number) => (
    <ChatIdentityPicker seed={blobSeed} onSeedChange={changeSeed} title={chatTitle} onTitleChange={changeTitle} size={size} mood={mood} />
  );
  const chatVars = { "--chat-bubble": colors.bubble, "--chat-bubble-text": colors.text } as React.CSSProperties;
  // Contenta unos segundos al terminar de responder.
  const wasStreaming = useRef(false);
  useEffect(() => {
    if (wasStreaming.current && !streaming) {
      setJustFinished(true);
      const t = setTimeout(() => setJustFinished(false), 2200);
      wasStreaming.current = streaming;
      return () => clearTimeout(t);
    }
    wasStreaming.current = streaming;
  }, [streaming]);
  const mood: BlobMood = streaming ? "thinking" : justFinished ? "happy" : "idle";
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ai/models", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; name: string }[]) => setModelNames(Object.fromEntries(list.map((m) => [m.id, m.name]))))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const storedModel = getStored("assistant-model", DEFAULT_MODEL_ID);
    const normalizedModel = normalizeModelId(storedModel);
    setModel(normalizedModel);
    if (normalizedModel !== storedModel) setStored("assistant-model", normalizedModel);
    setPreferredKey((getStored("assistant-preferred-key", "1") as "1" | "2"));
  }, []);
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;
    scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const switchModel = (newModelId: string) => {
    setModel(newModelId);
    setStored("assistant-model", newModelId);
  };

  const stopStreaming = () => {
    streamManager.abortCurrent();
  };

  const showAssistantError = (assistantId: string, status?: number) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === assistantId
          ? { ...message, content: assistantRequestErrorMessage(status) }
          : message,
      ),
    );
  };

  const streamIntoMessage = async (
    assistantId: string,
    userContent: string,
    activeModel: string,
    activeKey: "1" | "2",
    onKeyDetected?: (key: string) => void,
    accountId?: string,
    onResponseMeta?: (meta: { model?: string; accountLabel?: string }) => void,
  ) => {
    const operation = streamManager.start();
    const operationConversationId = activeConversationIdRef.current;
    const transitionScope = conversationTransitions.captureScope();

    try {
      const pendingConversation = conversationTransitions.currentFor(operationConversationId);
      const conversation = pendingConversation ?? await ensureConversationTransition(
        operationConversationId,
        operation.signal,
      );
      if (!operation.isCurrent()) return;
      if (!conversation) {
        showAssistantError(assistantId);
        return;
      }
      if (operationConversationId === "new" && !pendingConversation) {
        if (!conversationTransitions.remember(conversation, transitionScope)) return;
        activeConversationIdRef.current = conversation.id;
        setStored(`assistant-blob-${conversation.id}`, blobSeed);
      }

      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id, content: userContent, model: activeModel, preferKey: activeKey, accountId, title: chatTitle.trim().slice(0, CHAT_TITLE_MAX) || undefined }),
        signal: operation.signal,
      });

      if (!operation.isCurrent()) return;
      if (!res.ok || !res.body) {
        showAssistantError(assistantId, res.status);
        return;
      }

      // El servidor dice con qué modelo y cuenta respondió de verdad (puede haber cambiado si el pedido falló).
      const headerValue = (name: string) => {
        const raw = res.headers.get(name);
        if (!raw) return undefined;
        try { return decodeURIComponent(raw); } catch { return raw; }
      };
      if (operation.isCurrent()) onResponseMeta?.({ model: headerValue("X-AI-Model-Used"), accountLabel: headerValue("X-AI-Account-Used") });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let keyChecked = false;
      let streamCompleted = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (!operation.isCurrent()) break;
          if (done) {
            streamCompleted = true;
            break;
          }
          let chunk = decoder.decode(value, { stream: true });

          if (!keyChecked) {
            keyChecked = true;
            if (chunk.charCodeAt(0) === 0x1b && chunk.length >= 2) {
              const key = MARKER_MAP[chunk[1]];
              if (key && operation.isCurrent()) onKeyDetected?.(key);
              chunk = chunk.slice(2);
            }
          }

          if (!chunk) continue;
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m),
          );
        }
      } catch (error: unknown) {
        if (!isAbortError(error)) throw error;
      } finally {
        reader.releaseLock();
      }

      if (
        streamCompleted
        && operation.isCurrent()
        && activeConversationIdRef.current === conversation.id
      ) {
        const completion = conversation.publishAfterStream
          ? conversationTransitions.publish(conversation, transitionScope)
          : completeConversationTransition(conversation);
        if (completion) {
          window.history.replaceState(null, "", completion.url);
          if (completion.notifySidebar) {
            window.dispatchEvent(new CustomEvent("assistant:conversations-changed"));
          }
        }
      }
    } catch (error: unknown) {
      if (!isAbortError(error) && operation.isCurrent()) {
        showAssistantError(assistantId);
      }
    } finally {
      if (operation.finish()) {
        setStreaming(false);
        streamingIdRef.current = null;
      }
    }
  };

  const sendMessage = async (content: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    const assistantId = crypto.randomUUID();
    streamingIdRef.current = assistantId;

    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        model,
        keyUsed: defaultKeyUsed(model, preferredKey),
      },
    ]);
    setStreaming(true);

    await streamIntoMessage(assistantId, content, model, preferredKey, (key) => {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, keyUsed: key } : m),
      );
    }, undefined, (meta) => {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, model: meta.model ?? m.model, accountLabel: meta.accountLabel } : m));
    });
  };

  const retryMessage = async (assistantMsgId: string, newModelId: string, accountId?: string) => {
    if (streaming) return;

    const currentMessages = messagesRef.current;
    const msgIdx = currentMessages.findIndex((m) => m.id === assistantMsgId);
    if (msgIdx < 0) return;

    const userMsg = currentMessages.slice(0, msgIdx).reverse().find((m) => m.role === "user");
    if (!userMsg) return;

    switchModel(newModelId);

    const newAssistantId = crypto.randomUUID();
    streamingIdRef.current = newAssistantId;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMsgId
          ? {
              id: newAssistantId,
              role: "assistant",
              content: "",
              createdAt: new Date().toISOString(),
              model: newModelId,
              keyUsed: defaultKeyUsed(newModelId, preferredKey),
            }
          : m,
      ),
    );
    setStreaming(true);

    await streamIntoMessage(newAssistantId, userMsg.content, newModelId, preferredKey, (key) => {
      setMessages((prev) =>
        prev.map((m) => m.id === newAssistantId ? { ...m, keyUsed: key } : m),
      );
    }, accountId, (meta) => {
      setMessages((prev) => prev.map((m) => m.id === newAssistantId ? { ...m, model: meta.model ?? m.model, accountLabel: meta.accountLabel } : m));
    });
  };

  const isEmpty = messages.length === 0;

  if (isEmpty && emptyExperience === "references") {
    return (
      <div style={{ display: "contents", ...chatVars }}>
      <AssistantNewExperience
        mascot={identityPicker(104)}
        corner={<ChatSettings />}
        onSend={sendMessage}
        disabled={streaming}
        model={model}
        onModelChange={switchModel}
      />
      </div>
    );
  }

  return (
    <div className={styles.experience} style={chatVars}>
      <ChatSettings />
      <div ref={scrollAreaRef} className={styles.scrollArea}>
        <div className={styles.messageColumn}>
          {isEmpty ? (
            <div className={styles.emptyState}>
              {identityPicker(132)}
              <div>
                <h2 className={styles.emptyTitle}>¿En qué puedo ayudarte?</h2>
                <p className={styles.emptyCopy}>Puedo consultar tu CRM, crear registros, redactar emails y más.</p>
              </div>
              <div className={styles.suggestionGrid}>
                {SUGGESTIONS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={streaming}
                    className={styles.suggestion}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                presentation="soft-card"
                role={m.role}
                content={m.content}
                streaming={streaming && m.id === streamingIdRef.current}
                modelName={m.model ? nameOfModel(m.model) : undefined}
                currentModelId={m.model}
                keyUsed={m.keyUsed}
                accountLabel={m.accountLabel}
                avatar={m.role === "user" ? undefined : <ChatBlobatar seed={blobSeed} size={44} mood={streaming && m.id === streamingIdRef.current ? "thinking" : "idle"} />}
                onRetry={m.role === "assistant" ? (newModelId, accountId) => retryMessage(m.id, newModelId, accountId) : undefined}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <ChatInput
        onSend={sendMessage}
        onStop={stopStreaming}
        disabled={streaming}
        model={model}
        onModelChange={switchModel}
      />
    </div>
  );
}
