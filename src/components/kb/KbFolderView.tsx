"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, FolderPlus, Globe, Lock } from "lucide-react";
import PageIcon from "@/src/components/kb/PageIcon";
import KbIconPicker from "@/src/components/kb/KbIconPicker";
import type { KbFolderStats } from "@/src/lib/kb-folder-stats";
import type { KbIconSelection } from "@/src/lib/kb-icons";
import { useOptionalKbContext } from "@/src/context/KbContext";

export interface KbTreeNodeDto {
  id: string;
  title: string;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  isFolder: boolean;
  isPublished: boolean;
  updatedAt: string;
  children: KbTreeNodeDto[];
}

interface ChildRow {
  id: string;
  title: string;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  isFolder: boolean;
  isPublished: boolean;
  updatedAt: string | Date;
  _count?: { children: number };
}

interface Props {
  folderId: string;
  title: string;
  emoji: string;
  iconColor: string | null;
  iconBg: string | null;
  folderStats: KbFolderStats;
  children: ChildRow[];
  tree: KbTreeNodeDto[];
  onTitleChange: (title: string) => void;
  onIconChange: (selection: KbIconSelection) => void;
  onRefresh: () => void;
}

function DonutChart({ pages, folders }: { pages: number; folders: number }) {
  const total = pages + folders || 1;
  const pagePct = (pages / total) * 100;
  const r = 28;
  const c = 2 * Math.PI * r;
  const pageLen = (pagePct / 100) * c;

  return (
    <div className="flex items-center gap-4">
      <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0 -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#F7F7F5" strokeWidth="10" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="#337EA9"
          strokeWidth="10"
          strokeDasharray={`${pageLen} ${c - pageLen}`}
          strokeLinecap="round"
        />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="#D9730D"
          strokeWidth="10"
          strokeDasharray={`${c - pageLen} ${pageLen}`}
          strokeDashoffset={-pageLen}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#337EA9]" />
          <span className="text-text-secondary">{pages} páginas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#D9730D]" />
          <span className="text-text-secondary">{folders} carpetas</span>
        </div>
      </div>
    </div>
  );
}

function BarChart({ published, draft }: { published: number; draft: number }) {
  const total = published + draft || 1;
  const pubPct = (published / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden bg-surface-sidebar">
        <div className="bg-[#448361] transition-all" style={{ width: `${pubPct}%` }} />
        <div className="bg-[#D9730D] flex-1" />
      </div>
      <div className="flex justify-between text-[11px] text-text-secondary">
        <span>{published} publicadas</span>
        <span>{draft} borradores</span>
      </div>
    </div>
  );
}

function TreeBranch({ node, depth = 0 }: { node: KbTreeNodeDto; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasKids = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 rounded-lg hover:bg-nav-hover transition-colors"
        style={{ paddingLeft: depth * 16 }}
      >
        <button
          type="button"
          onClick={() => hasKids && setOpen((v) => !v)}
          className={`w-4 h-4 flex items-center justify-center shrink-0 ${!hasKids ? "invisible" : ""}`}
        >
          <ChevronRight size={12} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        </button>
        <Link href={`/kb/${node.id}`} className="flex items-center gap-2 flex-1 min-w-0 py-0.5">
          <PageIcon
            emoji={node.emoji}
            iconColor={node.iconColor}
            iconBg={node.iconBg}
            isFolder={node.isFolder}
            size={14}
            block
          />
          <span className="text-sm truncate text-text-primary">{node.title || "Sin título"}</span>
          {!node.isFolder && (
            node.isPublished ? (
              <Globe size={11} className="text-green-600 shrink-0" />
            ) : (
              <Lock size={11} className="text-text-secondary shrink-0" />
            )
          )}
        </Link>
      </div>
      {open && hasKids && node.children.map((c) => (
        <TreeBranch key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function KbFolderView({
  folderId,
  title,
  emoji,
  iconColor,
  iconBg,
  folderStats,
  children,
  tree,
  onTitleChange,
  onIconChange,
  onRefresh,
}: Props) {
  const router = useRouter();
  const kb = useOptionalKbContext();
  const [showPicker, setShowPicker] = useState(false);
  const [creating, setCreating] = useState(false);

  const createChild = async (isFolder: boolean) => {
    setCreating(true);
    try {
      const res = await fetch("/api/kb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: isFolder ? "Nueva carpeta" : "Sin título",
          parentId: folderId,
          isFolder,
        }),
      });
      if (res.ok) {
        const page = await res.json();
        onRefresh();
        await kb?.syncTree({ type: "create", parentId: folderId });
        if (!isFolder) router.push(`/kb/${page.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const metrics = [
    { label: "Páginas totales", value: folderStats.totalPages },
    { label: "Publicadas", value: folderStats.publishedPages },
    { label: "Borradores", value: folderStats.draftPages },
    { label: "Subcarpetas", value: folderStats.directFolders },
  ];

  return (
    <div className="py-6 space-y-8" style={{ paddingLeft: "max(40px, calc((100% - 740px) / 2))", paddingRight: "max(40px, calc((100% - 740px) / 2))" }}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="hover:opacity-80 transition-opacity"
            title="Cambiar icono y colores"
          >
            <PageIcon emoji={emoji} iconColor={iconColor} iconBg={iconBg} isFolder size={28} block />
          </button>
          {showPicker && (
            <KbIconPicker
              currentEmoji={emoji}
              currentIconColor={iconColor}
              currentIconBg={iconBg}
              onSelect={(s) => { onIconChange(s); setShowPicker(false); }}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Nombre de carpeta"
            className="w-full text-3xl font-bold text-text-primary bg-transparent border-none outline-none placeholder:text-gray-200 leading-tight"
          />
          <p className="text-sm text-text-secondary mt-1">
            {folderStats.directPages} páginas directas · {folderStats.directFolders} subcarpetas
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            disabled={creating}
            onClick={() => createChild(false)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-charcoal text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            <Plus size={14} /> Página
          </button>
          <button
            type="button"
            disabled={creating}
            onClick={() => createChild(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-sidebar text-text-primary text-sm font-medium hover:bg-nav-hover disabled:opacity-50"
          >
            <FolderPlus size={14} /> Carpeta
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-surface-elevated rounded-lg p-4">
            <p className="text-2xl font-bold text-text-primary tabular-nums">{m.value}</p>
            <p className="text-xs text-text-secondary mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-surface-elevated rounded-lg p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Estado de páginas</p>
          <BarChart published={folderStats.publishedPages} draft={folderStats.draftPages} />
        </div>
        <div className="bg-surface-elevated rounded-lg p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Contenido directo</p>
          <DonutChart pages={folderStats.directPages} folders={folderStats.directFolders} />
        </div>
      </div>

      {/* Direct children list */}
      <div>
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Contenido en esta carpeta</p>
        {children.length === 0 ? (
          <p className="text-sm text-text-secondary italic py-4">Esta carpeta está vacía. Crea una página o subcarpeta.</p>
        ) : (
          <div className="divide-y divide-border-subtle rounded-lg overflow-hidden bg-surface-elevated">
            {children.map((c) => (
              <Link
                key={c.id}
                href={`/kb/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-nav-hover transition-colors"
              >
                <PageIcon emoji={c.emoji} iconColor={c.iconColor} iconBg={c.iconBg} isFolder={c.isFolder} size={16} block />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{c.title || "Sin título"}</p>
                  <p className="text-[11px] text-text-secondary">
                    {c.isFolder ? "Carpeta" : c.isPublished ? "Publicada" : "Borrador"}
                    {c._count?.children ? ` · ${c._count.children} hijos` : ""}
                  </p>
                </div>
                <ChevronRight size={14} className="text-text-secondary shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Tree */}
      {tree.length > 0 && (
        <div>
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Vista de árbol</p>
          <div className="bg-surface-elevated rounded-lg p-3">
            {tree.map((node) => (
              <TreeBranch key={node.id} node={node} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
