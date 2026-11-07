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
import GlobalSearchTrigger from "@/src/components/GlobalSearchTrigger";
import MobileSidebarToggle from "@/src/components/MobileSidebarToggle";
import KbSharePanel from "@/src/components/kb/KbSharePanel";
import {
  KB_MARKDOWN_THEMES,
  type KbMarkdownThemeId,
} from "@/src/lib/kb-markdown-themes";
import { userAvatarSrc } from "@/src/lib/user-sexo";
import { ArrowDown01Icon, ArrowRight01Icon, ArrowLeft01Icon, Clock01Icon, Download01Icon, Globe02Icon, LockIcon, Message01Icon, PaintBoardIcon, PencilEdit01Icon, ViewIcon } from "@hugeicons/core-free-icons";

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
    <div className="crm-safe-top relative z-30 shrink-0 border-b border-line bg-surface-elevated">
      <div className="flex h-12 items-center gap-2 px-3 sm:h-14 sm:gap-3 sm:px-4">
        {/* Breadcrumbs / title */}
        <div className="flex min-w-0 flex-1 items-center gap-1 text-xs text-text-secondary sm:max-w-[28%] sm:flex-none">
          <MobileSidebarToggle />
          <Link
            href="/kb"
            className="-ml-1 flex size-11 shrink-0 items-center justify-center rounded-control hover:bg-nav-hover hover:text-text-primary sm:size-auto sm:min-h-11 sm:min-w-11 sm:justify-center sm:font-medium lg:min-h-0 lg:min-w-0"
            title="Docs"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} className="sm:hidden" />
            <span className="hidden sm:inline">Docs</span>
          </Link>
          <span className="hidden min-w-0 items-center gap-1 sm:flex">
            {ancestors.map((bc) => (
              <span key={bc.id} className="flex min-w-0 items-center gap-1">
                <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="shrink-0 opacity-50" />
                <Link href={`/kb/${bc.id}`} className="inline-flex min-h-11 items-center truncate hover:text-text-primary lg:min-h-0">
                  {bc.title}
                </Link>
              </span>
            ))}
            <span className="flex min-w-0 items-center gap-1">
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="shrink-0 opacity-50" />
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
              className="relative hidden items-center gap-1.5 rounded-lg bg-amber-50 min-h-11 px-2.5 py-1.5 lg:min-h-0 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 sm:flex"
              title="Ver sugerencias pendientes"
            >
              <HugeiconsIcon icon={Message01Icon} size={12} />
              <span className="hidden lg:inline">Sugerencias</span>
              <span className="flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-semibold text-white">
                {pendingSuggestions}
              </span>
            </button>
          )}

          {!isFolder && onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="hidden items-center gap-1.5 rounded-lg bg-surface-sidebar min-h-11 min-w-11 justify-center px-2.5 py-1.5 lg:min-h-0 lg:min-w-0 text-xs font-medium text-text-secondary transition-colors hover:bg-nav-hover sm:flex"
              title="Historial de cambios"
              aria-label="Historial de cambios"
            >
              <HugeiconsIcon icon={Clock01Icon} size={12} />
              <span className="hidden lg:inline">Historial</span>
            </button>
          )}

          <button
            onClick={onTogglePublished}
            className={`flex size-11 items-center justify-center gap-1.5 rounded-control text-xs font-medium transition-colors sm:h-auto sm:min-h-11 sm:w-auto sm:px-2.5 sm:py-1.5 lg:min-h-0 ${
              isPublished
                ? "bg-green-50 text-green-700"
                : "bg-surface-sidebar text-text-secondary"
            }`}
            title={isPublished ? "Publicado" : "Borrador"}
          >
            {isPublished ? <HugeiconsIcon icon={Globe02Icon} size={14} /> : <HugeiconsIcon icon={LockIcon} size={14} />}
            <span className="hidden sm:inline">{isPublished ? "Publicado" : "Borrador"}</span>
          </button>

          {hasLocalDraft && (
            <span className="hidden rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 md:inline">
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
                  className="flex items-center gap-1.5 rounded-lg bg-surface-sidebar min-h-11 px-2.5 py-1.5 lg:min-h-0 text-xs font-medium text-text-secondary transition-colors hover:bg-nav-hover"
                  title="Tema de markdown"
                >
                  <HugeiconsIcon icon={PaintBoardIcon} size={12} />
                  <span className="hidden lg:inline">Tema</span>
                  <HugeiconsIcon icon={ArrowDown01Icon} size={10} className={`transition-transform ${themeMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {themeMenuOpen && (
                  <div className="crm-floating-menu absolute right-0 top-full z-50 mt-1 max-h-72 w-52 overflow-y-auto rounded-lg border border-line bg-surface-elevated py-1">
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
                    className={`flex size-11 items-center justify-center rounded-control transition-colors lg:size-7 ${
                      mode === m
                        ? "bg-surface-elevated text-text-primary"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {m === "edit" ? <HugeiconsIcon icon={PencilEdit01Icon} size={13} /> : <HugeiconsIcon icon={ViewIcon} size={13} />}
                  </button>
                ))}
              </div>

              {onExportPdf && (
                <button
                  type="button"
                  onClick={onExportPdf}
                  disabled={exportPdfLoading}
                  title="Descargar PDF"
                  className="hidden items-center gap-1.5 rounded-lg bg-surface-sidebar min-h-11 px-2.5 py-1.5 lg:min-h-0 text-xs font-medium text-text-secondary transition-colors hover:bg-nav-hover disabled:opacity-50 sm:flex"
                >
                  <HugeiconsIcon icon={Download01Icon} size={12} />
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
              className="flex size-11 items-center justify-center rounded-control lg:size-8 text-text-secondary transition-colors hover:bg-nav-hover hover:text-text-primary"
              aria-expanded={moreOpen}
              aria-label="Más acciones"
            >
              <HugeiconsIcon icon={More01Icon} size={18} />
            </button>
            {moreOpen && (
              <div className="crm-floating-menu absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-line bg-surface-elevated py-1">
                <div className="border-b border-line px-3 py-2">
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
                    <HugeiconsIcon icon={Message01Icon} size={14} />
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
                    <HugeiconsIcon icon={Clock01Icon} size={14} />
                    Historial
                  </button>
                )}
                {!isFolder && onMarkdownThemeChange && (
                  <div className="border-t border-line px-3 py-2">
                    <p className="mb-1.5 text-xs font-semibold text-text-secondary">
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
                    className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-left text-sm text-text-primary hover:bg-nav-hover disabled:opacity-50"
                  >
                    <HugeiconsIcon icon={Download01Icon} size={14} />
                    {exportPdfLoading ? "Generando PDF..." : "Descargar PDF"}
                  </button>
                )}
                {saveLabel && (
                  <p className="border-t border-line px-3 py-2 text-xs text-text-secondary">
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
              className="size-11 overflow-hidden rounded-control lg:size-8 transition-opacity hover:opacity-90"
              title={session?.user?.name || "Usuario"}
            >
              <img
                src={userAvatarSrc(session?.user?.sexo)}
                alt={session?.user?.name || "Usuario"}
                className="h-full w-full object-cover"
              />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-line bg-surface-elevated py-1">
                <div className="border-b border-line px-4 py-3">
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
                <div className="mt-1 border-t border-line pt-1">
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
