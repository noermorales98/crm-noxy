"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Code, FileCode2,
  Link2, Image, Table, Minus, Eye, Edit2, Columns2,
  Save, ChevronLeft, SmilePlus, Globe, Lock,
} from "lucide-react";
import Link from "next/link";

// ─── Emoji picker ─────────────────────────────────────────────────────────────

const EMOJIS = [
  "📝","📄","📋","📊","📈","📉","💡","⚡","🎯","🚀",
  "🔑","🔒","🔓","👤","👥","🤝","💼","🏢","🏗️","🏭",
  "📅","📆","🗓️","⏰","⏱️","📌","🗂️","🗃️","📂","📁",
  "✅","❌","⚠️","🔴","🟡","🟢","🔵","💰","💵","💳",
  "📦","🎁","🏆","🌟","⭐","✨","🎨","🔧","⚙️","🛠️",
  "🔬","🧪","🧰","📡","💻","🖥️","📱","🎭","📚","🗺️",
];

// ─── Markdown renderer styles ─────────────────────────────────────────────────

const mdComponents: Record<string, any> = {
  h1: (p: any) => <h1 className="text-3xl font-bold mb-4 mt-7 text-gray-900 border-b border-gray-100 pb-2" {...p} />,
  h2: (p: any) => <h2 className="text-2xl font-bold mb-3 mt-6 text-gray-900" {...p} />,
  h3: (p: any) => <h3 className="text-xl font-semibold mb-2 mt-5 text-gray-800" {...p} />,
  h4: (p: any) => <h4 className="text-lg font-semibold mb-2 mt-4 text-gray-800" {...p} />,
  p: (p: any) => <p className="mb-3 leading-7 text-gray-700" {...p} />,
  strong: (p: any) => <strong className="font-bold text-gray-900" {...p} />,
  em: (p: any) => <em className="italic text-gray-700" {...p} />,
  del: (p: any) => <del className="line-through text-gray-400" {...p} />,
  code: ({ inline, children, ...p }: any) =>
    inline ? (
      <code className="font-mono text-sm bg-gray-100 text-rose-600 px-1.5 py-0.5 rounded" {...p}>{children}</code>
    ) : (
      <code className="block" {...p}>{children}</code>
    ),
  pre: (p: any) => <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl mb-4 overflow-x-auto text-sm font-mono leading-relaxed" {...p} />,
  blockquote: (p: any) => <blockquote className="border-l-4 border-blue-300 bg-blue-50 pl-4 pr-3 py-2 text-gray-600 italic mb-4 rounded-r-lg" {...p} />,
  ul: (p: any) => <ul className="list-disc ml-5 mb-4 space-y-1 text-gray-700" {...p} />,
  ol: (p: any) => <ol className="list-decimal ml-5 mb-4 space-y-1 text-gray-700" {...p} />,
  li: (p: any) => <li className="leading-7" {...p} />,
  table: (p: any) => <div className="overflow-x-auto mb-4 rounded-xl border border-gray-200"><table className="w-full border-collapse" {...p} /></div>,
  thead: (p: any) => <thead className="bg-gray-50" {...p} />,
  tbody: (p: any) => <tbody {...p} />,
  tr: (p: any) => <tr className="border-b border-gray-200 last:border-0" {...p} />,
  th: (p: any) => <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide" {...p} />,
  td: (p: any) => <td className="px-4 py-2.5 text-sm text-gray-700" {...p} />,
  hr: () => <hr className="border-t-2 border-gray-100 my-6" />,
  a: ({ href, children, ...p }: any) => (
    <a href={href} className="text-blue-600 hover:text-blue-800 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...p}>{children}</a>
  ),
  img: ({ src, alt, ...p }: any) => (
    <img src={src} alt={alt} className="rounded-xl max-w-full my-4 shadow-sm border border-gray-100" {...p} />
  ),
};

// ─── Toolbar action helper ────────────────────────────────────────────────────

function insertFormat(
  textarea: HTMLTextAreaElement,
  setValue: (v: string) => void,
  wrap?: { before: string; after?: string },
  line?: string,
  block?: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);

  let newValue = value;
  let newStart = start;
  let newEnd = end;

  if (wrap) {
    const { before, after = before } = wrap;
    newValue = value.slice(0, start) + before + selected + after + value.slice(end);
    newStart = start + before.length;
    newEnd = newStart + selected.length;
  } else if (line) {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineContent = value.slice(lineStart, end);
    newValue = value.slice(0, lineStart) + line + lineContent + value.slice(end);
    newStart = newEnd = start + line.length;
  } else if (block) {
    const prefix = start > 0 ? "\n" : "";
    const suffix = end < value.length ? "\n" : "";
    newValue = value.slice(0, start) + prefix + block + suffix + value.slice(end);
    newStart = newEnd = start + prefix.length + block.length;
  }

  setValue(newValue);
  requestAnimationFrame(() => {
    textarea.selectionStart = newStart;
    textarea.selectionEnd = newEnd;
    textarea.focus();
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface KbEditorProps {
  pageId: string;
  initialTitle: string;
  initialEmoji: string | null;
  initialContent: string;
  initialPublished: boolean;
  breadcrumbs: Array<{ id: string; title: string; emoji: string | null }>;
  onSaved?: () => void;
}

type ViewMode = "edit" | "split" | "preview";

// ─── Component ────────────────────────────────────────────────────────────────

export default function KbEditor({
  pageId,
  initialTitle,
  initialEmoji,
  initialContent,
  initialPublished,
  breadcrumbs,
  onSaved,
}: KbEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [emoji, setEmoji] = useState(initialEmoji || "");
  const [content, setContent] = useState(initialContent);
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [mode, setMode] = useState<ViewMode>("split");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef({ title, emoji, content, isPublished });

  // ── Auto-save ───────────────────────────────────────────────────────────────
  const save = useCallback(
    async (data: { title: string; emoji: string; content: string; isPublished: boolean }) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/kb/${pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            emoji: data.emoji || null,
            content: data.content,
            isPublished: data.isPublished,
          }),
        });
        if (res.ok) {
          setSaveStatus("saved");
          lastSavedRef.current = data;
          onSaved?.();
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    },
    [pageId, onSaved]
  );

  const scheduleSave = useCallback(
    (data: { title: string; emoji: string; content: string; isPublished: boolean }) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus("saving");
      saveTimerRef.current = setTimeout(() => save(data), 1200);
    },
    [save]
  );

  useEffect(() => {
    scheduleSave({ title, emoji, content, isPublished });
  }, [title, emoji, content, isPublished]); // eslint-disable-line

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        save({ title, emoji, content, isPublished });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [title, emoji, content, isPublished, save]);

  // ── Toolbar actions ─────────────────────────────────────────────────────────
  const fmt = (wrap?: { before: string; after?: string }, line?: string, block?: string) => {
    if (textareaRef.current) {
      insertFormat(textareaRef.current, setContent, wrap, line, block);
    }
  };

  // ── Keyboard shortcuts in textarea ──────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); fmt({ before: "**", after: "**" }); }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); fmt({ before: "*", after: "*" }); }
    if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); fmt({ before: "[", after: "](url)" }); }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = ta.value.slice(0, start) + "  " + ta.value.slice(end);
      setContent(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
    }
  };

  const toolbarBtn = (
    icon: React.ReactNode,
    title: string,
    action: () => void
  ) => (
    <button
      type="button"
      title={title}
      onClick={action}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 shrink-0 gap-4">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-xs text-gray-400 min-w-0 overflow-hidden">
          <Link href="/kb" className="hover:text-gray-700 shrink-0 transition-colors">KB</Link>
          {breadcrumbs.map((bc) => (
            <span key={bc.id} className="flex items-center gap-1 min-w-0">
              <ChevronLeft size={10} className="rotate-180 shrink-0" />
              <Link href={`/kb/${bc.id}`} className="hover:text-gray-700 truncate transition-colors">
                {bc.emoji ? `${bc.emoji} ` : ""}{bc.title}
              </Link>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Published toggle */}
          <button
            onClick={() => setIsPublished((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              isPublished
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}
          >
            {isPublished ? <Globe size={12} /> : <Lock size={12} />}
            {isPublished ? "Publicado" : "Borrador"}
          </button>

          {/* Save status */}
          <div className={`text-xs font-medium transition-all px-2 py-1 rounded-lg ${
            saveStatus === "saving" ? "text-amber-600 bg-amber-50" :
            saveStatus === "saved"  ? "text-green-600 bg-green-50" :
            saveStatus === "error"  ? "text-red-600 bg-red-50" :
            "text-transparent"
          }`}>
            {saveStatus === "saving" ? "Guardando..." : saveStatus === "saved" ? "✓ Guardado" : saveStatus === "error" ? "Error al guardar" : "·"}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {(["edit", "split", "preview"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                title={m === "edit" ? "Solo editar" : m === "split" ? "Vista dividida" : "Solo previsualizar"}
                className={`flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
                  mode === m ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {m === "edit" ? <Edit2 size={12} /> : m === "split" ? <Columns2 size={12} /> : <Eye size={12} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Page header (emoji + title) ──────────────────────────────────────── */}
      <div className="px-10 pt-8 pb-2 shrink-0">
        {/* Emoji */}
        <div className="relative inline-block mb-3">
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="text-5xl hover:opacity-70 transition-opacity leading-none"
            title="Cambiar ícono"
          >
            {emoji || "📄"}
          </button>
          {showEmojiPicker && (
            <div className="absolute top-14 left-0 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 w-72">
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => { setEmoji(""); setShowEmojiPicker(false); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 text-xs"
                >
                  <SmilePlus size={14} />
                </button>
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-xl transition-colors"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sin título"
          className="w-full text-4xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-200 leading-tight resize-none"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); textareaRef.current?.focus(); } }}
        />
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      {mode !== "preview" && (
        <div className="px-10 py-1.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-0.5 flex-wrap">
            {toolbarBtn(<Heading1 size={13} />, "Título 1 (H1)", () => fmt(undefined, "# "))}
            {toolbarBtn(<Heading2 size={13} />, "Título 2 (H2)", () => fmt(undefined, "## "))}
            {toolbarBtn(<Heading3 size={13} />, "Título 3 (H3)", () => fmt(undefined, "### "))}
            <div className="w-px h-4 bg-gray-200 mx-1" />
            {toolbarBtn(<Bold size={13} />, "Negrita (Ctrl+B)", () => fmt({ before: "**" }))}
            {toolbarBtn(<Italic size={13} />, "Cursiva (Ctrl+I)", () => fmt({ before: "*" }))}
            {toolbarBtn(<Strikethrough size={13} />, "Tachado", () => fmt({ before: "~~" }))}
            <div className="w-px h-4 bg-gray-200 mx-1" />
            {toolbarBtn(<Code size={13} />, "Código inline", () => fmt({ before: "`" }))}
            {toolbarBtn(<FileCode2 size={13} />, "Bloque de código", () => fmt(undefined, undefined, "```\n\n```"))}
            {toolbarBtn(<Quote size={13} />, "Cita", () => fmt(undefined, "> "))}
            <div className="w-px h-4 bg-gray-200 mx-1" />
            {toolbarBtn(<List size={13} />, "Lista con viñetas", () => fmt(undefined, "- "))}
            {toolbarBtn(<ListOrdered size={13} />, "Lista numerada", () => fmt(undefined, "1. "))}
            {toolbarBtn(<ListChecks size={13} />, "Lista de tareas", () => fmt(undefined, "- [ ] "))}
            <div className="w-px h-4 bg-gray-200 mx-1" />
            {toolbarBtn(<Link2 size={13} />, "Enlace (Ctrl+K)", () => fmt({ before: "[", after: "](url)" }))}
            {toolbarBtn(<Image size={13} />, "Imagen", () => fmt({ before: "![alt](", after: ")" }))}
            {toolbarBtn(<Table size={13} />, "Tabla", () => fmt(undefined, undefined, "| Columna 1 | Columna 2 | Columna 3 |\n|-----------|-----------|----------|\n| Celda 1   | Celda 2   | Celda 3  |"))}
            {toolbarBtn(<Minus size={13} />, "Separador", () => fmt(undefined, undefined, "---"))}
          </div>
        </div>
      )}

      {/* ── Editor / Preview panes ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Editor pane */}
        {(mode === "edit" || mode === "split") && (
          <div className={`flex flex-col overflow-hidden ${mode === "split" ? "w-1/2 border-r border-gray-100" : "w-full"}`}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Escribe tu contenido aquí...\n\nPuedes usar Markdown:\n# Título 1\n## Título 2\n**negrita** *cursiva*\n- lista\n1. numerada\n> cita\n\`código\``}
              className="flex-1 w-full resize-none border-none outline-none font-mono text-sm text-gray-700 leading-7 px-10 py-4 bg-white placeholder:text-gray-300 overflow-y-auto"
              spellCheck={false}
            />
            {/* Word count */}
            <div className="px-10 py-1.5 border-t border-gray-50 text-xs text-gray-300 shrink-0">
              {content.split(/\s+/).filter(Boolean).length} palabras · {content.length} caracteres
            </div>
          </div>
        )}

        {/* Preview pane */}
        {(mode === "preview" || mode === "split") && (
          <div className={`overflow-y-auto ${mode === "split" ? "w-1/2" : "w-full"}`}>
            <div className="px-10 py-4 max-w-3xl mx-auto">
              {content.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {content}
                </ReactMarkdown>
              ) : (
                <p className="text-gray-300 text-sm italic">El contenido aparecerá aquí...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
