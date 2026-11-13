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
import { ArrowDown01Icon, ArrowRight01Icon, ArrowLeft01Icon, Clock01Icon, CloudUploadIcon, Download01Icon, Globe02Icon, LockIcon, Message01Icon, PaintBoardIcon, PencilEdit01Icon, ViewIcon } from "@hugeicons/core-free-icons";

export interface KbBreadcrumb {
  id: string;
  title: string;
  emoji: string | null;
}

type ViewMode = "edit" | "preview";

// Escala única de la barra: botones de 32 px, un solo radio. El marco fuerza 44 px a todo botón: se anula con min-h-0!/min-w-0!.
const TOOL =
  "inline-flex h-8 min-h-0! min-w-0! shrink-0 items-center justify-center rounded-control text-xs font-medium text-text-secondary outline-none transition-colors hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50";
const TOOL_ICON = `${TOOL} w-8`;
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
  onSendToNotion?: () => void;
  notionLoading?: boolean;
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
  onSendToNotion,
  notionLoading = false,
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
      <div className="flex h-12 items-center gap-2 px-3 sm:px-4">
        {/* Breadcrumbs / title */}
        <div className="flex min-w-0 flex-1 items-center gap-0.5 text-xs text-text-secondary sm:max-w-[30%] sm:flex-none">
          <MobileSidebarToggle />
          <Link
            href="/kb"
            className="-ml-1 flex size-10 min-h-0! min-w-0! shrink-0 items-center justify-center rounded-control hover:bg-nav-hover hover:text-text-primary sm:size-auto sm:h-8 sm:px-2 sm:font-medium"
            title="Docs"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} className="sm:hidden" />
            <span className="hidden sm:inline">Docs</span>
          </Link>
          <span className="hidden min-w-0 items-center gap-1 sm:flex">
            {ancestors.map((bc) => (
              <span key={bc.id} className="flex min-w-0 items-center gap-1">
                <HugeiconsIcon icon={ArrowRight01Icon} size={12} className="shrink-0 opacity-50" />
                <Link href={`/kb/${bc.id}`} className="inline-flex h-8 items-center truncate rounded-control px-1.5 hover:bg-nav-hover hover:text-text-primary">
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
        <div className="mx-auto hidden max-w-xs flex-1 md:block">
          <GlobalSearchTrigger square />
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <div className="hidden sm:block">
            <KbSharePanel pageId={pageId} isFolder={isFolder} pendingSuggestions={pendingSuggestions} />
          </div>

          {!isFolder && pendingSuggestions > 0 && onOpenSuggestionsReview && (
            <button
              type="button"
              onClick={onOpenSuggestionsReview}
              className="hidden h-8 min-h-0! min-w-0! items-center gap-1.5 rounded-control bg-amber-50 px-2.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 sm:inline-flex"
              title="Ver sugerencias pendientes"
            >
              <HugeiconsIcon icon={Message01Icon} size={14} />
              <span className="hidden xl:inline">Sugerencias</span>
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-semibold text-white">
                {pendingSuggestions}
              </span>
            </button>
          )}

          {!isFolder && (
            <>
              <span aria-hidden="true" className="mx-1 hidden h-4 w-px bg-line sm:block" />
              {onOpenHistory && (
                <button type="button" onClick={onOpenHistory} className={`${TOOL_ICON} hidden sm:inline-flex`} title="Historial de cambios" aria-label="Historial de cambios">
                  <HugeiconsIcon icon={Clock01Icon} size={16} />
                </button>
              )}
              {onSendToNotion && (
                <button type="button" onClick={onSendToNotion} disabled={notionLoading} className={`${TOOL_ICON} hidden sm:inline-flex`} title={notionLoading ? "Enviando a Notion…" : "Enviar a Notion"} aria-label="Enviar a Notion">
                  <HugeiconsIcon icon={CloudUploadIcon} size={16} />
                </button>
              )}
              {onExportPdf && (
                <button type="button" onClick={onExportPdf} disabled={exportPdfLoading} className={`${TOOL_ICON} hidden sm:inline-flex`} title={exportPdfLoading ? "Generando PDF…" : "Descargar PDF"} aria-label="Descargar PDF">
                  <HugeiconsIcon icon={Download01Icon} size={16} />
                </button>
              )}
              <div className="relative hidden sm:block" ref={themeMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setThemeMenuOpen((v) => !v);
                    setUserMenuOpen(false);
                    setMoreOpen(false);
                  }}
                  className={`${TOOL} gap-1 px-2`}
                  title="Tema de markdown"
                  aria-haspopup="menu"
                  aria-expanded={themeMenuOpen}
                >
                  <HugeiconsIcon icon={PaintBoardIcon} size={16} />
                  <HugeiconsIcon icon={ArrowDown01Icon} size={10} className={`transition-transform ${themeMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {themeMenuOpen && (
                  <div className="crm-floating-menu absolute right-0 top-full z-50 mt-1 max-h-72 w-52 overflow-y-auto rounded-surface border border-line bg-surface-elevated p-1">
                    {KB_MARKDOWN_THEMES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onMarkdownThemeChange?.(t.id);
                          setThemeMenuOpen(false);
                        }}
                        className={`flex h-9 w-full min-h-0! items-center gap-2.5 rounded-control px-2.5 text-left text-xs transition-colors hover:bg-nav-hover ${
                          markdownTheme === t.id ? "bg-nav-active font-medium" : ""
                        }`}
                      >
                        <span
                          className="size-4 shrink-0 border border-black/5"
                          style={{
                            backgroundColor: t.bg,
                            borderRadius: t.radiusScale === "pill" ? "9999px" : t.radiusScale === "sharp" ? "3px" : "6px",
                          }}
                        />
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: t.accent }} />
                        <span className="truncate text-text-primary">{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span aria-hidden="true" className="mx-1 hidden h-4 w-px bg-line sm:block" />
            </>
          )}

          <button
            type="button"
            onClick={onTogglePublished}
            className={`inline-flex size-10 min-h-0! min-w-0! items-center justify-center gap-1.5 rounded-control text-xs font-medium transition-colors sm:h-8 sm:w-auto sm:px-2.5 ${
              isPublished ? "bg-success-soft text-success" : "bg-surface-sidebar text-text-secondary hover:bg-nav-hover"
            }`}
            title={isPublished ? "Publicado" : "Borrador"}
          >
            {isPublished ? <HugeiconsIcon icon={Globe02Icon} size={15} /> : <HugeiconsIcon icon={LockIcon} size={15} />}
            <span className="hidden sm:inline">{isPublished ? "Publicado" : "Borrador"}</span>
          </button>

          {hasLocalDraft && (
            <span className="hidden rounded-control bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 md:inline">
              Borrador local
            </span>
          )}

          {saveLabel && (
            <span
              role="status"
              className={`hidden text-xs font-medium sm:inline ${
                saveStatus === "error" ? "text-danger" : saveStatus === "saved" ? "text-success" : "text-text-secondary"
              }`}
            >
              {saveLabel}
            </span>
          )}

          {!isFolder && (
            <div className="hidden items-center gap-0.5 rounded-control bg-surface-sidebar p-0.5 sm:flex" role="group" aria-label="Modo del editor">
              {(["edit", "preview"] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onModeChange(m)}
                  title={m === "edit" ? "Editar" : "Vista previa"}
                  aria-label={m === "edit" ? "Editar" : "Vista previa"}
                  aria-pressed={mode === m}
                  className={`flex size-7 min-h-0! min-w-0! items-center justify-center rounded-[8px] transition-colors ${
                    mode === m ? "bg-surface-elevated text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {m === "edit" ? <HugeiconsIcon icon={PencilEdit01Icon} size={14} /> : <HugeiconsIcon icon={ViewIcon} size={14} />}
                </button>
              ))}
            </div>
          )}

          {/* Mobile overflow */}
          <div className="relative sm:hidden" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => {
                setMoreOpen((v) => !v);
                setUserMenuOpen(false);
              }}
              className="flex size-10 min-h-0! min-w-0! items-center justify-center rounded-control text-text-secondary transition-colors hover:bg-nav-hover hover:text-text-primary"
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
                {!isFolder && onSendToNotion && (
                  <button
                    type="button"
                    disabled={notionLoading}
                    onClick={() => {
                      onSendToNotion();
                      setMoreOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text-primary hover:bg-nav-hover disabled:opacity-50"
                  >
                    <HugeiconsIcon icon={CloudUploadIcon} size={14} />
                    {notionLoading ? "Enviando a Notion…" : "Enviar a Notion"}
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
              className="size-9 min-h-0! min-w-0! overflow-hidden rounded-full ring-1 ring-line transition-opacity hover:opacity-90 sm:size-8"
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
