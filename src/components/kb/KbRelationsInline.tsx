"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Link2, Plus, X, Search, FolderKanban,
  FileText, Users, Building2, Calendar, User, Briefcase, ExternalLink,
} from "lucide-react";

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
  type: KbRelationType;
  typeLabel: string;
}

const ENTITY_CFG: Record<KbRelationType, { label: string; icon: React.ElementType; color: string; bg: string; href: (id: string) => string }> = {
  PROJECT:          { label: "Proyecto",       icon: FolderKanban, color: "text-violet-600", bg: "bg-violet-50 border-violet-100", href: id => `/projects/${id}` },
  FORM:             { label: "Formulario",     icon: FileText,     color: "text-blue-600",   bg: "bg-blue-50 border-blue-100",    href: id => `/forms/${id}` },
  CLIENT:           { label: "Cliente",        icon: Users,        color: "text-green-600",  bg: "bg-green-50 border-green-100",  href: id => `/clients/${id}` },
  COMPANY:          { label: "Empresa",        icon: Building2,    color: "text-amber-600",  bg: "bg-amber-50 border-amber-100",  href: id => `/companies/${id}` },
  APPOINTMENT_TYPE: { label: "Tipo de Cita",   icon: Calendar,     color: "text-rose-600",   bg: "bg-rose-50 border-rose-100",    href: id => `/appointment-types/${id}` },
  CONTACT:          { label: "Contacto",       icon: User,         color: "text-cyan-600",   bg: "bg-cyan-50 border-cyan-100",    href: id => `/contacts/${id}` },
  DEAL:             { label: "Negocio",        icon: Briefcase,    color: "text-orange-600", bg: "bg-orange-50 border-orange-100",href: () => `/pipeline` },
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
      className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 overflow-hidden"
    >
      {/* Filter chips */}
      <div className="flex gap-1 flex-wrap p-3 border-b border-gray-50">
        <button onClick={() => setFilterType("")} className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${filterType === "" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>Todo</button>
        {types.map(t => (
          <button key={t} onClick={() => setFilterType(t)} className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${filterType === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
            {ENTITY_CFG[t].label}
          </button>
        ))}
      </div>
      {/* Search */}
      <div className="px-3 pt-2 pb-1 relative">
        <Search size={13} className="absolute left-6 top-1/2 -translate-y-0 text-gray-300 mt-0.5" />
        <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..."
          className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-gray-300 transition-all" />
      </div>
      {/* Results */}
      <div className="max-h-56 overflow-y-auto p-2">
        {loading ? (
          <div className="flex flex-col gap-1">{[1,2,3].map(i => <div key={i} className="h-9 rounded-xl bg-gray-100 animate-pulse" />)}</div>
        ) : results.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-4">{q ? "Sin resultados" : "Escribe para buscar"}</p>
        ) : results.map(item => {
          const cfg = ENTITY_CFG[item.type];
          const Icon = cfg.icon;
          return (
            <button key={`${item.type}-${item.id}`} onClick={() => add(item)} disabled={adding === item.id}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left disabled:opacity-50">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                <Icon size={12} className={cfg.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{item.label}</p>
                <p className="text-[10px] text-gray-400">{item.typeLabel}</p>
              </div>
              {adding === item.id
                ? <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                : <Plus size={11} className="text-gray-300" />}
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
}

export default function KbRelationsInline({ pageId, initialRelations }: KbRelationsInlineProps) {
  const [relations, setRelations] = useState<Relation[]>(initialRelations as Relation[]);
  const [showAdd, setShowAdd] = useState(false);

  const remove = async (id: string) => {
    await fetch(`/api/kb/${pageId}/relations/${id}`, { method: "DELETE" });
    setRelations(prev => prev.filter(r => r.id !== id));
  };

  const handleAdded = (rel: Relation) => {
    setRelations(prev => prev.some(r => r.id === rel.id) ? prev : [...prev, rel]);
    setShowAdd(false);
  };

  if (relations.length === 0 && !showAdd) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-gray-500 transition-colors py-1"
        >
          <Link2 size={12} />
          <span>Agregar relación con el CRM</span>
        </button>
        {showAdd && (
          <AddRelationPopover pageId={pageId} onAdded={handleAdded} onClose={() => setShowAdd(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 relative">
      {relations.map(rel => {
        const cfg = ENTITY_CFG[rel.entityType as KbRelationType];
        if (!cfg) return null;
        const Icon = cfg.icon;
        return (
          <Link
            key={rel.id}
            href={cfg.href(rel.entityId)}
            className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors hover:shadow-sm ${cfg.bg} ${cfg.color}`}
          >
            <Icon size={11} />
            <span className="max-w-[140px] truncate">{rel.entityLabel}</span>
            <span className="text-[9px] opacity-50">{cfg.label}</span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(rel.id); }}
              className="opacity-0 group-hover:opacity-100 ml-0.5 text-current hover:opacity-100 transition-opacity"
              title="Quitar relación"
            >
              <X size={10} />
            </button>
          </Link>
        );
      })}

      {/* Add button */}
      <div className="relative">
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-gray-200 text-xs text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
        >
          <Plus size={11} /> Agregar
        </button>
        {showAdd && (
          <AddRelationPopover pageId={pageId} onAdded={handleAdded} onClose={() => setShowAdd(false)} />
        )}
      </div>
    </div>
  );
}
