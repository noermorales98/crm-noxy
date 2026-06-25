"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useHeader } from "@/src/context/HeaderContext";
import KbEditor from "@/src/components/kb/KbEditor";
import type { KbTreeNodeDto } from "@/src/components/kb/KbFolderView";
import type { KbFolderStats } from "@/src/lib/kb-folder-stats";
import { FileText } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon, Cancel01Icon, Copy01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";

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

  const { addToast } = useToast();
  const [aiAction, setAiAction] = useState<"summarize" | "improve" | "continue" | null>(null);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

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

  const handleAiAction = async (action: "summarize" | "improve" | "continue") => {
    if (!page?.content?.trim()) {
      addToast("La página no tiene contenido para analizar", "error");
      return;
    }
    setAiAction(action);
    setAiResult("");
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/draft-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, content: page.content }),
      });
      const data = await res.json() as { result?: string; error?: string };
      if (!res.ok || !data.result) {
        addToast(data.error ?? "Error al procesar", "error");
        setAiAction(null);
        return;
      }
      setAiResult(data.result);
    } catch {
      addToast("Error de conexión", "error");
      setAiAction(null);
    } finally {
      setAiLoading(false);
    }
  };

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
    <div className="flex-1 overflow-hidden h-full flex flex-col">
      {/* AI Toolbar */}
      <div className="shrink-0 px-4 py-2 border-b border-border-subtle bg-white flex items-center gap-2">
        <HugeiconsIcon icon={SparklesIcon} size={14} color="#6366F1" />
        <span className="text-xs font-semibold text-[#6366F1] mr-2">IA</span>
        {(["summarize", "improve", "continue"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => handleAiAction(a)}
            disabled={aiLoading}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
              aiAction === a && (aiLoading || aiResult)
                ? "bg-[#EEF2FF] text-[#6366F1] font-medium"
                : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
            }`}
          >
            {a === "summarize" ? "✦ Resumir" : a === "improve" ? "✦ Mejorar" : "✦ Continuar"}
          </button>
        ))}
        {aiLoading && (
          <span className="ml-auto text-xs text-text-secondary flex items-center gap-1.5">
            <span className="w-3 h-3 border border-[#6366F1] border-t-transparent rounded-full animate-spin" />
            Generando...
          </span>
        )}
      </div>

      {/* AI Result Panel */}
      {aiResult && (
        <div className="shrink-0 mx-4 mt-3 mb-1 border border-[#DDD6FE] rounded-xl bg-[#F5F3FF] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#EDE9FE]">
            <span className="text-xs font-semibold text-[#6366F1]">
              {aiAction === "summarize" ? "Resumen" : aiAction === "improve" ? "Texto mejorado" : "Continuación"}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Copiar"
                onClick={async () => {
                  await navigator.clipboard.writeText(aiResult).catch(() => {});
                  addToast("Copiado al portapapeles", "success");
                }}
                className="p-1.5 rounded-md text-[#6366F1] hover:bg-[#EEF2FF] transition-colors"
              >
                <HugeiconsIcon icon={Copy01Icon} size={13} color="#6366F1" />
              </button>
              <button
                type="button"
                onClick={() => { setAiAction(null); setAiResult(""); }}
                className="p-1.5 rounded-md text-text-secondary hover:bg-[#EDE9FE] transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={13} />
              </button>
            </div>
          </div>
          <div className="px-4 py-3 max-h-48 overflow-y-auto">
            <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{aiResult}</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
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
    </div>
  );
}
