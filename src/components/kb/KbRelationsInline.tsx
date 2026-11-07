"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Link01Icon, Add01Icon, Cancel01Icon, Search01Icon, FolderKanbanIcon,
  File01Icon, UserMultipleIcon, Building04Icon, Calendar01Icon, User02Icon, Briefcase01Icon,
} from "@hugeicons/core-free-icons";
import { displayRelationLabel } from "@/src/lib/kb-relations";
import {
  getMarkdownTheme,
  themeCssVars,
  type KbMarkdownThemeId,
} from "@/src/lib/kb-markdown-themes";

type KbRelationType = "PROJECT" | "FORM" | "CLIENT" | "COMPANY" | "APPOINTMENT_TYPE" | "CONTACT" | "DEAL";

interface Relation {
  id: string;
  entityType: KbRelationType;
  entityId: string;
  entityLabel: string;
}

interface SearchResult {
  id: string;
  label: string;
  subtitle?: string;
  type: KbRelationType;
  typeLabel: string;
}

const ENTITY_CFG: Record<KbRelationType, { label: string; icon: IconSvgElement; color: string; bg: string; href: (id: string) => string }> = {
  PROJECT:          { label: "Proyecto",       icon: FolderKanbanIcon, color: "text-violet-600", bg: "bg-violet-50 border-violet-100", href: id => `/projects/${id}` },
  FORM:             { label: "Formulario",     icon: File01Icon,    color: "text-blue-600",   bg: "bg-blue-50 border-blue-100",    href: id => `/forms/${id}` },
  CLIENT:           { label: "Cliente",        icon: UserMultipleIcon, color: "text-green-600",  bg: "bg-green-50 border-green-100",  href: id => `/clients/${id}` },
  COMPANY:          { label: "Empresa",        icon: Building04Icon, color: "text-amber-600",  bg: "bg-amber-50 border-amber-100",  href: id => `/companies/${id}` },
  APPOINTMENT_TYPE: { label: "Tipo de Cita",   icon: Calendar01Icon, color: "text-rose-600",   bg: "bg-rose-50 border-rose-100",    href: id => `/appointment-types/${id}` },
  CONTACT:          { label: "Contacto",       icon: User02Icon,    color: "text-cyan-600",   bg: "bg-cyan-50 border-cyan-100",    href: id => `/contacts/${id}` },
  DEAL:             { label: "Negocio",        icon: Briefcase01Icon, color: "text-orange-600", bg: "bg-orange-50 border-orange-100",href: () => `/pipeline` },
};

// ─── Add relation popover ─────────────────────────────────────────────────────

function AddRelationPopover({
  pageId,
  onAdded,
  onClose,
}: {
  pageId: string;
  onAdded: (rel: Relation) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState<KbRelationType | "">("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      const p = new URLSearchParams({ q });
      if (filterType) p.set("type", filterType);
      const res = await fetch(`/api/kb/search-entities?${p}`);
      if (res.ok) setResults(await res.json());
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, filterType]);

  const add = async (item: SearchResult) => {
    setAdding(item.id);
    const res = await fetch(`/api/kb/${pageId}/relations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: item.type, entityId: item.id, entityLabel: item.label }),
    });
    if (res.ok) onAdded(await res.json());
    setAdding(null);
  };

  const types: KbRelationType[] = ["PROJECT", "FORM", "CLIENT", "COMPANY", "APPOINTMENT_TYPE", "CONTACT", "DEAL"];

  return (
    <div
      ref={containerRef}
      className="crm-floating-menu absolute top-full left-0 mt-2 z-50 bg-surface-elevated rounded-lg border border-line w-80 overflow-hidden"
    >
      {/* Filter chips */}
      <div className="flex gap-1 flex-wrap p-3 border-b border-line">
        <button onClick={() => setFilterType("")} className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${filterType === "" ? "bg-action-primary text-action-primary-foreground" : "bg-surface-sidebar text-text-secondary hover:bg-nav-active"}`}>Todo</button>
        {types.map(t => (
          <button key={t} onClick={() => setFilterType(t)} className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${filterType === t ? "bg-action-primary text-action-primary-foreground" : "bg-surface-sidebar text-text-secondary hover:bg-nav-active"}`}>
            {ENTITY_CFG[t].label}
          </button>
        ))}
      </div>
      {/* Search */}
      <div className="px-3 pt-2 pb-1 relative">
        <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-6 top-1/2 -translate-y-0 text-text-secondary mt-0.5" />
        <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..."
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-line bg-surface-sidebar focus:bg-surface-elevated focus:outline-none focus:border-line transition-all" />
      </div>
      {/* Results */}
      <div className="max-h-56 overflow-y-auto p-2">
        {loading ? (
          <div className="flex flex-col gap-1">{[1,2,3].map(i => <div key={i} className="h-9 rounded-lg bg-surface-sidebar animate-pulse" />)}</div>
        ) : results.length === 0 ? (
          <p className="text-center text-xs text-text-secondary py-4">{q ? "Sin resultados" : "Escribe para buscar"}</p>
        ) : results.map(item => {
          const cfg = ENTITY_CFG[item.type];
          const Icon = cfg.icon;
          return (
            <button key={`${item.type}-${item.id}`} onClick={() => add(item)} disabled={adding === item.id}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-surface-sidebar transition-colors text-left disabled:opacity-50">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                <HugeiconsIcon icon={Icon} size={12} className={cfg.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{item.label}</p>
                <p className="text-xs text-text-secondary truncate">
                  {item.subtitle || item.typeLabel}
                </p>
              </div>
              {adding === item.id
                ? <div className="w-3 h-3 border-2 border-line border-t-action-primary rounded-full animate-spin" />
                : <HugeiconsIcon icon={Add01Icon} size={12} className="text-text-secondary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main inline component ────────────────────────────────────────────────────

export interface KbRelation {
  id: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  createdAt: string;
}

interface KbRelationsInlineProps {
  pageId: string;
  initialRelations: KbRelation[];
  markdownTheme?: KbMarkdownThemeId | string | null;
}

export default function KbRelationsInline({
  pageId,
  initialRelations,
  markdownTheme = "minimal",
}: KbRelationsInlineProps) {
  const [relations, setRelations] = useState<Relation[]>(initialRelations as Relation[]);
  const [showAdd, setShowAdd] = useState(false);
  const theme = getMarkdownTheme(markdownTheme);
  const themedPills = theme.id !== "minimal";

  const remove = async (id: string) => {
    await fetch(`/api/kb/${pageId}/relations/${id}`, { method: "DELETE" });
    setRelations(prev => prev.filter(r => r.id !== id));
  };

  const handleAdded = (rel: Relation) => {
    setRelations(prev => prev.some(r => r.id === rel.id) ? prev : [...prev, rel]);
    setShowAdd(false);
  };

  const wrapperProps = {
    className: `kb-relations kb-relations--${theme.id} relative`.trim(),
    ...(themedPills ? { style: themeCssVars(theme) } : {}),
  };

  if (relations.length === 0 && !showAdd) {
    return (
      <div {...wrapperProps}>
        <button
          onClick={() => setShowAdd(true)}
          className="flex min-h-11 items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <HugeiconsIcon icon={Link01Icon} size={14} />
          <span>Agregar relación con el CRM</span>
        </button>
        {showAdd && (
          <AddRelationPopover pageId={pageId} onAdded={handleAdded} onClose={() => setShowAdd(false)} />
        )}
      </div>
    );
  }

  return (
    <div {...wrapperProps} className={`${wrapperProps.className} flex flex-wrap items-center gap-1.5`}>
      {relations.map(rel => {
        const cfg = ENTITY_CFG[rel.entityType as KbRelationType];
        if (!cfg) return null;
        const Icon = cfg.icon;
        const pillClass = themedPills
          ? "kb-relation-pill group flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors"
          : `kb-relation-pill group flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${cfg.bg} ${cfg.color}`;
        return (
          <Link
            key={rel.id}
            href={cfg.href(rel.entityId)}
            className={pillClass}
          >
            <HugeiconsIcon icon={Icon} size={12} />
            <span className="max-w-[180px] truncate">
              {displayRelationLabel(rel.entityType, rel.entityLabel)}
            </span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(rel.id); }}
              className="-my-2 -mr-2 ml-0.5 flex size-11 items-center justify-center rounded-full text-current opacity-100 transition-opacity hover:opacity-70 lg:size-8 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
              title="Quitar relación"
              aria-label="Quitar relación"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={12} />
            </button>
          </Link>
        );
      })}

      {/* Add button */}
      <div className="relative">
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-line text-xs text-text-secondary hover:text-text-secondary hover:border-line transition-colors"
        >
          <HugeiconsIcon icon={Add01Icon} size={12} /> Agregar
        </button>
        {showAdd && (
          <AddRelationPopover pageId={pageId} onAdded={handleAdded} onClose={() => setShowAdd(false)} />
        )}
      </div>
    </div>
  );
}
