"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Link2, Plus, X, Search, ChevronRight, FolderKanban,
  FileText, Users, Building2, Calendar, User, Briefcase, ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type KbRelationType =
  | "PROJECT" | "FORM" | "CLIENT" | "COMPANY"
  | "APPOINTMENT_TYPE" | "CONTACT" | "DEAL";

interface Relation {
  id: string;
  entityType: KbRelationType;
  entityId: string;
  entityLabel: string;
  createdAt: string;
}

interface SearchResult {
  id: string;
  label: string;
  type: KbRelationType;
  typeLabel: string;
}

// ─── Config per entity type ───────────────────────────────────────────────────

const ENTITY_CONFIG: Record<KbRelationType, { label: string; icon: React.ElementType; color: string; href: (id: string) => string }> = {
  PROJECT:          { label: "Proyectos",       icon: FolderKanban, color: "bg-violet-50 text-violet-600", href: (id) => `/projects/${id}` },
  FORM:             { label: "Formularios",     icon: FileText,     color: "bg-blue-50 text-blue-600",    href: (id) => `/forms/${id}` },
  CLIENT:           { label: "Clientes",        icon: Users,        color: "bg-green-50 text-green-600",  href: (id) => `/clients/${id}` },
  COMPANY:          { label: "Empresas",        icon: Building2,    color: "bg-amber-50 text-amber-600",  href: (id) => `/companies/${id}` },
  APPOINTMENT_TYPE: { label: "Tipos de Cita",   icon: Calendar,     color: "bg-rose-50 text-rose-600",    href: (id) => `/appointment-types/${id}` },
  CONTACT:          { label: "Contactos",       icon: User,         color: "bg-cyan-50 text-cyan-600",    href: (id) => `/contacts/${id}` },
  DEAL:             { label: "Negocios",        icon: Briefcase,    color: "bg-orange-50 text-orange-600",href: (id) => `/pipeline` },
};

const TYPE_ORDER: KbRelationType[] = [
  "PROJECT", "FORM", "CLIENT", "COMPANY", "APPOINTMENT_TYPE", "CONTACT", "DEAL",
];

// ─── Add Relation Modal ───────────────────────────────────────────────────────

function AddRelationModal({
  pageId,
  onAdded,
  onClose,
}: {
  pageId: string;
  onAdded: (rel: Relation) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<KbRelationType | "">("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = useCallback(async (q: string, type: string) => {
    setLoading(true);
    const params = new URLSearchParams({ q });
    if (type) params.set("type", type);
    const res = await fetch(`/api/kb/search-entities?${params}`);
    if (res.ok) setResults(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query, filterType), 300);
    return () => clearTimeout(t);
  }, [query, filterType, search]);

  const addRelation = async (item: SearchResult) => {
    setAdding(item.id);
    const res = await fetch(`/api/kb/${pageId}/relations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: item.type, entityId: item.id, entityLabel: item.label }),
    });
    if (res.ok) {
      const rel = await res.json();
      onAdded(rel);
    }
    setAdding(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Link2 size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Agregar relación</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Filters + Search */}
        <div className="px-5 pt-4 flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterType("")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === "" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Todos
            </button>
            {TYPE_ORDER.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filterType === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {ENTITY_CONFIG[t].label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-gray-300 text-sm transition-all"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto px-5 py-3 flex flex-col gap-1">
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1,2,3].map((i) => <div key={i} className="h-10 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400">
              {query ? "Sin resultados para tu búsqueda" : "Escribe para buscar entidades"}
            </div>
          ) : (
            results.map((item) => {
              const cfg = ENTITY_CONFIG[item.type];
              const Icon = cfg.icon;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => addRelation(item)}
                  disabled={adding === item.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left w-full disabled:opacity-50"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.typeLabel}</p>
                  </div>
                  {adding === item.id ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin shrink-0" />
                  ) : (
                    <Plus size={14} className="text-gray-300 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface KbRelationsPanelProps {
  pageId: string;
  initialRelations: Relation[];
}

export default function KbRelationsPanel({ pageId, initialRelations }: KbRelationsPanelProps) {
  const [relations, setRelations] = useState<Relation[]>(initialRelations);
  const [showModal, setShowModal] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const removeRelation = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    await fetch(`/api/kb/${pageId}/relations/${id}`, { method: "DELETE" });
    setRelations((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAdded = (rel: Relation) => {
    setRelations((prev) => {
      if (prev.some((r) => r.id === rel.id)) return prev;
      return [...prev, rel];
    });
  };

  // Group by entity type
  const grouped = TYPE_ORDER.reduce((acc, type) => {
    const items = relations.filter((r) => r.entityType === type);
    if (items.length > 0) acc[type] = items;
    return acc;
  }, {} as Record<KbRelationType, Relation[]>);

  if (collapsed) {
    return (
      <div className="w-8 bg-white border-l border-gray-100 flex flex-col items-center py-3 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded transition-colors"
          title="Expandir relaciones"
        >
          <ChevronRight size={14} className="rotate-180" />
        </button>
        {relations.length > 0 && (
          <span className="mt-2 text-[10px] font-bold text-gray-400">{relations.length}</span>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="w-60 bg-white border-l border-gray-100 flex flex-col shrink-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Link2 size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Relaciones</span>
            {relations.length > 0 && (
              <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{relations.length}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowModal(true)}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Agregar relación"
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

        {/* Relations list */}
        <div className="flex-1 overflow-y-auto py-3 px-3">
          {Object.keys(grouped).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                <Link2 size={18} className="text-gray-200" />
              </div>
              <p className="text-xs text-gray-400 px-2">Conecta esta página con proyectos, formularios, clientes y más</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                + Agregar relación
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {TYPE_ORDER.filter((t) => grouped[t]).map((type) => {
                const cfg = ENTITY_CONFIG[type];
                const Icon = cfg.icon;
                return (
                  <div key={type}>
                    <div className="flex items-center gap-1.5 mb-1.5 px-1">
                      <Icon size={11} className="text-gray-400" />
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{cfg.label}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {grouped[type].map((rel) => (
                        <div key={rel.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${cfg.color}`}>
                            <Icon size={11} />
                          </div>
                          <Link
                            href={cfg.href(rel.entityId)}
                            className="flex-1 min-w-0 text-xs text-gray-700 font-medium truncate hover:text-blue-600 transition-colors"
                            title={rel.entityLabel}
                          >
                            {rel.entityLabel}
                          </Link>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Link
                              href={cfg.href(rel.entityId)}
                              className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-blue-500 transition-colors"
                              title="Ver en CRM"
                            >
                              <ExternalLink size={10} />
                            </Link>
                            <button
                              onClick={(e) => removeRelation(rel.id, e)}
                              className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-500 transition-colors"
                              title="Quitar relación"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {Object.keys(grouped).length > 0 && (
          <div className="px-3 py-2 border-t border-gray-50 shrink-0">
            <button
              onClick={() => setShowModal(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Plus size={11} /> Agregar relación
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <AddRelationModal
          pageId={pageId}
          onAdded={handleAdded}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
