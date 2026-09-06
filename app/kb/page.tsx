"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHeader } from "@/src/context/HeaderContext";
import {
  Plus, Clock, ChevronRight, BookOpen,
  Globe, Lock, Hash, Folder,
} from "lucide-react";
import PageIcon from "@/src/components/kb/PageIcon";
import { useOptionalKbContext } from "@/src/context/KbContext";

interface KbPage {
  id: string;
  title: string;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  isFolder: boolean;
  isPublished: boolean;
  updatedAt: string;
  _count: { children: number; relations: number };
}

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

export default function KbHomePage() {
  const router = useRouter();
  const kb = useOptionalKbContext();
  const { setConfig, resetState } = useHeader();
  const [pages, setPages] = useState<KbPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setConfig({
      title: "Knowledge Base",
      addButton: {
        label: "Nueva página",
        onClick: () => createPage(false),
      },
    });
    return () => resetState();
  }, []); // eslint-disable-line

  const fetchPages = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/kb?all=true");
    if (res.ok) setPages(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const createPage = async (isFolder = false) => {
    setCreating(true);
    const res = await fetch("/api/kb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: isFolder ? "Nueva carpeta" : "Sin título", isFolder }),
    });
    if (res.ok) {
      const page = await res.json();
      await kb?.syncTree({ type: "create", parentId: null });
      if (!isFolder) router.push(`/kb/${page.id}`);
      else fetchPages();
    }
    setCreating(false);
  };

  const filtered = pages;

  return (
    <main className="crm-mobile-bottom-clearance min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-surface-app px-4 py-5 sm:px-6 sm:py-6">

          {/* Page header */}
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-action-primary">
                <BookOpen size={18} color="white" />
              </div>
              <p className="text-sm text-text-secondary">Documentación, guías y notas del equipo</p>
            </div>
            {/* Extra actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => createPage(true)}
                disabled={creating}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-sidebar disabled:opacity-50 sm:flex-none"
              >
                <Folder size={14} />
                Nueva carpeta
              </button>
              <button
                onClick={() => createPage(false)}
                disabled={creating}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-action-primary px-3 py-2 text-sm font-medium text-action-primary-foreground transition-colors hover:bg-black disabled:opacity-50 sm:flex-none"
              >
                <Plus size={14} />
                Nueva página
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:mb-8 sm:grid-cols-3 sm:gap-4">
            {[
              { label: "Total",       value: pages.filter(p => !p.isFolder).length, icon: BookOpen, color: "text-action-primary bg-nav-hover" },
              { label: "Publicadas",  value: pages.filter(p => !p.isFolder && p.isPublished).length, icon: Globe,    color: "text-green-600 bg-green-50" },
              { label: "Borradores",  value: pages.filter(p => !p.isFolder && !p.isPublished).length, icon: Lock,    color: "text-amber-600 bg-amber-50" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-4 rounded-lg border border-border-subtle bg-white p-4 sm:p-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
                  <stat.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                  <p className="text-xs text-text-secondary">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pages list */}
          <div className="bg-white rounded-lg border border-border-subtle">
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash size={14} className="text-text-secondary" />
                <span className="text-sm font-semibold text-text-primary">Todas las páginas</span>
                <span className="text-xs text-text-secondary bg-surface-sidebar px-2 py-0.5 rounded-full">{filtered.length}</span>
              </div>
            </div>

            {loading ? (
              <div className="p-6 flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 animate-pulse shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-48" />
                      <div className="h-3 bg-surface-sidebar rounded animate-pulse w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-lg bg-surface-sidebar flex items-center justify-center">
                  <BookOpen size={28} className="text-gray-200" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-text-primary mb-1">Tu knowledge base está vacío</p>
                  <p className="text-xs text-text-secondary mb-4">Crea tu primera página para documentar procesos, guías y más</p>
                  <div className="flex items-center gap-2 justify-center">
                    <button
                      onClick={() => createPage(false)}
                      disabled={creating}
                      className="flex items-center gap-2 px-4 py-2.5 bg-action-primary hover:bg-black text-action-primary-foreground text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Plus size={14} />
                      Nueva página
                    </button>
                    <button
                      onClick={() => createPage(true)}
                      disabled={creating}
                      className="flex items-center gap-2 px-4 py-2.5 border border-border-subtle text-text-secondary hover:bg-surface-sidebar text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Folder size={14} />
                      Nueva carpeta
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((page) => (
                  <Link
                    key={page.id}
                    href={`/kb/${page.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-surface-sidebar/70 transition-colors group"
                  >
                    {/* Icon */}
                    <PageIcon
                      emoji={page.emoji}
                      iconColor={page.iconColor}
                      iconBg={page.iconBg}
                      isFolder={page.isFolder}
                      size={22}
                      block
                      className="shrink-0 group-hover:opacity-90 transition-opacity"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate group-hover:text-text-primary">
                        {page.title || "Sin título"}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-text-secondary">
                          <Clock size={10} />
                          {timeAgo(page.updatedAt)}
                        </span>
                        {page._count.children > 0 && (
                          <span className="text-xs text-text-secondary">
                            {page._count.children} {page.isFolder ? "página" : "subpágina"}{page._count.children > 1 ? "s" : ""}
                          </span>
                        )}
                        {!page.isFolder && page._count.relations > 0 && (
                          <span className="text-xs text-text-secondary">
                            {page._count.relations} relación{page._count.relations > 1 ? "es" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 shrink-0">
                      {page.isFolder ? (
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-600">
                          Carpeta
                        </span>
                      ) : (
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                          page.isPublished ? "bg-green-50 text-green-600" : "bg-surface-sidebar text-text-secondary"
                        }`}>
                          {page.isPublished ? "Publicado" : "Borrador"}
                        </span>
                      )}
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-text-secondary transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
  );
}
