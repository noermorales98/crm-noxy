"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, LinkSquare01Icon, Folder01Icon } from "@hugeicons/core-free-icons";
import KbMarkdown from "@/src/components/kb/KbMarkdown";
import PageIcon from "@/src/components/kb/PageIcon";
import type { KbMarkdownThemeId } from "@/src/lib/kb-markdown-themes";

interface KbChild {
  id: string;
  title: string;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  isFolder: boolean;
  _count: { children: number };
}

interface KbPageDetail {
  id: string;
  title: string;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  isFolder: boolean;
  content: string | null;
  markdownTheme: string | null;
  children: KbChild[];
}

interface Crumb {
  id: string;
  title: string;
}

export default function KbInlineDocViewer({ initialPageId, onClose }: { initialPageId: string; onClose: () => void }) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [currentId, setCurrentId] = useState(initialPageId);
  const [page, setPage] = useState<KbPageDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPage = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kb/${id}`);
      const data = await res.json();
      setPage(data.error ? null : data);
    } catch {
      setPage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPage(currentId); }, [currentId]);

  const openChild = (child: KbChild) => {
    if (!page) return;
    setCrumbs((prev) => [...prev, { id: page.id, title: page.title }]);
    setCurrentId(child.id);
  };

  const jumpToCrumb = (index: number) => {
    const target = crumbs[index];
    setCrumbs((prev) => prev.slice(0, index));
    setCurrentId(target.id);
  };

  return (
    <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-1.5 min-w-0 text-xs text-text-secondary flex-wrap">
          <button onClick={onClose} className="flex items-center gap-1 font-semibold text-text-secondary hover:text-text-primary transition-colors shrink-0">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
            Docs
          </button>
          {crumbs.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1.5 min-w-0">
              <span>/</span>
              <button onClick={() => jumpToCrumb(i)} className="hover:text-text-primary truncate max-w-[140px]">{c.title}</button>
            </span>
          ))}
          {page && (
            <span className="flex items-center gap-1.5 min-w-0">
              <span>/</span>
              <span className="text-text-primary font-semibold truncate max-w-[180px]">{page.title}</span>
            </span>
          )}
        </div>
        {page && (
          <Link
            href={`/kb/${page.id}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary shrink-0"
            title="Abrir y editar en Docs"
          >
            <HugeiconsIcon icon={LinkSquare01Icon} size={13} />
            Editar en Docs
          </Link>
        )}
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
          </div>
        ) : !page ? (
          <p className="text-sm text-text-secondary text-center py-10">No se pudo cargar este documento.</p>
        ) : page.isFolder ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PageIcon emoji={page.emoji} isFolder size={20} />
              <h3 className="text-lg font-bold text-text-primary">{page.title}</h3>
            </div>
            {page.children.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-text-secondary gap-2">
                <HugeiconsIcon icon={Folder01Icon} size={24} className="opacity-30" />
                <p className="text-sm">Esta carpeta está vacía</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {page.children.map((child) => (
                  <li key={child.id}>
                    <button
                      onClick={() => openChild(child)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-surface-sidebar text-left transition-colors"
                    >
                      <PageIcon emoji={child.emoji} iconColor={child.iconColor} iconBg={child.iconBg} isFolder={child.isFolder} size={16} />
                      <span className="text-sm text-text-primary truncate flex-1">{child.title}</span>
                      {child.isFolder && child._count.children > 0 && (
                        <span className="text-[10px] font-bold text-text-secondary bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">{child._count.children}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PageIcon emoji={page.emoji} iconColor={page.iconColor} iconBg={page.iconBg} size={20} />
              <h3 className="text-lg font-bold text-text-primary">{page.title}</h3>
            </div>
            <KbMarkdown content={page.content ?? ""} theme={(page.markdownTheme as KbMarkdownThemeId) ?? "minimal"} />
          </div>
        )}
      </div>
    </div>
  );
}
