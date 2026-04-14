"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import { useHeader } from "@/src/context/HeaderContext";
import {
  Plus, Clock, ChevronRight, BookOpen, Search,
  Globe, Lock, Hash, Folder,
} from "lucide-react";
import PageIcon from "@/src/components/kb/PageIcon";

interface KbPage {
  id: string;
  title: string;
  emoji: string | null;
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
  const { setConfig, searchQuery, resetState } = useHeader();
  const [pages, setPages] = useState<KbPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setConfig({
      searchPlaceholder: "Buscar páginas...",
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
      if (!isFolder) router.push(`/kb/${page.id}`);
      else fetchPages();
    }
    setCreating(false);
  };

  const filtered = pages.filter((p) =>
    !searchQuery ||
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#f5f4ef] font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-6">

          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center">
                <BookOpen size={18} color="white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Knowledge Base</h1>
                <p className="text-sm text-gray-400">Documentación, guías y notas del equipo</p>
              </div>
            </div>
            {/* Extra actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => createPage(true)}
                disabled={creating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Folder size={14} />
                Nueva carpeta
              </button>
              <button
                onClick={() => createPage(false)}
                disabled={creating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                <Plus size={14} />
                Nueva página
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Total",       value: pages.filter(p => !p.isFolder).length, icon: BookOpen, color: "text-blue-600 bg-blue-50" },
              { label: "Publicadas",  value: pages.filter(p => !p.isFolder && p.isPublished).length, icon: Globe,    color: "text-green-600 bg-green-50" },
              { label: "Borradores",  value: pages.filter(p => !p.isFolder && !p.isPublished).length, icon: Lock,    color: "text-amber-600 bg-amber-50" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                  <stat.icon size={18} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pages list */}
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash size={14} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Todas las páginas</span>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{filtered.length}</span>
              </div>
            </div>

            {loading ? (
              <div className="p-6 flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-48" />
                      <div className="h-3 bg-gray-50 rounded animate-pulse w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                {searchQuery ? (
                  <>
                    <Search size={32} className="text-gray-200" />
                    <p className="text-sm text-gray-400">Sin resultados para "{searchQuery}"</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                      <BookOpen size={28} className="text-gray-200" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 mb-1">Tu knowledge base está vacío</p>
                      <p className="text-xs text-gray-400 mb-4">Crea tu primera página para documentar procesos, guías y más</p>
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          onClick={() => createPage(false)}
                          disabled={creating}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                        >
                          <Plus size={14} />
                          Nueva página
                        </button>
                        <button
                          onClick={() => createPage(true)}
                          disabled={creating}
                          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                        >
                          <Folder size={14} />
                          Nueva carpeta
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((page) => (
                  <Link
                    key={page.id}
                    href={`/kb/${page.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors group"
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-gray-100 transition-colors">
                      {page.isFolder
                        ? <Folder size={20} className="text-amber-500" />
                        : <PageIcon emoji={page.emoji} size={22} fallback="📄" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-gray-900">
                        {page.title || "Sin título"}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={10} />
                          {timeAgo(page.updatedAt)}
                        </span>
                        {page._count.children > 0 && (
                          <span className="text-xs text-gray-400">
                            {page._count.children} {page.isFolder ? "página" : "subpágina"}{page._count.children > 1 ? "s" : ""}
                          </span>
                        )}
                        {!page.isFolder && page._count.relations > 0 && (
                          <span className="text-xs text-gray-400">
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
                          page.isPublished ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"
                        }`}>
                          {page.isPublished ? "Publicado" : "Borrador"}
                        </span>
                      )}
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
