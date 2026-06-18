"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useHeader } from "@/src/context/HeaderContext";
import KbEditor from "@/src/components/kb/KbEditor";
import type { KbTreeNodeDto } from "@/src/components/kb/KbFolderView";
import type { KbFolderStats } from "@/src/lib/kb-folder-stats";
import { FileText } from "lucide-react";

interface KbPage {
  id: string;
  title: string;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  content: string | null;
  isPublished: boolean;
  isFolder: boolean;
  parentId: string | null;
  markdownTheme?: string | null;
  ancestors: Array<{ id: string; title: string; emoji: string | null; iconColor?: string | null; iconBg?: string | null }>;
  relations: Array<{
    id: string;
    entityType: string;
    entityId: string;
    entityLabel: string;
    createdAt: string;
  }>;
  children?: Array<{
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
  folderStats?: KbFolderStats | null;
  tree?: KbTreeNodeDto[] | null;
}

export default function KbPageEditor() {
  const params = useParams();
  const router = useRouter();
  const { resetState } = useHeader();
  const id = params?.id as string;

  const [page, setPage] = useState<KbPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    resetState();
    return () => resetState();
  }, [id, resetState]);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/kb/${id}`);
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    if (res.ok) setPage(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-elevated">
        <div className="flex flex-col items-center gap-3 text-text-secondary">
          <div className="w-10 h-10 border-2 border-border-subtle border-t-text-primary rounded-full animate-spin" />
          <p className="text-sm">Cargando página...</p>
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-elevated">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-lg bg-surface-sidebar flex items-center justify-center">
            <FileText size={28} className="text-text-secondary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary mb-1">Página no encontrada</p>
            <p className="text-xs text-text-secondary mb-4">Esta página no existe o fue eliminada</p>
            <button onClick={() => router.push("/kb")} className="text-sm text-text-primary font-medium underline">
              ← Volver al Knowledge Base
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden h-full">
      <KbEditor
        key={page.id}
        pageId={page.id}
        initialTitle={page.title}
        initialEmoji={page.emoji}
        initialIconColor={page.iconColor}
        initialIconBg={page.iconBg}
        initialContent={page.content || ""}
        initialPublished={page.isPublished}
        initialMarkdownTheme={page.markdownTheme ?? "minimal"}
        initialRelations={page.relations}
        isFolder={page.isFolder}
        ancestors={page.ancestors ?? []}
        folderStats={page.folderStats ?? null}
        folderChildren={page.children ?? []}
        folderTree={page.tree ?? []}
        onFolderRefresh={fetchPage}
      />
    </div>
  );
}
