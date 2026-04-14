"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, ChevronDown, Plus, FileText, Trash2, MoreHorizontal } from "lucide-react";

interface KbPageNode {
  id: string;
  title: string;
  emoji: string | null;
  parentId: string | null;
  sortOrder: number;
  _count: { children: number };
}

interface TreeNodeProps {
  page: KbPageNode;
  depth: number;
  onNewChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}

function TreeNode({ page, depth, onNewChild, onDelete }: TreeNodeProps) {
  const pathname = usePathname();
  const isActive = pathname === `/kb/${page.id}`;
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<KbPageNode[]>([]);
  const [loadedChildren, setLoadedChildren] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasChildren = page._count.children > 0 || loadedChildren;

  const loadChildren = useCallback(async () => {
    if (loadedChildren) return;
    const res = await fetch(`/api/kb?parentId=${page.id}`);
    if (res.ok) {
      const data = await res.json();
      setChildren(data);
      setLoadedChildren(true);
    }
  }, [page.id, loadedChildren]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!expanded) await loadChildren();
    setExpanded((v) => !v);
  };

  // Auto-expand if child is active
  useEffect(() => {
    if (pathname.startsWith("/kb/") && !expanded) {
      loadChildren().then(() => {
        // If any child matches, expand
      });
    }
  }, [pathname]); // eslint-disable-line

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer transition-colors text-sm relative ${
          isActive ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {/* Expand toggle */}
        <button
          onClick={handleToggle}
          className={`w-4 h-4 flex items-center justify-center shrink-0 rounded transition-colors ${
            isActive ? "text-gray-300 hover:text-white" : "text-gray-400 hover:text-gray-700"
          } ${!hasChildren ? "opacity-0 pointer-events-none" : ""}`}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        {/* Icon + Title */}
        <Link href={`/kb/${page.id}`} className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-base leading-none shrink-0">{page.emoji || "📄"}</span>
          <span className="truncate text-xs font-medium">{page.title || "Sin título"}</span>
        </Link>

        {/* Actions (visible on hover) */}
        <div className={`flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "opacity-100" : ""}`}>
          <button
            onClick={(e) => { e.preventDefault(); onNewChild(page.id); }}
            className={`w-5 h-5 flex items-center justify-center rounded hover:bg-white/20 transition-colors ${isActive ? "text-gray-200" : "text-gray-400 hover:text-gray-700 hover:bg-gray-200"}`}
            title="Nueva subpágina"
          >
            <Plus size={11} />
          </button>
          <div className="relative">
            <button
              onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v); }}
              className={`w-5 h-5 flex items-center justify-center rounded hover:bg-white/20 transition-colors ${isActive ? "text-gray-200" : "text-gray-400 hover:text-gray-700 hover:bg-gray-200"}`}
            >
              <MoreHorizontal size={11} />
            </button>
            {menuOpen && (
              <div
                className="absolute left-0 top-6 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50"
                onBlur={() => setMenuOpen(false)}
              >
                <button
                  onClick={(e) => { e.preventDefault(); setMenuOpen(false); onDelete(page.id); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={12} /> Eliminar página
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Children */}
      {expanded && loadedChildren && (
        <div>
          {children.length === 0 ? (
            <div className="text-xs text-gray-400 italic" style={{ paddingLeft: `${24 + depth * 16}px` }}>
              Sin subpáginas
            </div>
          ) : (
            children.map((child) => (
              <TreeNode
                key={child.id}
                page={child}
                depth={depth + 1}
                onNewChild={onNewChild}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface KbPageTreeProps {
  onPageCreated?: (id: string) => void;
}

export default function KbPageTree({ onPageCreated }: KbPageTreeProps) {
  const router = useRouter();
  const [pages, setPages] = useState<KbPageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const fetchRootPages = useCallback(async () => {
    const res = await fetch("/api/kb");
    if (res.ok) setPages(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchRootPages(); }, [fetchRootPages]);

  const createPage = async (parentId: string | null = null) => {
    const res = await fetch("/api/kb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Sin título", parentId }),
    });
    if (res.ok) {
      const page = await res.json();
      if (!parentId) fetchRootPages();
      onPageCreated?.(page.id);
      router.push(`/kb/${page.id}`);
    }
  };

  const deletePage = async (id: string) => {
    if (!confirm("¿Eliminar esta página? Las subpáginas quedarán como páginas raíz.")) return;
    await fetch(`/api/kb/${id}`, { method: "DELETE" });
    fetchRootPages();
    router.push("/kb");
  };

  if (collapsed) {
    return (
      <div className="w-8 bg-white border-r border-gray-100 flex flex-col items-center py-3 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded transition-colors"
          title="Expandir panel"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Páginas</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => createPage(null)}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Nueva página raíz"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Colapsar panel"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {loading ? (
          <div className="flex flex-col gap-1 px-2 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-7 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <FileText size={24} className="text-gray-200" />
            <p className="text-xs text-gray-400 text-center px-2">Sin páginas aún</p>
            <button
              onClick={() => createPage(null)}
              className="text-xs text-blue-600 hover:underline"
            >
              Crear primera página
            </button>
          </div>
        ) : (
          pages.map((page) => (
            <TreeNode
              key={page.id}
              page={page}
              depth={0}
              onNewChild={createPage}
              onDelete={deletePage}
            />
          ))
        )}
      </div>
    </div>
  );
}
