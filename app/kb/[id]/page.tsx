"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/src/components/Sidebar";
import KbPageTree from "@/src/components/kb/KbPageTree";
import KbEditor from "@/src/components/kb/KbEditor";
import KbRelationsPanel from "@/src/components/kb/KbRelationsPanel";
import { FileText } from "lucide-react";

interface KbPage {
  id: string;
  title: string;
  emoji: string | null;
  content: string | null;
  isPublished: boolean;
  parentId: string | null;
  parent: { id: string; title: string; emoji: string | null; parentId: string | null } | null;
  relations: Array<{
    id: string;
    entityType: string;
    entityId: string;
    entityLabel: string;
    createdAt: string;
  }>;
}

// ── Build breadcrumb chain from page.parent ───────────────────────────────────
function buildBreadcrumbs(parent: KbPage["parent"] | null): Array<{ id: string; title: string; emoji: string | null }> {
  if (!parent) return [];
  // We only have one level of parent from the API; for deeper nesting you'd fetch recursively.
  return [{ id: parent.id, title: parent.title, emoji: parent.emoji }];
}

export default function KbPageEditor() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [page, setPage] = useState<KbPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchPage = useCallback(async () => {
    const res = await fetch(`/api/kb/${id}`);
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (res.ok) {
      setPage(await res.json());
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  if (loading) {
    return (
      <div className="flex h-screen bg-[#f5f4ef] font-sans">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-300">
            <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            <p className="text-sm">Cargando página...</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="flex h-screen bg-[#f5f4ef] font-sans">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <FileText size={28} className="text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Página no encontrada</p>
              <p className="text-xs text-gray-400 mb-4">Esta página no existe o fue eliminada</p>
              <button
                onClick={() => router.push("/kb")}
                className="text-sm text-blue-600 hover:underline"
              >
                ← Volver al Knowledge Base
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbs = buildBreadcrumbs(page.parent);

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      {/* CRM main sidebar */}
      <Sidebar />

      {/* KB page tree */}
      <KbPageTree onPageCreated={(newId) => router.push(`/kb/${newId}`)} />

      {/* Editor — fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <KbEditor
          pageId={page.id}
          initialTitle={page.title}
          initialEmoji={page.emoji}
          initialContent={page.content || ""}
          initialPublished={page.isPublished}
          breadcrumbs={breadcrumbs}
          onSaved={fetchPage}
        />
      </div>

      {/* Relations panel */}
      <KbRelationsPanel
        pageId={page.id}
        initialRelations={page.relations as any}
      />
    </div>
  );
}
