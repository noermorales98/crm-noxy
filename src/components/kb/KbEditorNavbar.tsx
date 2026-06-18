"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  UserMultipleIcon,
  Settings01Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import { ChevronLeft, Globe, Lock, Edit2, Eye, Palette, ChevronDown, MessageSquare } from "lucide-react";
import PageIcon from "@/src/components/kb/PageIcon";
import {
  KB_MARKDOWN_THEMES,
  type KbMarkdownThemeId,
} from "@/src/lib/kb-markdown-themes";
import KbSharePanel from "@/src/components/kb/KbSharePanel";

export interface KbBreadcrumb {
  id: string;
  title: string;
  emoji: string | null;
}

interface KbSearchPage {
  id: string;
  title: string;
  emoji: string | null;
  iconColor?: string | null;
  iconBg?: string | null;
  isFolder: boolean;
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
}: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [allPages, setAllPages] = useState<KbSearchPage[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/kb?all=true")
      .then((r) => (r.ok ? r.json() : []))
      .then(setAllPages)
      .catch(() => setAllPages([]));
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
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

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allPages
      .filter((p) => p.id !== pageId && p.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allPages, searchQuery, pageId]);

  const navigateTo = (id: string) => {
    setSearchQuery("");
    setSearchOpen(false);
    router.push(`/kb/${id}`);
  };

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

      {/* Search */}
      <div ref={searchRef} className="flex-1 max-w-md mx-auto relative">
        <div className="relative flex items-center w-full h-9 rounded-lg bg-surface-sidebar px-3 focus-within:bg-surface-elevated transition-colors">
          <HugeiconsIcon icon={Search01Icon} size={15} color="#787774" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Buscar páginas..."
            className="flex-1 ml-2 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-secondary"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchOpen(false);
              }}
              className="ml-1 text-text-secondary hover:text-text-primary"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={13} />
            </button>
          )}
        </div>

        {searchOpen && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface-elevated rounded-lg py-1 z-50 max-h-64 overflow-y-auto border border-border-subtle">
            {searchResults.length === 0 ? (
              <p className="px-3 py-2 text-xs text-text-secondary">Sin resultados</p>
            ) : (
              searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigateTo(p.id)}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-nav-hover transition-colors"
                >
                  <PageIcon
                    emoji={p.emoji}
                    iconColor={p.iconColor}
                    iconBg={p.iconBg}
                    isFolder={p.isFolder}
                    size={16}
                    block
                  />
                  <span className="truncate text-text-primary">{p.title}</span>
                </button>
              ))
            )}
          </div>
        )}
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
                setSearchOpen(false);
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
          </>
        )}

        {/* User menu */}
        <div className="relative ml-1" ref={userMenuRef}>
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setSearchOpen(false);
            }}
            className="w-8 h-8 rounded-lg bg-accent-charcoal flex items-center justify-center text-white font-semibold text-xs hover:opacity-90 transition-opacity"
            title={session?.user?.name || "Usuario"}
          >
            {session?.user?.name?.[0]?.toUpperCase() || "U"}
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
