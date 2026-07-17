"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RotateCcw, Check, Copy, Maximize2, Minimize2, X } from "lucide-react";
import { AI_MODELS, getModelGroups, type AiModel } from "@/src/lib/ai-models";
import { ActionCard, type ActionCardData } from "@/src/components/ai/ActionCard";
import styles from "../assistant-chat.module.css";

function buildGroups(builtins: AiModel[], customs: AiModel[]): { group: string; models: AiModel[] }[] {
  const all = [...builtins, ...customs];
  const result: { group: string; models: AiModel[] }[] = [];
  const idx = new Map<string, number>();
  for (const m of all) {
    const i = idx.get(m.group);
    if (i !== undefined) { result[i].models.push(m); }
    else { idx.set(m.group, result.length); result.push({ group: m.group, models: [m] }); }
  }
  return result;
}

interface Props {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  modelName?: string;
  currentModelId?: string;
  keyUsed?: string;
  onRetry?: (modelId: string) => void;
}

interface CustomModelPayload {
  enabled?: boolean;
  modelId?: string;
  name?: string;
  group?: string;
  description?: string;
  tags?: string;
}

/* Shared prose classes for consistent markdown rendering */
const PROSE =
  "prose prose-sm max-w-none prose-p:my-1 prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-code:text-[#6366F1] prose-code:bg-[#EEF2FF] prose-code:px-1 prose-code:rounded prose-code:text-xs [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_table]:max-w-full [&_img]:max-w-full";

export default function MessageBubble({ role, content, streaming, modelName, currentModelId, keyUsed, onRetry }: Props) {
  const isUser = role === "user";
  const [retryOpen, setRetryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [groups, setGroups] = useState(() => getModelGroups());
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!retryOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setRetryOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [retryOpen]);

  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const handleSelect = (model: AiModel) => {
    setRetryOpen(false);
    onRetry?.(model.id);
  };

  const openRetry = async () => {
    if (!groupsLoaded) {
      try {
        const res = await fetch("/api/settings/ai-models", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as {
            hiddenBuiltins?: unknown;
            models?: CustomModelPayload[];
          };
          const hidden: string[] = Array.isArray(data.hiddenBuiltins) ? data.hiddenBuiltins : [];
          const customs: AiModel[] = (data.models ?? [])
            .filter((m): m is CustomModelPayload & { modelId: string; name: string } => (
              Boolean(m.enabled && m.modelId && m.name)
            ))
            .map((m) => ({
              id: m.modelId,
              name: m.name,
              provider: "openrouter" as const,
              group: m.group || "Personalizados",
              description: m.description || "",
              tags: JSON.parse(m.tags || "[]"),
            }));
          const visibleBuiltins = AI_MODELS.filter((m) => !hidden.includes(m.id));
          setGroups(buildGroups(visibleBuiltins, customs));
        }
      } catch {}
      setGroupsLoaded(true);
    }
    setRetryOpen((v) => !v);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div
      className={`${styles.messageRow} ${isUser ? styles.userMessage : styles.assistantMessage}`}
    >
      {!isUser && (
        <div className={styles.assistantAvatar} aria-hidden="true">
          <span>AI</span>
        </div>
      )}

      {/* min-w-0 prevents the flex item from growing past max-w-[85%] */}
      <div className={styles.messageStack}>
        {isUser ? (
          /* User bubble */
          <div className={styles.userCard}>
            <p>{content}</p>
          </div>
        ) : (
          /* Assistant bubble — full height, horizontal scroll only for code/tables */
          <div className={styles.assistantCard}>

            {/* Content — no vertical scroll, only horizontal clipping */}
            <div className={styles.messageContent}>
              <div className={`${styles.prose} ${PROSE}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children }) {
                      const lang = /language-(\w+)/.exec(className ?? "")?.[1];
                      const codeStr = String(children).replace(/\n$/, "");
                      if (lang === "action") {
                        try {
                          const parsed = JSON.parse(codeStr) as ActionCardData;
                          return <ActionCard action={parsed} />;
                        } catch {
                          return <code className={className}>{children}</code>;
                        }
                      }
                      return <code className={className}>{children}</code>;
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
              {streaming && (
                <span className={styles.streamingCaret} aria-hidden="true" />
              )}
            </div>

            {/* Maximize button — below content, aligned right inside the bubble */}
            {!streaming && (
              <div className={styles.cardActions}>
                <button
                  type="button"
                  onClick={() => setFullscreen(true)}
                  title="Ver en pantalla completa"
                  aria-label="Ver respuesta en pantalla completa"
                  className={`${styles.iconButton} ${styles.metaButton}`}
                >
                  <Maximize2 size={11} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Meta row: model · reintentar · key · copiar */}
        {!isUser && !streaming && (modelName || keyUsed || onRetry) && (
          <div ref={containerRef} className={styles.metaRow}>
            {modelName && (
              <span className={styles.metaLabel}>{modelName}</span>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={openRetry}
                className={styles.metaButton}
                title="Reintentar con otro modelo"
                aria-label="Reintentar con otro modelo"
              >
                <RotateCcw size={9} strokeWidth={2} aria-hidden="true" />
                <span>reintentar</span>
              </button>
            )}
            {keyUsed && (
              <span className={styles.keyLabel}>
                ·{" "}
                {keyUsed === "fallback"
                  ? "key 1 → key 2"
                  : keyUsed === "rfallback"
                  ? "key 2 → key 1"
                  : keyUsed === "secundaria"
                  ? "key 2"
                  : "key 1"}
              </span>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className={styles.metaButton}
              title="Copiar respuesta"
              aria-label="Copiar respuesta"
            >
              {copied ? (
                <Check size={9} strokeWidth={2.5} className="text-green-500" aria-hidden="true" />
              ) : (
                <Copy size={9} strokeWidth={2} aria-hidden="true" />
              )}
              <span>{copied ? "copiado" : "copiar"}</span>
            </button>

            {retryOpen && (
              <div className={styles.retryMenu}>
                <div className="px-3 py-2 border-b border-border-subtle bg-surface-sidebar">
                  <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                    Reintentar con…
                  </p>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {groups.map(({ group, models }) => (
                    <div key={group}>
                      <p className="px-3 pt-2.5 pb-0.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                        {group}
                      </p>
                      {models.map((m) => {
                        const isCurrent = m.id === currentModelId;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleSelect(m)}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                              isCurrent
                                ? "bg-[#EEF2FF] text-[#6366F1]"
                                : "hover:bg-surface-sidebar text-text-primary"
                            }`}
                          >
                            <span className="flex-1 truncate">{m.name}</span>
                            {isCurrent && (
                              <Check size={11} strokeWidth={2.5} className="shrink-0 text-[#6366F1]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen overlay — portal to document.body */}
      {fullscreen &&
        createPortal(
          <div
            className={styles.fullscreenBackdrop}
            onClick={(e) => {
              if (e.target === e.currentTarget) setFullscreen(false);
            }}
          >
            <div className={styles.fullscreenContainer}>
              {/* Fullscreen bubble — same visual style as inline bubble */}
              <div className={styles.fullscreenCard}>

                {/* Close button inside fullscreen bubble (top-right corner) */}
                <button
                  type="button"
                  onClick={() => setFullscreen(false)}
                  title="Minimizar"
                  aria-label="Cerrar pantalla completa"
                  className={`${styles.iconButton} ${styles.fullscreenClose}`}
                >
                  <Minimize2 size={14} aria-hidden="true" />
                </button>

                {/* Full content with extra right padding to avoid overlap with close button */}
                <div className={styles.fullscreenContent}>
                  <div className={`${styles.prose} ${PROSE}`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children }) {
                          const lang = /language-(\w+)/.exec(className ?? "")?.[1];
                          const codeStr = String(children).replace(/\n$/, "");
                          if (lang === "action") {
                            try {
                              const parsed = JSON.parse(codeStr) as ActionCardData;
                              return <ActionCard action={parsed} />;
                            } catch {
                              return <code className={className}>{children}</code>;
                            }
                          }
                          return <code className={className}>{children}</code>;
                        },
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Minimize footer button */}
                <div className={styles.fullscreenFooter}>
                  <button
                    type="button"
                    onClick={() => setFullscreen(false)}
                    className={styles.metaButton}
                  >
                    <X size={11} aria-hidden="true" />
                    Cerrar pantalla completa
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
