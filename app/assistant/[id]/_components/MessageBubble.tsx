"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RotateCcw, Check, Copy, Maximize2, Minimize2, X } from "lucide-react";
import { AI_MODELS, getModelGroups, type AiModel } from "@/src/lib/ai-models";
import { ActionCard, type ActionCardData } from "@/src/components/ai/ActionCard";
import styles from "../assistant-chat.module.css";
import {
  createAbortableRequestLifecycle,
  createReplaceableTimer,
  getDialogTabTarget,
  resolveMessageBubblePresentation,
  type MessageBubblePresentation,
} from "./message-bubble-behavior";

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
  accountLabel?: string;
  onRetry?: (modelId: string, accountId?: string) => void;
  presentation?: MessageBubblePresentation;
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
  "prose prose-sm max-w-none prose-p:my-1 prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-code:text-[#3545D6] prose-code:bg-[#EBEDFA] prose-code:px-1 prose-code:rounded prose-code:text-xs [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_table]:max-w-full [&_img]:max-w-full";

export default function MessageBubble({
  role,
  content,
  streaming,
  modelName,
  currentModelId,
  keyUsed,
  accountLabel,
  onRetry,
  presentation,
}: Props) {
  const isUser = role === "user";
  const usesSoftCards = resolveMessageBubblePresentation(presentation) === "soft-card";
  const [retryOpen, setRetryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [groups, setGroups] = useState(() => getModelGroups());
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  // Cuentas guardadas (OpenRouter y NVIDIA) para reintentar con una en concreto; vacío = automático.
  const [accounts, setAccounts] = useState<{ id: string; label: string; provider: "openrouter" | "nvidia" }[]>([]);
  const [accountId, setAccountId] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenTriggerRef = useRef<HTMLButtonElement>(null);
  const fullscreenBackdropRef = useRef<HTMLDivElement>(null);
  const fullscreenDialogRef = useRef<HTMLDivElement>(null);
  const fullscreenCloseRef = useRef<HTMLButtonElement>(null);
  const copyResetTimerRef = useRef<ReturnType<typeof createReplaceableTimer> | null>(null);
  const copyLifecycleActiveRef = useRef(false);
  const modelRequestLifecycleRef = useRef<ReturnType<typeof createAbortableRequestLifecycle> | null>(null);

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

    const backdrop = fullscreenBackdropRef.current;
    const fullscreenTrigger = fullscreenTriggerRef.current;
    const backgroundElements = Array.from(document.body.children)
      .filter((element): element is HTMLElement => (
        element instanceof HTMLElement && element !== backdrop
      ))
      .map((element) => ({
        element,
        inert: element.inert,
        ariaHidden: element.getAttribute("aria-hidden"),
      }));

    for (const { element } of backgroundElements) {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }

    const focusFrame = window.requestAnimationFrame(() => fullscreenCloseRef.current?.focus());

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setFullscreen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const focusableItems = Array.from(
        fullscreenDialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");
      const activeElement = document.activeElement instanceof HTMLElement
        && focusableItems.includes(document.activeElement)
        ? document.activeElement
        : null;
      const target = getDialogTabTarget(focusableItems, activeElement, e.shiftKey);
      if (target) {
        e.preventDefault();
        target.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKey);
      for (const { element, inert, ariaHidden } of backgroundElements) {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
      if (fullscreenTrigger?.isConnected) {
        fullscreenTrigger.focus();
      }
    };
  }, [fullscreen]);

  useEffect(() => {
    copyLifecycleActiveRef.current = true;
    return () => {
      copyLifecycleActiveRef.current = false;
      copyResetTimerRef.current?.dispose();
      copyResetTimerRef.current = null;
      modelRequestLifecycleRef.current?.dispose();
      modelRequestLifecycleRef.current = null;
    };
  }, []);

  const handleSelect = (model: AiModel) => {
    setRetryOpen(false);
    // La cuenta elegida solo vale para el proveedor al que pertenece; con otro modelo se usa el orden automático.
    const chosen = accounts.find((a) => a.id === accountId);
    onRetry?.(model.id, chosen && chosen.provider === model.provider ? chosen.id : undefined);
  };

  const openRetry = async () => {
    if (!groupsLoaded) {
      modelRequestLifecycleRef.current ??= createAbortableRequestLifecycle();
      const request = modelRequestLifecycleRef.current.start();
      try {
        // Catálogo completo (de fábrica, personalizados y los modelos vigentes de NVIDIA) y las cuentas guardadas.
        const [res, accRes] = await Promise.all([
          fetch("/api/ai/models", { cache: "no-store", signal: request.signal }),
          fetch("/api/settings/ai-accounts", { cache: "no-store", signal: request.signal }).catch(() => null),
        ]);
        if (!request.isCurrent()) return;
        if (res.ok) {
          const list = (await res.json()) as { id: string; name: string; group: string; provider: "openrouter" | "nvidia"; configured?: boolean; description?: string; tags?: string[] }[];
          if (!request.isCurrent()) return;
          const byGroup = new Map<string, AiModel[]>();
          for (const m of list) {
            if (m.configured === false) continue;
            const bucket = byGroup.get(m.group) ?? [];
            bucket.push({ id: m.id, name: m.name, provider: m.provider, group: m.group, description: m.description ?? "", tags: m.tags ?? [] });
            byGroup.set(m.group, bucket);
          }
          if (byGroup.size) setGroups([...byGroup.entries()].map(([group, models]) => ({ group, models })));
        }
        if (accRes?.ok) {
          const snap = (await accRes.json()) as { providers?: { provider: "openrouter" | "nvidia"; accounts: { id: string; label: string; enabled: boolean }[] }[] };
          if (!request.isCurrent()) return;
          setAccounts((snap.providers ?? []).flatMap((p) => p.accounts.filter((a) => a.enabled).map((a) => ({ id: a.id, label: a.label, provider: p.provider }))));
        }
      } catch {}
      if (!request.finish()) return;
      setGroupsLoaded(true);
    }
    setRetryOpen((v) => !v);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      if (!copyLifecycleActiveRef.current) return;
      setCopied(true);
      if (copyResetTimerRef.current === null) {
        copyResetTimerRef.current = createReplaceableTimer();
      }
      copyResetTimerRef.current.schedule(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div
      className={usesSoftCards
        ? `${styles.messageRow} ${isUser ? styles.userMessage : styles.assistantMessage}`
        : `flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div
          className={usesSoftCards
            ? styles.assistantAvatar
            : "shrink-0 w-7 h-7 rounded-full bg-[#EBEDFA] flex items-center justify-center mr-3 mt-0.5"}
          aria-hidden="true"
        >
          <span className={usesSoftCards ? undefined : "text-[#3545D6] text-xs font-bold"}>AI</span>
        </div>
      )}

      {/* min-w-0 prevents the flex item from growing past max-w-[85%] */}
      <div
        className={usesSoftCards
          ? styles.messageStack
          : `min-w-0 max-w-[85%] flex flex-col ${isUser ? "items-end" : "items-start"}`}
      >
        {isUser ? (
          /* User bubble */
          <div
            className={usesSoftCards
              ? styles.userCard
              : "rounded-surface px-4 py-3 text-sm leading-relaxed bg-action-primary text-action-primary-foreground rounded-br-sm"}
            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
          >
            <p style={{ whiteSpace: "pre-wrap" }}>{content}</p>
          </div>
        ) : (
          /* Assistant bubble — full height, horizontal scroll only for code/tables */
          <div
            className={usesSoftCards
              ? styles.assistantCard
              : "w-full flex flex-col rounded-surface border border-border-subtle bg-surface-elevated text-text-primary rounded-bl-sm overflow-hidden"}
          >

            {/* Content — no vertical scroll, only horizontal clipping */}
            <div
              className={usesSoftCards
                ? styles.messageContent
                : "px-4 py-3 text-sm leading-relaxed overflow-x-hidden"}
              style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
            >
              <div className={usesSoftCards ? `${styles.prose} ${PROSE}` : PROSE}>
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
                <span
                  className={usesSoftCards
                    ? styles.streamingCaret
                    : "inline-block w-0.5 h-4 bg-text-primary ml-0.5 animate-pulse"}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Maximize button — below content, aligned right inside the bubble */}
            {!streaming && (
              <div className={usesSoftCards ? styles.cardActions : "flex justify-end px-2 pb-1.5"}>
                <button
                  ref={fullscreenTriggerRef}
                  type="button"
                  onClick={() => setFullscreen(true)}
                  title="Ver en pantalla completa"
                  aria-label="Ver respuesta en pantalla completa"
                  className={usesSoftCards
                    ? `${styles.iconButton} ${styles.metaButton}`
                    : "p-1 rounded-md text-text-secondary/30 hover:text-text-secondary/70 transition-colors"}
                >
                  <Maximize2 size={11} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Meta row: model · reintentar · key · copiar */}
        {!isUser && !streaming && (modelName || keyUsed || onRetry) && (
          <div
            ref={containerRef}
            className={usesSoftCards
              ? styles.metaRow
              : "relative flex items-center gap-1.5 mt-1 ml-1 flex-wrap"}
          >
            {modelName && (
              <span className={usesSoftCards ? styles.metaLabel : "text-[10px] text-text-secondary/60 select-none"}>{modelName}</span>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={openRetry}
                className={usesSoftCards
                  ? styles.metaButton
                  : "flex items-center gap-1 text-[10px] text-text-secondary/40 hover:text-text-secondary transition-colors"}
                title="Reintentar con otro modelo"
                aria-label="Reintentar con otro modelo"
              >
                <RotateCcw size={9} strokeWidth={2} aria-hidden="true" />
                <span>reintentar</span>
              </button>
            )}
            {accountLabel ? (
              <span className={usesSoftCards ? styles.keyLabel : "text-[10px] text-text-secondary/50 select-none"}>· {accountLabel}</span>
            ) : keyUsed && (
              <span className={usesSoftCards ? styles.keyLabel : "text-[10px] text-text-secondary/50 select-none"}>
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
              className={usesSoftCards
                ? styles.metaButton
                : "flex items-center gap-1 text-[10px] text-text-secondary/40 hover:text-text-secondary transition-colors"}
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
              <div className={usesSoftCards
                ? styles.retryMenu
                : "crm-floating-menu absolute bottom-full left-0 mb-2 w-60 bg-white rounded-xl border border-border-subtle overflow-hidden z-50"}
              >
                <div className="px-3 py-2 border-b border-border-subtle bg-surface-sidebar">
                  <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                    Reintentar con…
                  </p>
                </div>
                {accounts.length > 0 && (
                  <div className="px-3 py-2 border-b border-border-subtle">
                    <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1" htmlFor="retry-account">Cuenta</label>
                    <select
                      id="retry-account"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full rounded-md border border-border-subtle bg-white px-2 py-1 text-xs text-text-primary"
                    >
                      <option value="">Automática</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.provider === "nvidia" ? "NVIDIA" : "OpenRouter"} · {a.label}</option>
                      ))}
                    </select>
                  </div>
                )}
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
                            className={`${usesSoftCards ? styles.retryOption : ""} w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                              isCurrent
                                ? "bg-[#EBEDFA] text-[#3545D6]"
                                : "hover:bg-surface-sidebar text-text-primary"
                            }`}
                          >
                            <span className="flex-1 truncate">{m.name}</span>
                            {isCurrent && (
                              <Check size={11} strokeWidth={2.5} className="shrink-0 text-[#3545D6]" />
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
            ref={fullscreenBackdropRef}
            className={usesSoftCards
              ? styles.fullscreenBackdrop
              : "fixed inset-0 z-100 bg-brand-obsidian/60 flex items-start justify-center p-6 overflow-y-auto"}
            onClick={(e) => {
              if (e.target === e.currentTarget) setFullscreen(false);
            }}
          >
            <div
              ref={fullscreenDialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Respuesta del asistente en pantalla completa"
              className={usesSoftCards ? styles.fullscreenContainer : "w-full max-w-4xl my-auto"}
            >
              {/* Fullscreen bubble — same visual style as inline bubble */}
              <div className={usesSoftCards
                ? styles.fullscreenCard
                : "rounded-surface px-4 py-3 text-sm leading-relaxed bg-surface-elevated border border-border-subtle text-text-primary rounded-bl-sm relative overflow-hidden"}
              >

                {/* Close button inside fullscreen bubble (top-right corner) */}
                <button
                  ref={fullscreenCloseRef}
                  type="button"
                  onClick={() => setFullscreen(false)}
                  title="Minimizar"
                  aria-label="Cerrar pantalla completa"
                  className={usesSoftCards
                    ? `${styles.iconButton} ${styles.fullscreenClose}`
                    : "absolute top-2.5 right-2.5 p-1.5 rounded-lg text-text-secondary/40 hover:text-text-secondary transition-colors z-10"}
                >
                  <Minimize2 size={14} aria-hidden="true" />
                </button>

                {/* Full content with extra right padding to avoid overlap with close button */}
                <div
                  className={usesSoftCards ? styles.fullscreenContent : "pr-8"}
                  style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                >
                  <div className={usesSoftCards ? `${styles.prose} ${PROSE}` : PROSE}>
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
                <div className={usesSoftCards ? styles.fullscreenFooter : "flex justify-end px-0 pt-3 pb-0"}>
                  <button
                    type="button"
                    onClick={() => setFullscreen(false)}
                    className={usesSoftCards
                      ? styles.metaButton
                      : "flex items-center gap-1.5 text-[11px] text-text-secondary/50 hover:text-text-secondary transition-colors"}
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
