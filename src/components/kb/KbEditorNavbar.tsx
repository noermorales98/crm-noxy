"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserMultipleIcon,
  Settings01Icon,
  Logout01Icon,
  More01Icon,
} from "@hugeicons/core-free-icons";
import { ChevronLeft, Globe, Lock, Edit2, Eye, Palette, ChevronDown, MessageSquare, Download, History } from "lucide-react";
import GlobalSearchTrigger from "@/src/components/GlobalSearchTrigger";
import MobileSidebarToggle from "@/src/components/MobileSidebarToggle";
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
  const [moreOpen, setMoreOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const saveLabel =
    saveStatus === "saving"
      ? "Guardando..."
      : saveStatus === "saved"
        ? "✓ Guardado"
        : saveStatus === "error"
          ? "Error"
          : "";

  return (
    <div className="crm-safe-top shrink-0 border-b border-border-subtle bg-surface-elevated">
      <div className="flex h-12 items-center gap-2 overflow-hidden px-3 sm:h-14 sm:gap-3 sm:px-4">
        {/* Breadcrumbs / title */}
        <div className="flex min-w-0 flex-1 items-center gap-1 text-xs text-text-secondary sm:max-w-[28%] sm:flex-none">
          <MobileSidebarToggle />
          <Link
            href="/kb"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-nav-hover hover:text-text-primary sm:size-auto sm:font-medium"
            title="Docs"
          >
            <ChevronLeft size={16} className="sm:hidden" />
            <span className="hidden sm:inline">Docs</span>
          </Link>
          <span className="hidden min-w-0 items-center gap-1 sm:flex">
            {ancestors.map((bc) => (
              <span key={bc.id} className="flex min-w-0 items-center gap-1">
                <ChevronLeft size={10} className="rotate-180 shrink-0 opacity-50" />
                <Link href={`/kb/${bc.id}`} className="truncate hover:text-text-primary">
                  {bc.title}
                </Link>
              </span>
            ))}
            <span className="flex min-w-0 items-center gap-1">
              <ChevronLeft size={10} className="rotate-180 shrink-0 opacity-50" />
              <span className="truncate font-medium text-text-primary">{pageTitle || "Sin título"}</span>
            </span>
          </span>
          <span className="truncate font-medium text-text-primary sm:hidden">
            {pageTitle || "Sin título"}
          </span>
        </div>

        {/* Global search — desktop */}
        <div className="mx-auto hidden max-w-md flex-1 md:block">
          <GlobalSearchTrigger />
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="hidden sm:block">
            <KbSharePanel pageId={pageId} isFolder={isFolder} pendingSuggestions={pendingSuggestions} />
          </div>

          {!isFolder && pendingSuggestions > 0 && onOpenSuggestionsReview && (
            <button
              type="button"
              onClick={onOpenSuggestionsReview}
              className="relative hidden items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 sm:flex"
              title="Ver sugerencias pendientes"
            >
              <MessageSquare size={12} />
              <span className="hidden lg:inline">Sugerencias</span>
              <span className="flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                {pendingSuggestions}
              </span>
            </button>
          )}

          {!isFolder && onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="hidden items-center gap-1.5 rounded-lg bg-surface-sidebar px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-nav-hover sm:flex"
              title="Historial de cambios"
            >
              <History size={12} />
              <span className="hidden lg:inline">Historial</span>
            </button>
          )}

          <button
            onClick={onTogglePublished}
            className={`flex size-8 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5 ${
              isPublished
                ? "bg-green-50 text-green-700"
                : "bg-surface-sidebar text-text-secondary"
            }`}
            title={isPublished ? "Publicado" : "Borrador"}
          >
            {isPublished ? <Globe size={14} /> : <Lock size={14} />}
            <span className="hidden sm:inline">{isPublished ? "Publicado" : "Borrador"}</span>
          </button>

          {hasLocalDraft && (
            <span className="hidden rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 md:inline">
              Borrador local
            </span>
          )}

          <div
            className={`hidden text-xs font-medium transition-all sm:block ${
              saveStatus === "saving"
                ? "rounded-lg bg-amber-50 px-2 py-1 text-amber-600"
                : saveStatus === "saved"
                  ? "rounded-lg bg-green-50 px-2 py-1 text-green-600"
                  : saveStatus === "error"
                    ? "rounded-lg bg-red-50 px-2 py-1 text-red-600"
                    : "w-0 px-0 text-transparent"
            }`}
          >
            {saveLabel}
          </div>

          {!isFolder && (
            <>
              <div className="relative hidden sm:block" ref={themeMenuRef}>
                <button
                  onClick={() => {
                    setThemeMenuOpen((v) => !v);
                    setUserMenuOpen(false);
                    setMoreOpen(false);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-surface-sidebar px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-nav-hover"
                  title="Tema de markdown"
                >
                  <Palette size={12} />
                  <span className="hidden lg:inline">Tema</span>
                  <ChevronDown size={10} className={`transition-transform ${themeMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {themeMenuOpen && (
                  <div className="crm-floating-menu absolute right-0 top-full z-50 mt-1 max-h-72 w-52 overflow-y-auto rounded-lg border border-border-subtle bg-surface-elevated py-1">
                    {KB_MARKDOWN_THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onMarkdownThemeChange?.(t.id);
                          setThemeMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-nav-hover ${
                          markdownTheme === t.id ? "bg-nav-active font-medium" : ""
                        }`}
                      >
                        <span
                          className="h-4 w-4 shrink-0 border border-black/5"
                          style={{
                            backgroundColor: t.bg,
                            borderRadius:
                              t.radiusScale === "pill"
                                ? "9999px"
                                : t.radiusScale === "sharp"
                                  ? "3px"
                                  : "6px",
                          }}
                        />
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: t.accent }}
                        />
                        <span className="truncate text-text-primary">{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-0.5 rounded-lg bg-surface-sidebar p-0.5">
                {(["edit", "preview"] as ViewMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => onModeChange(m)}
                    title={m === "edit" ? "Editar" : "Vista previa"}
                    className={`flex size-7 items-center justify-center rounded-md transition-colors ${
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
                  className="hidden items-center gap-1.5 rounded-lg bg-surface-sidebar px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-nav-hover disabled:opacity-50 sm:flex"
                >
                  <Download size={12} />
                  <span className="hidden lg:inline">{exportPdfLoading ? "PDF..." : "PDF"}</span>
                </button>
              )}
            </>
          )}

          {/* Mobile overflow */}
          <div className="relative sm:hidden" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => {
                setMoreOpen((v) => !v);
                setUserMenuOpen(false);
              }}
              className="flex size-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-nav-hover hover:text-text-primary"
              aria-expanded={moreOpen}
              aria-label="Más acciones"
            >
              <HugeiconsIcon icon={More01Icon} size={18} />
            </button>
            {moreOpen && (
              <div className="crm-floating-menu absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-border-subtle bg-surface-elevated py-1">
                <div className="border-b border-border-subtle px-3 py-2">
                  <KbSharePanel pageId={pageId} isFolder={isFolder} pendingSuggestions={pendingSuggestions} />
                </div>
                {!isFolder && pendingSuggestions > 0 && onOpenSuggestionsReview && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenSuggestionsReview();
                      setMoreOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text-primary hover:bg-nav-hover"
                  >
                    <MessageSquare size={14} />
                    Sugerencias ({pendingSuggestions})
                  </button>
                )}
                {!isFolder && onOpenHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenHistory();
                      setMoreOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text-primary hover:bg-nav-hover"
                  >
                    <History size={14} />
                    Historial
                  </button>
                )}
                {!isFolder && onMarkdownThemeChange && (
                  <div className="border-t border-border-subtle px-3 py-2">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                      Tema
                    </p>
                    <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
                      {KB_MARKDOWN_THEMES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onMarkdownThemeChange(t.id);
                            setMoreOpen(false);
                          }}
                          className={`rounded-md px-2 py-1.5 text-left text-xs ${
                            markdownTheme === t.id ? "bg-nav-active font-medium" : "hover:bg-nav-hover"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {!isFolder && onExportPdf && (
                  <button
                    type="button"
                    onClick={() => {
                      onExportPdf();
                      setMoreOpen(false);
                    }}
                    disabled={exportPdfLoading}
                    className="flex w-full items-center gap-2 border-t border-border-subtle px-3 py-2.5 text-left text-sm text-text-primary hover:bg-nav-hover disabled:opacity-50"
                  >
                    <Download size={14} />
                    {exportPdfLoading ? "Generando PDF..." : "Descargar PDF"}
                  </button>
                )}
                {saveLabel && (
                  <p className="border-t border-border-subtle px-3 py-2 text-xs text-text-secondary">
                    {saveLabel}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative ml-0.5" ref={userMenuRef}>
            <button
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                setMoreOpen(false);
              }}
              className="size-8 overflow-hidden rounded-lg transition-opacity hover:opacity-90"
              title={session?.user?.name || "Usuario"}
            >
              <img
                src="/avt.webp"
                alt={session?.user?.name || "Usuario"}
                className="h-full w-full object-cover"
              />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-border-subtle bg-surface-elevated py-1">
                <div className="border-b border-border-subtle px-4 py-3">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {session?.user?.name || "Usuario"}
                  </p>
                  <p className="truncate text-xs text-text-secondary">{session?.user?.email || ""}</p>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-nav-hover"
                >
                  <HugeiconsIcon icon={UserMultipleIcon} size={15} color="#6B7184" />
                  Mi perfil
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-nav-hover"
                >
                  <HugeiconsIcon icon={Settings01Icon} size={15} color="#6B7184" />
                  Configuración
                </Link>
                <div className="mt-1 border-t border-border-subtle pt-1">
                  <button
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50"
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
    </div>
  );
}
