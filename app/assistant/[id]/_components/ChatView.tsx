"use client";
import { useEffect, useRef, useState } from "react";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import AssistantNewExperience from "@/app/assistant/new/_components/AssistantNewExperience";
import { DEFAULT_MODEL_ID, getModelById } from "@/src/lib/ai-models";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  model?: string;
  keyUsed?: string;
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

function defaultKeyUsed(modelId: string, preferKey: "1" | "2"): string | undefined {
  if (getModelById(modelId).provider !== "openrouter") return undefined;
  return preferKey === "2" ? "secundaria" : "primaria";
}

export default function ChatView({ conversationId, initialMessages, emptyExperience }: Props) {
  const [activeConversationId, setActiveConversationId] = useState(conversationId);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState<string>(DEFAULT_MODEL_ID);
  const [preferredKey, setPreferredKey] = useState<"1" | "2">("1");
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamingIdRef = useRef<string | null>(null);
  const messagesRef = useRef(messages);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeConversationIdRef = useRef(conversationId);

  useEffect(() => {
    setActiveConversationId(conversationId);
    activeConversationIdRef.current = conversationId;
    setMessages(initialMessages);
  }, [conversationId, initialMessages]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => {
    setModel(getStored("assistant-model", DEFAULT_MODEL_ID));
    setPreferredKey((getStored("assistant-preferred-key", "1") as "1" | "2"));
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const switchModel = (newModelId: string) => {
    setModel(newModelId);
    setStored("assistant-model", newModelId);
  };

  const switchKey = (k: "1" | "2") => {
    setPreferredKey(k);
    setStored("assistant-preferred-key", k);
  };

  const stopStreaming = () => {
    abortControllerRef.current?.abort();
  };

  const ensureConversation = async (): Promise<string | null> => {
    if (activeConversationIdRef.current !== "new") {
      return activeConversationIdRef.current;
    }
    const res = await fetch("/api/assistant/conversations", { method: "POST" });
    if (!res.ok) return null;
    const conv = (await res.json()) as { id: string };
    setActiveConversationId(conv.id);
    activeConversationIdRef.current = conv.id;
    window.history.replaceState(null, "", `/assistant/${conv.id}`);
    window.dispatchEvent(new CustomEvent("assistant:conversations-changed"));
    return conv.id;
  };

  const streamIntoMessage = async (
    assistantId: string,
    userContent: string,
    activeModel: string,
    activeKey: "1" | "2",
    onKeyDetected?: (key: string) => void,
  ) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const convId = await ensureConversation();
      if (!convId) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }

      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, content: userContent, model: activeModel, preferKey: activeKey }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let keyChecked = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          let chunk = decoder.decode(value, { stream: true });

          if (!keyChecked) {
            keyChecked = true;
            if (chunk.charCodeAt(0) === 0x1b && chunk.length >= 2) {
              const key = MARKER_MAP[chunk[1]];
              if (key) onKeyDetected?.(key);
              chunk = chunk.slice(2);
            }
          }

          if (!chunk) continue;
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m),
          );
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") throw err;
      } finally {
        reader.releaseLock();
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
    } finally {
      abortControllerRef.current = null;
      setStreaming(false);
      streamingIdRef.current = null;
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
    });
  };

  const retryMessage = async (assistantMsgId: string, newModelId: string) => {
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
    });
  };

  const isEmpty = messages.length === 0;

  if (isEmpty && emptyExperience === "references") {
    return (
      <AssistantNewExperience
        onSend={sendMessage}
        disabled={streaming}
        model={model}
        onModelChange={switchModel}
        preferredKey={preferredKey}
        onKeyChange={switchKey}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 min-h-0">
        <div className="max-w-[720px] mx-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
                <span className="text-[#6366F1] text-2xl font-bold">AI</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary mb-1">¿En qué puedo ayudarte?</h2>
                <p className="text-sm text-text-secondary">Puedo consultar tu CRM, crear registros, redactar emails y más.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={streaming}
                    className="text-left text-xs text-text-secondary bg-white border border-border-subtle rounded-lg px-3 py-2.5 hover:bg-surface-elevated hover:text-text-primary transition-colors leading-snug"
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
                role={m.role}
                content={m.content}
                streaming={streaming && m.id === streamingIdRef.current}
                modelName={m.model ? getModelById(m.model).name : undefined}
                currentModelId={m.model}
                keyUsed={m.keyUsed}
                onRetry={m.role === "assistant" ? (newModelId) => retryMessage(m.id, newModelId) : undefined}
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
        preferredKey={preferredKey}
        onKeyChange={switchKey}
      />
    </div>
  );
}
