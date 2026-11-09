"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  UserMultipleIcon,
  Building04Icon,
  BarChartIcon,
  Book01Icon,
  Task01Icon,
  BrowserIcon,
  Home01Icon,
  LockPasswordIcon,
  Folder01Icon,
  AiMagicIcon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";

type ResultType =
  | "page"
  | "contact"
  | "company"
  | "deal"
  | "kb"
  | "client"
  | "task"
  | "form"
  | "project";

type SearchResult = {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  href: string;
};

const RESULT_ICONS: Record<ResultType, typeof UserMultipleIcon> = {
  page: Home01Icon,
  contact: UserMultipleIcon,
  company: Building04Icon,
  deal: BarChartIcon,
  kb: Book01Icon,
  client: LockPasswordIcon,
  task: Task01Icon,
  form: BrowserIcon,
  project: Folder01Icon,
};

const RESULT_LABELS: Record<ResultType, string> = {
  page: "Sección",
  contact: "Contacto",
  company: "Empresa",
  deal: "Venta",
  kb: "Doc",
  client: "Cliente",
  task: "Tarea",
  form: "Formulario",
  project: "Proyecto",
};

export default function SpotlightSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Modo «Preguntar»: consulta a la IA sin salir del buscador (misma conversación hasta cerrar).
  const [mode, setMode] = useState<"search" | "ask">("search");
  const [thread, setThread] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [asking, setAsking] = useState(false);
  const conversationRef = useRef<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setMode("search");
      setThread([]);
      setAsking(false);
      conversationRef.current = null;
      setConversationId(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setSelectedIndex(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (mode === "ask") return;
    debounceRef.current = setTimeout(() => search(query), 280);
    return () => clearTimeout(debounceRef.current);
  }, [query, search, mode]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = useCallback(async (question: string) => {
    const text = question.trim();
    if (!text || asking) return;
    setMode("ask");
    setQuery("");
    setThread((prev) => [...prev, { role: "user", text }, { role: "assistant", text: "" }]);
    setAsking(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const fail = (message: string) =>
      setThread((prev) => [...prev.slice(0, -1), { role: "assistant", text: message }]);
    try {
      if (!conversationRef.current) {
        const created = await fetch("/api/assistant/conversations", { method: "POST", signal: controller.signal });
        if (!created.ok) return fail("No se pudo iniciar la conversación.");
        const conversation = (await created.json()) as { id: string };
        conversationRef.current = conversation.id;
        setConversationId(conversation.id);
      }
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationRef.current, content: text, preferKey: "1" }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) return fail("No se pudo obtener respuesta. Inténtalo de nuevo.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let first = true;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        let chunk = decoder.decode(value, { stream: true });
        // El primer fragmento puede ser solo la etiqueta de la clave usada (\x1b…): no es texto.
        if (first) {
          first = false;
          if (chunk.startsWith("\x1b")) continue;
        }
        if (chunk.includes("\x1b")) chunk = chunk.replace(/\x1b[^\n]*/g, "");
        setThread((prev) => [...prev.slice(0, -1), { role: "assistant", text: prev[prev.length - 1].text + chunk }]);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") fail("Se interrumpió la respuesta.");
    } finally {
      setAsking(false);
    }
  }, [asking]);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  // En modo búsqueda, la última fila siempre es «Preguntar a la IA».
  const askIndex = results.length;
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (mode === "ask") {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(query); }
      return;
    }
    const lastIndex = query.trim() ? askIndex : results.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, lastIndex));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      if (selectedIndex === askIndex && query.trim()) void ask(query);
      else if (results[selectedIndex]) navigate(results[selectedIndex].href);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[18vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-brand-obsidian/35" />

      <div
        className="relative w-full max-w-[560px] mx-4 bg-surface-elevated rounded-surface shadow-md overflow-hidden border border-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <HugeiconsIcon icon={mode === "ask" ? AiMagicIcon : Search01Icon} size={18} aria-hidden="true" className="shrink-0 text-text-secondary-strong" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === "ask" ? "Pregunta algo sobre tu CRM…" : "Buscar secciones, contactos, empresas, docs…"}
            aria-label={mode === "ask" ? "Preguntar a la IA" : "Buscar"}
            className="min-w-0 flex-1 border-none bg-transparent text-base text-text-primary outline-none! placeholder:text-text-secondary focus:outline-none! focus-visible:outline-none! focus-visible:ring-0"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Borrar búsqueda"
              className="flex size-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-nav-hover hover:text-text-primary"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} />
            </button>
          )}
          <kbd className="shrink-0 rounded-control border border-line px-1.5 py-0.5 font-mono text-xs text-text-secondary">
            ESC
          </kbd>
        </div>

        <div role="tablist" aria-label="Modo" className="flex items-center gap-1 border-b border-line px-4 py-2">
          {([
            ["search", "Buscar"],
            ["ask", "Preguntar a la IA"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              onClick={() => { setMode(key); inputRef.current?.focus(); }}
              className={`min-h-9 rounded-full border px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                mode === key ? "border-line bg-nav-active font-semibold text-[var(--nav-active-ink)]" : "border-transparent font-medium text-text-secondary-strong hover:bg-nav-hover"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "search" && results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-1.5">
            {results.map((r, i) => {
              const Icon = RESULT_ICONS[r.type];
              const isSelected = i === selectedIndex;
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => navigate(r.href)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isSelected ? "bg-nav-hover" : "hover:bg-nav-hover"
                  }`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-nav-active text-[var(--nav-active-ink)]">
                    <HugeiconsIcon icon={Icon} size={15} aria-hidden="true" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{r.title}</p>
                    {r.subtitle && (
                      <p className="text-xs text-text-secondary truncate">{r.subtitle}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-text-secondary">
                    {RESULT_LABELS[r.type]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {mode === "search" && query.trim() && (
          <button
            type="button"
            onClick={() => void ask(query)}
            onMouseEnter={() => setSelectedIndex(askIndex)}
            className={`flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-left ${selectedIndex === askIndex ? "bg-nav-hover" : "hover:bg-nav-hover"}`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-obsidian text-white">
              <HugeiconsIcon icon={AiMagicIcon} size={15} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">Preguntar a la IA: &ldquo;{query}&rdquo;</span>
          </button>
        )}

        {mode === "ask" && (
          <div className="max-h-96 min-h-32 overflow-y-auto px-5 py-4" aria-live="polite">
            {thread.length === 0 ? (
              <p className="text-sm text-text-secondary">Haz una consulta sobre tus contactos, ventas, tareas o citas. Escribe y pulsa Enter.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {thread.map((message, index) => (
                  <div key={index} className={message.role === "user" ? "flex justify-end" : "flex"}>
                    <p
                      className={`max-w-[90%] whitespace-pre-wrap rounded-surface px-3.5 py-2 text-sm ${
                        message.role === "user" ? "border border-line bg-nav-active text-text-primary" : "text-text-primary"
                      }`}
                    >
                      {message.text || (asking && index === thread.length - 1 ? "Pensando…" : "")}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {conversationId && (
              <Link href={`/assistant/${conversationId}`} onClick={onClose} className="mt-4 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-action-primary hover:underline">
                Abrir en el chat <HugeiconsIcon icon={ArrowUpRight01Icon} size={12} aria-hidden="true" />
              </Link>
            )}
          </div>
        )}

        {mode === "search" && query && !loading && results.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-text-secondary">
            Sin resultados para &ldquo;{query}&rdquo;
          </div>
        )}

        {mode === "search" && !query && (
          <div className="px-5 py-5 text-xs text-text-secondary leading-relaxed">
            Busca secciones, contactos, empresas, ventas, docs (título y contenido markdown), clientes, tareas y más.
          </div>
        )}

        <div className="flex items-center gap-4 border-t border-line px-5 py-2.5">
          <span className="text-xs text-text-secondary">
            <kbd className="font-mono rounded-control border border-line px-1">↑↓</kbd> navegar
          </span>
          <span className="text-xs text-text-secondary">
            <kbd className="font-mono rounded-control border border-line px-1">↵</kbd> {mode === "ask" ? "enviar" : "abrir"}
          </span>
          <span className="text-xs text-text-secondary">
            <kbd className="font-mono rounded-control border border-line px-1">esc</kbd> cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
