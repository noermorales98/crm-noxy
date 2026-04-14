"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HugeiconsIcon } from "@hugeicons/react";
import * as HugeIconsAll from "@hugeicons/core-free-icons";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Code, FileCode2,
  Link2, Image, Table, Minus, Eye, Edit2, Globe,
  Lock, ChevronLeft, SmilePlus, Hash,
} from "lucide-react";
import Link from "next/link";
import KbRelationsInline, { type KbRelation } from "@/src/components/kb/KbRelationsInline";

// ─── Icon utilities ───────────────────────────────────────────────────────────

// Resolves "icon:Home01" → HugeIcon component, or emoji string → string
function resolveEmoji(value: string) {
  if (value.startsWith("icon:")) return { type: "hugeicon" as const, name: value.slice(5) };
  return { type: "emoji" as const, char: value };
}

function HugeIconByName({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  const key = `${name}Icon` as keyof typeof HugeIconsAll;
  const icon = (HugeIconsAll as any)[key];
  if (!icon) return <span className="text-xs text-red-400 font-mono">[{name}?]</span>;
  return <HugeiconsIcon icon={icon} size={size} color={color} />;
}

// Inline icon in markdown: `icon:Home01`
function InlineMdIcon({ name }: { name: string }) {
  const key = `${name}Icon` as keyof typeof HugeIconsAll;
  const icon = (HugeIconsAll as any)[key];
  if (!icon) return <span className="inline-flex items-center gap-0.5 bg-red-50 text-red-400 rounded px-1 font-mono text-xs">[{name}]</span>;
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 align-middle mx-0.5 relative top-[-1px]">
      <HugeiconsIcon icon={icon} size={16} />
    </span>
  );
}

// ─── Emoji / Icon picker ──────────────────────────────────────────────────────

const EMOJIS = [
  "📝","📄","📋","📊","📈","📉","💡","⚡","🎯","🚀","🔑","🔒","🔓",
  "👤","👥","🤝","💼","🏢","📅","📆","⏰","📌","🗂️","📂","📁",
  "✅","❌","⚠️","💰","💵","📦","🎁","🏆","🌟","⭐","✨","🎨",
  "🔧","⚙️","🛠️","🔬","🧪","💻","📱","📚","🗺️","🎭","📡","🏗️",
];

const HUGICON_SHORTCUTS: { name: string; icon: string }[] = [
  { name: "Home01", icon: "Home01Icon" },
  { name: "Building04", icon: "Building04Icon" },
  { name: "UserMultiple", icon: "UserMultipleIcon" },
  { name: "Task01", icon: "Task01Icon" },
  { name: "Calendar01", icon: "Calendar01Icon" },
  { name: "BarChart", icon: "BarChartIcon" },
  { name: "Book01", icon: "Book01Icon" },
  { name: "Folder01", icon: "Folder01Icon" },
  { name: "File01", icon: "File01Icon" },
  { name: "Mail01", icon: "Mail01Icon" },
  { name: "Inbox", icon: "InboxIcon" },
  { name: "Browser", icon: "BrowserIcon" },
  { name: "Globe", icon: "GlobeIcon" },
  { name: "Analytics01", icon: "Analytics01Icon" },
  { name: "FolderKanban", icon: "FolderKanbanIcon" },
  { name: "Zap", icon: "ZapIcon" },
];

function PageIconPicker({ current, onSelect, onClose }: { current: string; onSelect: (v: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", h), 50);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-72">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Emojis</p>
      <div className="flex flex-wrap gap-1 mb-3">
        <button onClick={() => { onSelect(""); onClose(); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 text-sm" title="Sin icono">
          <SmilePlus size={14} />
        </button>
        {EMOJIS.map(e => (
          <button key={e} onClick={() => { onSelect(e); onClose(); }} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xl hover:bg-gray-100 transition-colors ${current === e ? "bg-blue-50 ring-1 ring-blue-300" : ""}`}>{e}</button>
        ))}
      </div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Iconos HugeIcons</p>
      <div className="flex flex-wrap gap-1">
        {HUGICON_SHORTCUTS.map(({ name, icon }) => {
          const iconKey = icon as keyof typeof HugeIconsAll;
          const ic = (HugeIconsAll as any)[iconKey];
          if (!ic) return null;
          const val = `icon:${name}`;
          return (
            <button
              key={name}
              onClick={() => { onSelect(val); onClose(); }}
              title={name}
              className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors ${current === val ? "bg-blue-50 ring-1 ring-blue-300" : ""}`}
            >
              <HugeiconsIcon icon={ic} size={16} color="#374151" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Icon picker for inserting in markdown ────────────────────────────────────

function MarkdownIconPicker({ onInsert, onClose }: { onInsert: (syntax: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", h), 50);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const filtered = HUGICON_SHORTCUTS.filter(({ name }) => !q || name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 w-60">
      <p className="text-xs text-gray-500 mb-2 font-medium">Insertar ícono HugeIcon</p>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar icono..." className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-gray-300 mb-2 transition-all" />
      <p className="text-[10px] text-gray-400 mb-1.5">Sintaxis: <code className="bg-gray-100 px-1 rounded">&#96;icon:Nombre&#96;</code></p>
      <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
        {filtered.map(({ name, icon }) => {
          const ic = (HugeIconsAll as any)[`${icon}` as keyof typeof HugeIconsAll];
          if (!ic) return null;
          return (
            <button key={name} onClick={() => { onInsert(`\`icon:${name}\``); onClose(); }}
              title={name} className="w-9 h-9 flex flex-col items-center justify-center rounded-lg hover:bg-gray-100 transition-colors gap-0.5">
              <HugeiconsIcon icon={ic} size={15} color="#374151" />
              <span className="text-[8px] text-gray-400 leading-none truncate w-full text-center px-0.5">{name.replace(/\d+$/, "")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Markdown renderer components ────────────────────────────────────────────

const mdComponents: Record<string, any> = {
  h1: (p: any) => <h1 className="text-3xl font-bold mb-4 mt-7 text-gray-900 border-b border-gray-100 pb-2" {...p} />,
  h2: (p: any) => <h2 className="text-2xl font-bold mb-3 mt-6 text-gray-900" {...p} />,
  h3: (p: any) => <h3 className="text-xl font-semibold mb-2 mt-5 text-gray-800" {...p} />,
  h4: (p: any) => <h4 className="text-lg font-semibold mb-2 mt-4 text-gray-700" {...p} />,
  p:  (p: any) => <p className="mb-3 leading-7 text-gray-700" {...p} />,
  strong: (p: any) => <strong className="font-bold text-gray-900" {...p} />,
  em: (p: any) => <em className="italic text-gray-700" {...p} />,
  del: (p: any) => <del className="line-through text-gray-400" {...p} />,
  code: ({ inline, children, ...p }: any) => {
    const text = String(children).trim();
    if (inline && text.startsWith("icon:")) return <InlineMdIcon name={text.slice(5)} />;
    return inline
      ? <code className="font-mono text-sm bg-gray-100 text-rose-600 px-1.5 py-0.5 rounded" {...p}>{children}</code>
      : <code className="block" {...p}>{children}</code>;
  },
  pre: (p: any) => <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl mb-4 overflow-x-auto text-sm font-mono leading-relaxed" {...p} />,
  blockquote: (p: any) => <blockquote className="border-l-4 border-blue-300 bg-blue-50 pl-4 pr-3 py-2 text-gray-600 italic mb-4 rounded-r-lg" {...p} />,
  ul: (p: any) => <ul className="list-disc ml-5 mb-4 space-y-1 text-gray-700" {...p} />,
  ol: (p: any) => <ol className="list-decimal ml-5 mb-4 space-y-1 text-gray-700" {...p} />,
  li: (p: any) => <li className="leading-7" {...p} />,
  table: (p: any) => <div className="overflow-x-auto mb-4 rounded-xl border border-gray-200"><table className="w-full border-collapse" {...p} /></div>,
  thead: (p: any) => <thead className="bg-gray-50" {...p} />,
  tr: (p: any) => <tr className="border-b border-gray-200 last:border-0" {...p} />,
  th: (p: any) => <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide" {...p} />,
  td: (p: any) => <td className="px-4 py-2.5 text-sm text-gray-700" {...p} />,
  hr: () => <hr className="border-t-2 border-gray-100 my-6" />,
  a: ({ href, children, ...p }: any) => <a href={href} className="text-blue-600 hover:text-blue-800 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...p}>{children}</a>,
  img: ({ src, alt, ...p }: any) => <img src={src} alt={alt} className="rounded-xl max-w-full my-4 shadow-sm border border-gray-100" {...p} />,
};

// ─── Toolbar insert helper ────────────────────────────────────────────────────

function insertFormat(
  ta: HTMLTextAreaElement,
  setValue: (v: string) => void,
  wrap?: { before: string; after?: string },
  line?: string,
  block?: string
) {
  const s = ta.selectionStart, e = ta.selectionEnd;
  const val = ta.value, sel = val.slice(s, e);
  let nv = val, ns = s, ne = e;

  if (wrap) {
    const { before, after = before } = wrap;
    nv = val.slice(0, s) + before + sel + after + val.slice(e);
    ns = s + before.length; ne = ns + sel.length;
  } else if (line) {
    const ls = val.lastIndexOf("\n", s - 1) + 1;
    nv = val.slice(0, ls) + line + val.slice(ls);
    ns = ne = s + line.length;
  } else if (block) {
    const pre = s > 0 ? "\n" : "", suf = e < val.length ? "\n" : "";
    nv = val.slice(0, s) + pre + block + suf + val.slice(e);
    ns = ne = s + pre.length + block.length;
  }

  setValue(nv);
  requestAnimationFrame(() => { ta.selectionStart = ns; ta.selectionEnd = ne; ta.focus(); });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface KbEditorProps {
  pageId: string;
  initialTitle: string;
  initialEmoji: string | null;
  initialContent: string;
  initialPublished: boolean;
  initialRelations: KbRelation[];
  breadcrumbs: Array<{ id: string; title: string; emoji: string | null }>;
  isFolder?: boolean;
}

type ViewMode = "edit" | "preview";

// ─── Component ────────────────────────────────────────────────────────────────

export default function KbEditor({
  pageId, initialTitle, initialEmoji, initialContent,
  initialPublished, initialRelations, breadcrumbs, isFolder = false,
}: KbEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [emoji, setEmoji] = useState(initialEmoji || "");
  const [content, setContent] = useState(initialContent);
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [mode, setMode] = useState<ViewMode>("preview");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showMdIconPicker, setShowMdIconPicker] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-save ───────────────────────────────────────────────────────────────
  const save = useCallback(async (data: { title: string; emoji: string; content: string; isPublished: boolean }) => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/kb/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.title, emoji: data.emoji || null, content: data.content, isPublished: data.isPublished }),
      });
      setSaveStatus(res.ok ? "saved" : "error");
      if (res.ok) setTimeout(() => setSaveStatus("idle"), 2000);
    } catch { setSaveStatus("error"); }
  }, [pageId]);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(() => save({ title, emoji, content, isPublished }), 1200);
  }, [title, emoji, content, isPublished]); // eslint-disable-line

  // Ctrl+S
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (saveTimer.current) clearTimeout(saveTimer.current);
        save({ title, emoji, content, isPublished });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [title, emoji, content, isPublished, save]);

  const fmt = (wrap?: { before: string; after?: string }, line?: string, block?: string) => {
    if (taRef.current) insertFormat(taRef.current, setContent, wrap, line, block);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); fmt({ before: "**" }); }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); fmt({ before: "*" }); }
    if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); fmt({ before: "[", after: "](url)" }); }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const nv = ta.value.slice(0, ta.selectionStart) + "  " + ta.value.slice(ta.selectionEnd);
      setContent(nv);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = ta.selectionStart + 2; });
    }
  };

  const toolBtn = (icon: React.ReactNode, title: string, action: () => void) => (
    <button type="button" title={title} onClick={action}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
      {icon}
    </button>
  );

  // Render the page icon
  const iconData = emoji ? resolveEmoji(emoji) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-gray-100 shrink-0 gap-4">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-xs text-gray-400 min-w-0">
          <Link href="/kb" className="hover:text-gray-700 shrink-0">KB</Link>
          {breadcrumbs.map(bc => (
            <span key={bc.id} className="flex items-center gap-1 min-w-0">
              <ChevronLeft size={10} className="rotate-180 shrink-0" />
              <Link href={`/kb/${bc.id}`} className="hover:text-gray-700 truncate">
                {bc.emoji?.startsWith("icon:") ? "" : bc.emoji || ""}{bc.title}
              </Link>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Published toggle */}
          <button onClick={() => setIsPublished(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isPublished ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
            {isPublished ? <Globe size={12} /> : <Lock size={12} />}
            {isPublished ? "Publicado" : "Borrador"}
          </button>

          {/* Save indicator */}
          <div className={`text-xs font-medium px-2 py-1 rounded-lg transition-all ${
            saveStatus === "saving" ? "text-amber-600 bg-amber-50" :
            saveStatus === "saved"  ? "text-green-600 bg-green-50" :
            saveStatus === "error"  ? "text-red-600 bg-red-50" : "text-transparent"}`}>
            {saveStatus === "saving" ? "Guardando..." : saveStatus === "saved" ? "✓ Guardado" : saveStatus === "error" ? "Error" : "·"}
          </div>

          {/* View mode */}
          {!isFolder && (
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {(["edit", "preview"] as ViewMode[]).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  title={m === "edit" ? "Editar" : "Vista previa"}
                  className={`flex items-center justify-center w-6 h-6 rounded-md transition-colors ${mode === m ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>
                  {m === "edit" ? <Edit2 size={12} /> : <Eye size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Page header: icon + title + relations ────────────────────────────── */}
      <div className="pt-8 pb-0 shrink-0" style={{ paddingLeft: "max(40px, calc((100% - 740px) / 2))", paddingRight: "max(40px, calc((100% - 740px) / 2))" }}>
        {/* Icon */}
        <div className="relative inline-block mb-3">
          <button onClick={() => setShowIconPicker(v => !v)} className="hover:opacity-70 transition-opacity" title="Cambiar ícono">
            {!emoji ? (
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-gray-300 transition-colors">
                <SmilePlus size={20} />
              </div>
            ) : iconData?.type === "hugeicon" ? (
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
                <HugeIconByName name={iconData.name} size={28} color="#374151" />
              </div>
            ) : (
              <span className="text-5xl leading-none">{emoji}</span>
            )}
          </button>
          {showIconPicker && (
            <PageIconPicker current={emoji} onSelect={setEmoji} onClose={() => setShowIconPicker(false)} />
          )}
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Sin título"
          className="w-full text-4xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-200 leading-tight mb-3"
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); taRef.current?.focus(); } }}
        />

        {/* Relations inline */}
        <div className="mb-4">
          <KbRelationsInline pageId={pageId} initialRelations={initialRelations} />
        </div>

        {/* Divider */}
        <div className="border-b border-gray-100 mb-0" />
      </div>

      {/* ── Folder view ─────────────────────────────────────────────────────── */}
      {isFolder ? (
        <div className="flex-1 overflow-y-auto py-6" style={{ paddingLeft: "max(40px, calc((100% - 740px) / 2))", paddingRight: "max(40px, calc((100% - 740px) / 2))" }}>
          <p className="text-sm text-gray-400 italic">Esta es una carpeta. Usa el árbol de la izquierda para agregar páginas dentro de ella.</p>
        </div>
      ) : (
        <>
          {/* ── Toolbar ─────────────────────────────────────────────────────── */}
          {mode !== "preview" && (
            <div className="py-1.5 border-b border-gray-100 shrink-0" style={{ paddingLeft: "max(40px, calc((100% - 740px) / 2))", paddingRight: "max(40px, calc((100% - 740px) / 2))" }}>
              <div className="flex items-center gap-0.5 flex-wrap">
                {toolBtn(<Heading1 size={13} />, "H1", () => fmt(undefined, "# "))}
                {toolBtn(<Heading2 size={13} />, "H2", () => fmt(undefined, "## "))}
                {toolBtn(<Heading3 size={13} />, "H3", () => fmt(undefined, "### "))}
                <div className="w-px h-4 bg-gray-200 mx-1" />
                {toolBtn(<Bold size={13} />, "Negrita Ctrl+B", () => fmt({ before: "**" }))}
                {toolBtn(<Italic size={13} />, "Cursiva Ctrl+I", () => fmt({ before: "*" }))}
                {toolBtn(<Strikethrough size={13} />, "Tachado", () => fmt({ before: "~~" }))}
                <div className="w-px h-4 bg-gray-200 mx-1" />
                {toolBtn(<Code size={13} />, "Código inline", () => fmt({ before: "`" }))}
                {toolBtn(<FileCode2 size={13} />, "Bloque código", () => fmt(undefined, undefined, "```\n\n```"))}
                {toolBtn(<Quote size={13} />, "Cita", () => fmt(undefined, "> "))}
                <div className="w-px h-4 bg-gray-200 mx-1" />
                {toolBtn(<List size={13} />, "Lista", () => fmt(undefined, "- "))}
                {toolBtn(<ListOrdered size={13} />, "Lista numerada", () => fmt(undefined, "1. "))}
                {toolBtn(<ListChecks size={13} />, "Lista de tareas", () => fmt(undefined, "- [ ] "))}
                <div className="w-px h-4 bg-gray-200 mx-1" />
                {toolBtn(<Link2 size={13} />, "Enlace Ctrl+K", () => fmt({ before: "[", after: "](url)" }))}
                {toolBtn(<Image size={13} />, "Imagen", () => fmt({ before: "![alt](", after: ")" }))}
                {toolBtn(<Table size={13} />, "Tabla", () => fmt(undefined, undefined, "| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n| A     | B     | C     |"))}
                {toolBtn(<Minus size={13} />, "Separador", () => fmt(undefined, undefined, "---"))}
                <div className="w-px h-4 bg-gray-200 mx-1" />
                {/* Icon insert button */}
                <div className="relative">
                  <button
                    type="button"
                    title="Insertar ícono HugeIcons"
                    onClick={() => setShowMdIconPicker(v => !v)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <Hash size={13} />
                  </button>
                  {showMdIconPicker && (
                    <MarkdownIconPicker
                      onInsert={syntax => {
                        if (taRef.current) insertFormat(taRef.current, setContent, { before: syntax, after: "" });
                      }}
                      onClose={() => setShowMdIconPicker(false)}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Edit / Preview panes ─────────────────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden">
            {mode === "edit" && (
              <div className="flex flex-col overflow-hidden w-full">
                <textarea
                  ref={taRef}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Escribe en Markdown...\n\n# Título\n**negrita** *cursiva*\n- lista\n\`icon:Home01\` ← inserta un ícono`}
                  className="flex-1 w-full resize-none border-none outline-none font-mono text-sm text-gray-700 leading-7 py-4 bg-white placeholder:text-gray-300 overflow-y-auto"
                  style={{ paddingLeft: "max(40px, calc((100% - 740px) / 2))", paddingRight: "max(40px, calc((100% - 740px) / 2))" }}
                  spellCheck={false}
                />
                <div
                  className="py-1.5 border-t border-gray-50 text-xs text-gray-300 shrink-0"
                  style={{ paddingLeft: "max(40px, calc((100% - 740px) / 2))", paddingRight: "max(40px, calc((100% - 740px) / 2))" }}
                >
                  {content.split(/\s+/).filter(Boolean).length} palabras · {content.length} chars
                </div>
              </div>
            )}

            {mode === "preview" && (
              <div className="overflow-y-auto w-full">
                <div
                  className="py-6"
                  style={{ paddingLeft: "max(40px, calc((100% - 740px) / 2))", paddingRight: "max(40px, calc((100% - 740px) / 2))" }}
                >
                  {content.trim() ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{content}</ReactMarkdown>
                  ) : (
                    <p className="text-gray-300 text-sm italic">El contenido aparecerá aquí...</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
