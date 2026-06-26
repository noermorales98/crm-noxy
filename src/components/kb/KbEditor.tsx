"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback, forwardRef, useImperativeHandle } from "react";

export type KbEditorHandle = {
  insertAtEnd: (text: string) => void;
  setContent: (text: string) => void;
};
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Code, FileCode2,
  Link2, Image, Table, Minus, Hash,
} from "lucide-react";
import KbRelationsInline, { type KbRelation } from "@/src/components/kb/KbRelationsInline";
import KbEditorNavbar, { type KbBreadcrumb } from "@/src/components/kb/KbEditorNavbar";
import KbIconPicker from "@/src/components/kb/KbIconPicker";
import PageIcon from "@/src/components/kb/PageIcon";
import KbFolderView, { type KbTreeNodeDto } from "@/src/components/kb/KbFolderView";
import KbMarkdown from "@/src/components/kb/KbMarkdown";
import { getHugeIconComponent, searchHugeIcons } from "@/src/lib/kb-icons";
import type { KbFolderStats } from "@/src/lib/kb-folder-stats";
import type { KbIconSelection } from "@/src/lib/kb-icons";
import {
  DEFAULT_MARKDOWN_THEME,
  getMarkdownTheme,
  type KbMarkdownThemeId,
} from "@/src/lib/kb-markdown-themes";
import KbPdfExportConfirmModal from "@/src/components/kb/KbPdfExportConfirmModal";
import { renderPagesToPdf } from "@/src/lib/kb-pdf-export";
import { slugifyPdfFilename } from "@/src/lib/kb-pdf-tree";
import { useOptionalKbContext } from "@/src/context/KbContext";
import { useToast } from "@/src/context/ToastContext";
import KbSuggestionsReviewSidebar from "@/src/components/kb/KbSuggestionsReviewSidebar";

function MarkdownIconPicker({ onInsert, onClose }: { onInsert: (syntax: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", h), 50);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const filtered = searchHugeIcons(q, 48, 0);

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 z-50 bg-surface-elevated rounded-lg border border-border-subtle p-3 w-60">
      <p className="text-xs text-text-secondary mb-2 font-medium">Insertar ícono HugeIcon</p>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar icono..." className="crm-input mb-2 text-xs py-1.5" />
      <p className="text-[10px] text-text-secondary mb-1.5">Sintaxis: <code className="bg-surface-sidebar px-1 rounded">&#96;icon:Nombre&#96;</code></p>
      <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
        {filtered.map((name) => {
          const ic = getHugeIconComponent(name);
          if (!ic) return null;
          return (
            <button key={name} onClick={() => { onInsert(`\`icon:${name}\``); onClose(); }}
              title={name} className="w-9 h-9 flex flex-col items-center justify-center rounded-lg hover:bg-nav-hover transition-colors gap-0.5">
              <HugeiconsIcon icon={ic as never} size={15} color="#374151" />
              <span className="text-[8px] text-text-secondary leading-none truncate w-full text-center px-0.5">{name.replace(/\d+$/, "")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const SUPPORTS_FIELD_SIZING =
  typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

function adjustTextareaHeight(
  ta: HTMLTextAreaElement,
  scrollEl: HTMLElement,
  minHeight: number
) {
  const prevScrollTop = scrollEl.scrollTop;
  const anchorTop = ta.getBoundingClientRect().top;

  const needed = Math.max(ta.scrollHeight, minHeight);
  const prevHeight = ta.offsetHeight;

  if (needed !== prevHeight) {
    ta.style.height = `${needed}px`;
    const deltaTop = ta.getBoundingClientRect().top - anchorTop;
    scrollEl.scrollTop = prevScrollTop + deltaTop;
  }
}

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
  requestAnimationFrame(() => {
    ta.selectionStart = ns;
    ta.selectionEnd = ne;
    ta.focus({ preventScroll: true });
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface KbEditorProps {
  pageId: string;
  initialTitle: string;
  initialEmoji: string | null;
  initialIconColor: string | null;
  initialIconBg: string | null;
  initialContent: string;
  initialPublished: boolean;
  initialMarkdownTheme?: KbMarkdownThemeId | string | null;
  initialRelations: KbRelation[];
  ancestors: KbBreadcrumb[];
  isFolder?: boolean;
  folderStats?: KbFolderStats | null;
  folderChildren?: Array<{
    id: string;
    title: string;
    emoji: string | null;
    iconColor: string | null;
    iconBg: string | null;
    isFolder: boolean;
    isPublished: boolean;
    updatedAt: string;
    _count?: { children: number };
  }>;
  folderTree?: KbTreeNodeDto[];
  onFolderRefresh?: () => void;
}

type ViewMode = "edit" | "preview";

// ─── Component ────────────────────────────────────────────────────────────────

const KbEditor = forwardRef<KbEditorHandle, KbEditorProps>(function KbEditor({
  pageId, initialTitle, initialEmoji, initialIconColor, initialIconBg,
  initialContent, initialPublished, initialMarkdownTheme, initialRelations, ancestors,
  isFolder = false, folderStats, folderChildren = [], folderTree = [],
  onFolderRefresh,
}, ref) {
  const kb = useOptionalKbContext();
  const { addToast } = useToast();
  const [pendingSuggestions, setPendingSuggestions] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [emoji, setEmoji] = useState(initialEmoji || "");
  const [iconColor, setIconColor] = useState<string | null>(initialIconColor);
  const [iconBg, setIconBg] = useState<string | null>(initialIconBg);
  const [content, setContent] = useState(initialContent);
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [markdownTheme, setMarkdownTheme] = useState<KbMarkdownThemeId>(
    (initialMarkdownTheme as KbMarkdownThemeId) || DEFAULT_MARKDOWN_THEME
  );
  const [mode, setMode] = useState<ViewMode>("preview");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showMdIconPicker, setShowMdIconPicker] = useState(false);
  const [exportPdfLoading, setExportPdfLoading] = useState(false);
  const [exportPdfModalOpen, setExportPdfModalOpen] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const proseContainerRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutoSave = useRef(true);

  useImperativeHandle(ref, () => ({
    insertAtEnd(text: string) {
      setContent((prev) => {
        const newContent = prev ? `${prev}\n\n${text}` : text;
        return newContent;
      });
      if (mode === "preview") setMode("edit");
    },
    setContent(text: string) {
      setContent(text);
      if (mode === "preview") setMode("edit");
    },
  }), [mode]);

  type SavePayload = {
    title: string;
    emoji: string;
    iconColor: string | null;
    iconBg: string | null;
    content: string;
    isPublished: boolean;
    markdownTheme: KbMarkdownThemeId;
  };

  const save = useCallback(async (data: SavePayload) => {
    setSaveStatus("saving");
    try {
      const payload: Record<string, unknown> = {
        title: data.title,
        emoji: data.emoji || null,
        iconColor: data.iconColor,
        iconBg: data.iconBg,
        content: data.content,
        isPublished: data.isPublished,
      };
      if (!isFolder) {
        payload.markdownTheme = data.markdownTheme;
      }

      const res = await fetch(`/api/kb/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[KbEditor save]", res.status, err);
      } else {
        void kb?.syncTree({
          type: "update",
          id: pageId,
          patch: {
            title: data.title,
            emoji: data.emoji || null,
            iconColor: data.iconColor,
            iconBg: data.iconBg,
          },
        });
      }
      setSaveStatus(res.ok ? "saved" : "error");
      if (res.ok) setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error("[KbEditor save]", e);
      setSaveStatus("error");
    }
  }, [pageId, isFolder, kb]);

  useEffect(() => {
    if (isFolder) return;
    fetch(`/api/kb/${pageId}/share`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.pendingCount !== undefined) setPendingSuggestions(data.pendingCount);
      })
      .catch(() => {});
  }, [pageId, isFolder, content]);

  const handleContentPatched = useCallback((newContent: string) => {
    skipNextAutoSave.current = true;
    setContent(newContent);
    void kb?.syncTree({ type: "update", id: pageId, patch: { title } });
  }, [kb, pageId, title]);

  const openSuggestionsReview = useCallback(() => {
    setMode("preview");
    setReviewOpen(true);
  }, []);

  const handleModeChange = useCallback((next: ViewMode) => {
    if (next === "edit") setReviewOpen(false);
    setMode(next);
  }, []);

  const savePayload = (): SavePayload => ({
    title, emoji, iconColor, iconBg, content, isPublished, markdownTheme,
  });

  useEffect(() => {
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(() => save(savePayload()), 1200);
  }, [title, emoji, iconColor, iconBg, content, isPublished, markdownTheme]); // eslint-disable-line

  useLayoutEffect(() => {
    const ta = taRef.current;
    const scrollEl = scrollContainerRef.current;
    if (!ta || !scrollEl || mode !== "edit") return;
    if (SUPPORTS_FIELD_SIZING) return;
    adjustTextareaHeight(ta, scrollEl, window.innerHeight * 0.5);
  }, [content, mode]);

  // Ctrl+S
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (saveTimer.current) clearTimeout(saveTimer.current);
        save(savePayload());
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [title, emoji, content, isPublished, markdownTheme, save]);

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
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = ta.selectionStart + 2;
        ta.focus({ preventScroll: true });
      });
    }
  };

  const toolBtn = (icon: React.ReactNode, title: string, action: () => void) => (
    <button type="button" title={title} onClick={action}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-nav-hover transition-colors">
      {icon}
    </button>
  );

  const handleIconSelect = (selection: KbIconSelection) => {
    setEmoji(selection.emoji);
    setIconColor(selection.iconColor);
    setIconBg(selection.iconBg);
  };

  const handleExportPdf = useCallback(() => {
    setExportPdfModalOpen(true);
  }, []);

  const handleExportPdfConfirm = useCallback(async () => {
    setExportPdfLoading(true);
    try {
      await renderPagesToPdf(
        [
          {
            title: title || "Sin título",
            content,
            markdownTheme,
          },
        ],
        `${slugifyPdfFilename(title || "documento")}.pdf`
      );
      addToast("PDF descargado.", "success");
      setExportPdfModalOpen(false);
    } catch (err) {
      console.error("[KbEditor export PDF]", err);
      addToast("Error al generar PDF.", "error");
    } finally {
      setExportPdfLoading(false);
    }
  }, [title, content, markdownTheme, addToast]);

  const contentPad = { paddingLeft: "max(40px, calc((100% - 740px) / 2))", paddingRight: "max(40px, calc((100% - 740px) / 2))" };
  const themeTokens = getMarkdownTheme(isFolder ? null : markdownTheme);
  const pageBg = isFolder ? undefined : themeTokens.bg;
  const pageText = isFolder ? undefined : themeTokens.text;
  const pageBorder = isFolder ? undefined : `color-mix(in srgb, ${themeTokens.accent} 18%, transparent)`;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      <KbEditorNavbar
        pageId={pageId}
        pageTitle={title}
        ancestors={ancestors}
        isPublished={isPublished}
        onTogglePublished={() => setIsPublished((v) => !v)}
        saveStatus={saveStatus}
        mode={mode}
        onModeChange={handleModeChange}
        isFolder={isFolder}
        markdownTheme={markdownTheme}
        onMarkdownThemeChange={setMarkdownTheme}
        pendingSuggestions={pendingSuggestions}
        onOpenSuggestionsReview={openSuggestionsReview}
        onExportPdf={handleExportPdf}
        exportPdfLoading={exportPdfLoading}
      />

      <KbPdfExportConfirmModal
        open={exportPdfModalOpen}
        onClose={() => !exportPdfLoading && setExportPdfModalOpen(false)}
        onConfirm={handleExportPdfConfirm}
        generating={exportPdfLoading}
      />

      {!isFolder && (
        <KbSuggestionsReviewSidebar
          pageId={pageId}
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          accentColor={themeTokens.accent}
          markdownContent={content}
          proseContainerRef={proseContainerRef}
          onContentPatched={handleContentPatched}
          onPendingCountChange={setPendingSuggestions}
        />
      )}

      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto min-h-0 transition-colors duration-300 ${isFolder ? "bg-surface-elevated" : ""}`}
        style={{
          overflowAnchor: "none",
          ...(pageBg ? { backgroundColor: pageBg, color: pageText } : {}),
        }}
      >
      {isFolder && folderStats ? (
        <KbFolderView
          folderId={pageId}
          title={title}
          emoji={emoji}
          iconColor={iconColor}
          iconBg={iconBg}
          folderStats={folderStats}
          children={folderChildren}
          tree={folderTree}
          onTitleChange={setTitle}
          onIconChange={handleIconSelect}
          onRefresh={() => onFolderRefresh?.()}
        />
      ) : (
        <>
        <div className="pt-8 pb-0" style={contentPad}>
        <div className="relative inline-block mb-3">
          <button onClick={() => setShowIconPicker(v => !v)} className="hover:opacity-80 transition-opacity" title="Cambiar icono y colores">
            <PageIcon
              emoji={emoji}
              iconColor={themeTokens.pageIconColor}
              iconBg={themeTokens.pageIconBg}
              isFolder={false}
              size={28}
              block
            />
          </button>
          {showIconPicker && (
            <KbIconPicker
              currentEmoji={emoji}
              currentIconColor={iconColor}
              currentIconBg={iconBg}
              onSelect={handleIconSelect}
              onClose={() => setShowIconPicker(false)}
            />
          )}
        </div>

        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Sin título"
          className="w-full text-4xl font-semibold tracking-tight bg-transparent border-none outline-none placeholder:opacity-40 leading-tight mb-3"
          style={{ color: pageText ?? undefined }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              taRef.current?.focus({ preventScroll: true });
            }
          }}
        />

        <div className="mb-4">
          <KbRelationsInline
            pageId={pageId}
            initialRelations={initialRelations}
            markdownTheme={markdownTheme}
          />
        </div>

        <div className="border-b mb-0" style={{ borderColor: pageBorder ?? undefined }} />
        </div>

        <>
          {mode !== "preview" && (
            <div className="py-1.5 border-b" style={{ ...contentPad, borderColor: pageBorder ?? undefined }}>
              <div className="flex items-center gap-0.5 flex-wrap">
                {toolBtn(<Heading1 size={13} />, "H1", () => fmt(undefined, "# "))}
                {toolBtn(<Heading2 size={13} />, "H2", () => fmt(undefined, "## "))}
                {toolBtn(<Heading3 size={13} />, "H3", () => fmt(undefined, "### "))}
                <div className="w-px h-4 bg-nav-active mx-1" />
                {toolBtn(<Bold size={13} />, "Negrita Ctrl+B", () => fmt({ before: "**" }))}
                {toolBtn(<Italic size={13} />, "Cursiva Ctrl+I", () => fmt({ before: "*" }))}
                {toolBtn(<Strikethrough size={13} />, "Tachado", () => fmt({ before: "~~" }))}
                <div className="w-px h-4 bg-nav-active mx-1" />
                {toolBtn(<Code size={13} />, "Código inline", () => fmt({ before: "`" }))}
                {toolBtn(<FileCode2 size={13} />, "Bloque código", () => fmt(undefined, undefined, "```\n\n```"))}
                {toolBtn(<Quote size={13} />, "Cita", () => fmt(undefined, "> "))}
                <div className="w-px h-4 bg-nav-active mx-1" />
                {toolBtn(<List size={13} />, "Lista", () => fmt(undefined, "- "))}
                {toolBtn(<ListOrdered size={13} />, "Lista numerada", () => fmt(undefined, "1. "))}
                {toolBtn(<ListChecks size={13} />, "Lista de tareas", () => fmt(undefined, "- [ ] "))}
                <div className="w-px h-4 bg-nav-active mx-1" />
                {toolBtn(<Link2 size={13} />, "Enlace Ctrl+K", () => fmt({ before: "[", after: "](url)" }))}
                {toolBtn(<Image size={13} />, "Imagen", () => fmt({ before: "![alt](", after: ")" }))}
                {toolBtn(<Table size={13} />, "Tabla", () => fmt(undefined, undefined, "| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n| A     | B     | C     |"))}
                {toolBtn(<Minus size={13} />, "Separador", () => fmt(undefined, undefined, "---"))}
                <div className="w-px h-4 bg-nav-active mx-1" />
                {/* Icon insert button */}
                <div className="relative">
                  <button
                    type="button"
                    title="Insertar ícono HugeIcons"
                    onClick={() => setShowMdIconPicker(v => !v)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-nav-hover transition-colors"
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

          {mode === "edit" && (
            <>
              <textarea
                ref={taRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Escribe en Markdown...\n\n# Título\n**negrita** *cursiva*\n- lista\n\`icon:Home01\` ← inserta un ícono`}
                className="w-full min-h-[50vh] resize-none border-none outline-none font-mono text-sm leading-7 py-4 placeholder:opacity-40 block"
                style={{
                  ...contentPad,
                  backgroundColor: "transparent",
                  color: pageText ?? undefined,
                  ...(SUPPORTS_FIELD_SIZING ? { fieldSizing: "content" as const } : {}),
                }}
                spellCheck={false}
              />
              <div className="py-1.5 border-t text-xs opacity-40" style={{ ...contentPad, borderColor: pageBorder ?? undefined }}>
                {content.split(/\s+/).filter(Boolean).length} palabras · {content.length} chars
              </div>
            </>
          )}

          {mode === "preview" && (
            <div className="py-10" style={contentPad}>
              {content.trim() ? (
                <div ref={proseContainerRef}>
                  <KbMarkdown content={content} theme={markdownTheme} />
                </div>
              ) : (
                <p className="text-sm italic opacity-40">El contenido aparecerá aquí...</p>
              )}
            </div>
          )}
        </>
        </>
      )}
      </div>
    </div>
  );
});

export default KbEditor;
