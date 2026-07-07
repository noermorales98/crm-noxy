"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserMultipleIcon,
  Settings01Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import { ChevronLeft, Globe, Lock, Edit2, Eye, Palette, ChevronDown, MessageSquare, Download, History } from "lucide-react";
import GlobalSearchTrigger from "@/src/components/GlobalSearchTrigger";
import KbSharePanel from "@/src/components/kb/KbSharePanel";
import {
  KB_MARKDOWN_THEMES,
  type KbMarkdownThemeId,
} from "@/src/lib/kb-markdown-themes";

export interface KbBreadcrumb {
  id: string;
  title: string;
  emoji: string | null;
}

type ViewMode = "edit" | "preview";
type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Props {
  pageId: string;
  pageTitle: string;
  ancestors: KbBreadcrumb[];
  isPublished: boolean;
  onTogglePublished: () => void;
  saveStatus: SaveStatus;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  isFolder?: boolean;
  markdownTheme?: KbMarkdownThemeId;
  onMarkdownThemeChange?: (theme: KbMarkdownThemeId) => void;
  pendingSuggestions?: number;
  onOpenSuggestionsReview?: () => void;
  onExportPdf?: () => void;
  exportPdfLoading?: boolean;
  onOpenHistory?: () => void;
  hasLocalDraft?: boolean;
}

export default function KbEditorNavbar({
  pageId,
  pageTitle,
  ancestors,
  isPublished,
  onTogglePublished,
  saveStatus,
  mode,
  onModeChange,
  isFolder = false,
  markdownTheme = "minimal",
  onMarkdownThemeChange,
  pendingSuggestions = 0,
  onOpenSuggestionsReview,
  onExportPdf,
  exportPdfLoading = false,
  onOpenHistory,
  hasLocalDraft = false,
}: Props) {
  const { data: session } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 h-14 border-b border-border-subtle shrink-0 bg-surface-elevated">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-xs text-text-secondary min-w-0 shrink-0 max-w-[28%]">
        <Link href="/kb" className="hover:text-text-primary shrink-0 font-medium">
          Docs
        </Link>
        {ancestors.map((bc) => (
          <span key={bc.id} className="flex items-center gap-1 min-w-0">
            <ChevronLeft size={10} className="rotate-180 shrink-0 opacity-50" />
            <Link href={`/kb/${bc.id}`} className="hover:text-text-primary truncate">
              {bc.title}
            </Link>
          </span>
        ))}
        <span className="flex items-center gap-1 min-w-0">
          <ChevronLeft size={10} className="rotate-180 shrink-0 opacity-50" />
          <span className="text-text-primary font-medium truncate">{pageTitle || "Sin título"}</span>
        </span>
      </div>

      {/* Global search */}
      <div className="flex-1 max-w-md mx-auto">
        <GlobalSearchTrigger />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <KbSharePanel pageId={pageId} isFolder={isFolder} pendingSuggestions={pendingSuggestions} />

        {!isFolder && pendingSuggestions > 0 && onOpenSuggestionsReview && (
          <button
            type="button"
            onClick={onOpenSuggestionsReview}
            className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
            title="Ver sugerencias pendientes"
          >
            <MessageSquare size={12} />
            <span className="hidden sm:inline">Sugerencias</span>
            <span className="min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold flex items-center justify-center">
              {pendingSuggestions}
            </span>
          </button>
        )}

        {!isFolder && onOpenHistory && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-sidebar text-text-secondary hover:bg-nav-hover transition-colors"
            title="Historial de cambios"
          >
            <History size={12} />
            <span className="hidden sm:inline">Historial</span>
          </button>
        )}

        <button
          onClick={onTogglePublished}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isPublished
              ? "bg-green-50 text-green-700"
              : "bg-surface-sidebar text-text-secondary"
          }`}
        >
          {isPublished ? <Globe size={12} /> : <Lock size={12} />}
          {isPublished ? "Publicado" : "Borrador"}
        </button>

        {hasLocalDraft && (
          <span className="text-[11px] font-medium px-2 py-1 rounded-lg bg-amber-50 text-amber-800">
            Borrador local
          </span>
        )}

        <div
          className={`text-xs font-medium px-2 py-1 rounded-lg transition-all ${
            saveStatus === "saving"
              ? "text-amber-600 bg-amber-50"
              : saveStatus === "saved"
                ? "text-green-600 bg-green-50"
                : saveStatus === "error"
                  ? "text-red-600 bg-red-50"
                  : "text-transparent w-0 px-0"
          }`}
        >
          {saveStatus === "saving"
            ? "Guardando..."
            : saveStatus === "saved"
              ? "✓ Guardado"
              : saveStatus === "error"
                ? "Error"
                : ""}
        </div>

        {!isFolder && (
          <>
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => {
                setThemeMenuOpen((v) => !v);
                setUserMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-sidebar text-text-secondary hover:bg-nav-hover transition-colors"
              title="Tema de markdown"
            >
              <Palette size={12} />
              <span className="hidden sm:inline">Tema</span>
              <ChevronDown size={10} className={`transition-transform ${themeMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {themeMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 max-h-72 overflow-y-auto bg-surface-elevated rounded-lg py-1 z-50 border border-border-subtle shadow-sm">
                {KB_MARKDOWN_THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onMarkdownThemeChange?.(t.id);
                      setThemeMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-xs hover:bg-nav-hover transition-colors ${
                      markdownTheme === t.id ? "bg-nav-active font-medium" : ""
                    }`}
                  >
                    <span
                      className="w-4 h-4 shrink-0 border border-black/5"
                      style={{ backgroundColor: t.bg, borderRadius: t.radiusScale === "pill" ? "9999px" : t.radiusScale === "sharp" ? "3px" : "6px" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: t.accent }}
                    />
                    <span className="text-text-primary truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center bg-surface-sidebar rounded-lg p-0.5 gap-0.5">
            {(["edit", "preview"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                title={m === "edit" ? "Editar" : "Vista previa"}
                className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                  mode === m
                    ? "bg-surface-elevated text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {m === "edit" ? <Edit2 size={13} /> : <Eye size={13} />}
              </button>
            ))}
          </div>

          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={exportPdfLoading}
              title="Descargar PDF"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-sidebar text-text-secondary hover:bg-nav-hover disabled:opacity-50 transition-colors"
            >
              <Download size={12} />
              <span className="hidden sm:inline">{exportPdfLoading ? "PDF..." : "PDF"}</span>
            </button>
          )}
          </>
        )}

        {/* User menu */}
        <div className="relative ml-1" ref={userMenuRef}>
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
            }}
            className="w-8 h-8 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
            title={session?.user?.name || "Usuario"}
          >
            <img src="/avt.webp" alt={session?.user?.name || "Usuario"} className="w-full h-full object-cover" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-surface-elevated rounded-lg py-1 z-50 border border-border-subtle">
              <div className="px-4 py-3 border-b border-border-subtle">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {session?.user?.name || "Usuario"}
                </p>
                <p className="text-xs text-text-secondary truncate">{session?.user?.email || ""}</p>
              </div>
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-nav-hover transition-colors"
              >
                <HugeiconsIcon icon={UserMultipleIcon} size={15} color="#787774" />
                Mi perfil
              </Link>
              <Link
                href="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-nav-hover transition-colors"
              >
                <HugeiconsIcon icon={Settings01Icon} size={15} color="#787774" />
                Configuración
              </Link>
              <div className="border-t border-border-subtle mt-1 pt-1">
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <HugeiconsIcon icon={Logout01Icon} size={15} color="#ef4444" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
