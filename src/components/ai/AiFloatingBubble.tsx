"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiChatIcon,
  ArrowUpRight01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { useAi } from "@/src/hooks/useAi";
import MessageBubble from "@/app/assistant/[id]/_components/MessageBubble";

interface BubbleMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function BubbleInput({
  onSend,
  onStop,
  disabled,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 100)}px`;
    }
  }, [value]);

  const submit = () => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-end gap-2 bg-surface-app border border-border-subtle rounded-xl px-3 py-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={disabled}
          placeholder="Escribe un mensaje…"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none leading-relaxed disabled:opacity-50"
          style={{ maxHeight: "100px", overflowY: "auto" }}
        />
        {disabled ? (
          <button
            onClick={onStop}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-action-primary text-white hover:bg-red-600 transition-all shrink-0"
          >
            <Square size={10} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!value.trim()}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <Send size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

export function AiFloatingBubble() {
  const { isOpen, conversationId, setConversationId, pageContext, toggle, close } =
    useAi();
  const [messages, setMessages] = useState<BubbleMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const streamingIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const handleSend = async (content: string) => {
    // 1. If no conversationId yet, create one
    let activeConvId = conversationId;
    if (!activeConvId) {
      const res = await fetch("/api/assistant/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) return;
      const data = await res.json();
      activeConvId = data.id as string;
      setConversationId(activeConvId);
    }

    // 2. Add user message
    const userMsg: BubbleMessage = { id: crypto.randomUUID(), role: "user", content };
    const assistantId = crypto.randomUUID();
    streamingIdRef.current = assistantId;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setStreaming(true);

    // 3. Stream response
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId,
          content,
          pageContext: pageContext ?? undefined,
        }),
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
          // Strip key marker if present (first 2 bytes)
          if (!keyChecked) {
            keyChecked = true;
            if (chunk.charCodeAt(0) === 0x1b && chunk.length >= 2) {
              chunk = chunk.slice(2);
            }
          }
          if (!chunk) continue;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m
            )
          );
        }
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") throw err;
      } finally {
        reader.releaseLock();
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
    } finally {
      abortControllerRef.current = null;
      setStreaming(false);
      streamingIdRef.current = null;
    }
  };

  return (
    <>
      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-[88px] right-4 sm:right-6 z-50 h-[min(520px,calc(100vh-7rem))] w-[calc(100vw-2rem)] sm:w-[380px] bg-white rounded-surface shadow-md border border-border-subtle flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <div className="flex items-center">
              <HugeiconsIcon icon={AiChatIcon} size={16} color="#0B0B18" />
              <span className="ml-2 text-sm font-semibold text-text-primary">
                Asistente IA
              </span>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={conversationId ? `/assistant/${conversationId}` : "/assistant"}
                title="Abrir en pantalla completa"
                className="p-1 rounded-md hover:bg-surface-elevated text-text-secondary transition-colors"
              >
                <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} />
              </a>
              <button
                onClick={close}
                title="Cerrar"
                className="p-1 rounded-md hover:bg-surface-elevated text-text-secondary transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>
          </div>

          {/* Context chip */}
          {pageContext !== null && (
            <div className="px-4 py-1.5 bg-surface-app border-b border-border-subtle">
              <span className="text-[11px] text-text-secondary">
                Contexto:{" "}
                <span className="font-medium text-text-primary">
                  {pageContext.label}
                </span>
              </span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 min-h-0">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <HugeiconsIcon icon={AiChatIcon} size={28} color="#0B0B18" />
                <p className="text-sm font-semibold text-text-primary">
                  ¿En qué puedo ayudarte?
                </p>
                <p className="text-xs text-text-secondary">
                  Pregunta sobre tus contactos, deals, tareas y más.
                </p>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    role={m.role}
                    content={m.content}
                    streaming={streaming && m.id === streamingIdRef.current}
                  />
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border-subtle">
            <BubbleInput
              onSend={handleSend}
              onStop={handleStop}
              disabled={streaming}
            />
          </div>
        </div>
      )}

      {/* Bubble button */}
      <button
        onClick={toggle}
        aria-label={isOpen ? "Cerrar asistente IA" : "Abrir asistente IA"}
        aria-expanded={isOpen}
        className="fixed bottom-6 right-6 z-50 w-[52px] h-[52px] rounded-full flex items-center justify-center bg-action-primary text-white shadow-md hover:bg-action-secondary transition-colors duration-200 motion-reduce:transition-none"
      >
        <HugeiconsIcon icon={AiChatIcon} size={22} color="white" />
      </button>
    </>
  );
}
