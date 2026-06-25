"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RotateCcw, Check, Copy, Maximize2, Minimize2, X } from "lucide-react";
import { AI_MODELS, getModelGroups, type AiModel } from "@/src/lib/ai-models";

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
          const data = await res.json();
          const hidden: string[] = Array.isArray(data.hiddenBuiltins) ? data.hiddenBuiltins : [];
          const customs: AiModel[] = (data.models ?? [])
            .filter((m: any) => m.enabled)
            .map((m: any) => ({
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
    <div className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center mr-3 mt-0.5">
          <span className="text-[#6366F1] text-xs font-bold">AI</span>
        </div>
      )}

      {/* min-w-0 prevents the flex item from growing past max-w-[85%] */}
      <div className={`min-w-0 max-w-[85%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        {isUser ? (
          /* User bubble */
          <div
            className="rounded-2xl px-4 py-3 text-sm leading-relaxed bg-accent-charcoal text-white rounded-br-sm"
            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
          >
            <p style={{ whiteSpace: "pre-wrap" }}>{content}</p>
          </div>
        ) : (
          /* Assistant bubble — full height, horizontal scroll only for code/tables */
          <div className="w-full flex flex-col rounded-2xl border border-border-subtle bg-surface-elevated text-text-primary rounded-bl-sm overflow-hidden">

            {/* Content — no vertical scroll, only horizontal clipping */}
            <div
              className="px-4 py-3 text-sm leading-relaxed overflow-x-hidden"
              style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
            >
              <div className={PROSE}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
              {streaming && (
                <span className="inline-block w-0.5 h-4 bg-text-primary ml-0.5 animate-pulse" />
              )}
            </div>

            {/* Maximize button — below content, aligned right inside the bubble */}
            {!streaming && (
              <div className="flex justify-end px-2 pb-1.5">
                <button
                  type="button"
                  onClick={() => setFullscreen(true)}
                  title="Ver en pantalla completa"
                  className="p-1 rounded-md text-text-secondary/30 hover:text-text-secondary/70 hover:bg-black/5 transition-colors"
                >
                  <Maximize2 size={11} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Meta row: model · reintentar · key · copiar */}
        {!isUser && !streaming && (modelName || keyUsed || onRetry) && (
          <div ref={containerRef} className="relative flex items-center gap-1.5 mt-1 ml-1 flex-wrap">
            {modelName && (
              <span className="text-[10px] text-text-secondary/60 select-none">{modelName}</span>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={openRetry}
                className="flex items-center gap-1 text-[10px] text-text-secondary/40 hover:text-text-secondary transition-colors"
                title="Reintentar con otro modelo"
              >
                <RotateCcw size={9} strokeWidth={2} />
                <span>reintentar</span>
              </button>
            )}
            {keyUsed && (
              <span className="text-[10px] text-text-secondary/50 select-none">
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
              className="flex items-center gap-1 text-[10px] text-text-secondary/40 hover:text-text-secondary transition-colors"
              title="Copiar respuesta"
            >
              {copied ? (
                <Check size={9} strokeWidth={2.5} className="text-green-500" />
              ) : (
                <Copy size={9} strokeWidth={2} />
              )}
              <span>{copied ? "copiado" : "copiar"}</span>
            </button>

            {retryOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-60 bg-white rounded-xl border border-border-subtle shadow-xl overflow-hidden z-50">
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
            className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm flex items-start justify-center p-6 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setFullscreen(false);
            }}
          >
            <div className="w-full max-w-4xl my-auto">
              {/* Fullscreen bubble — same visual style as inline bubble */}
              <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed bg-surface-elevated border border-border-subtle text-text-primary rounded-bl-sm relative overflow-hidden">

                {/* Close button inside fullscreen bubble (top-right corner) */}
                <button
                  type="button"
                  onClick={() => setFullscreen(false)}
                  title="Minimizar"
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-text-secondary/40 hover:text-text-secondary hover:bg-black/5 transition-colors z-10"
                >
                  <Minimize2 size={14} />
                </button>

                {/* Full content with extra right padding to avoid overlap with close button */}
                <div
                  className="pr-8"
                  style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                >
                  <div className={PROSE}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  </div>
                </div>

                {/* Minimize footer button */}
                <div className="flex justify-end px-0 pt-3 pb-0">
                  <button
                    type="button"
                    onClick={() => setFullscreen(false)}
                    className="flex items-center gap-1.5 text-[11px] text-text-secondary/50 hover:text-text-secondary transition-colors"
                  >
                    <X size={11} />
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
