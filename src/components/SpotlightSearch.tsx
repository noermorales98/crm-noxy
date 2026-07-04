"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  UserMultipleIcon,
  Building04Icon,
  BarChartIcon,
  Book01Icon,
  Task01Icon,
  BrowserIcon,
  Home01Icon,
  LockPasswordIcon,
  Folder01Icon,
} from "@hugeicons/core-free-icons";

type ResultType =
  | "page"
  | "contact"
  | "company"
  | "deal"
  | "kb"
  | "client"
  | "task"
  | "form"
  | "project";

type SearchResult = {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  href: string;
};

const RESULT_ICONS: Record<ResultType, typeof UserMultipleIcon> = {
  page: Home01Icon,
  contact: UserMultipleIcon,
  company: Building04Icon,
  deal: BarChartIcon,
  kb: Book01Icon,
  client: LockPasswordIcon,
  task: Task01Icon,
  form: BrowserIcon,
  project: Folder01Icon,
};

const RESULT_LABELS: Record<ResultType, string> = {
  page: "Sección",
  contact: "Contacto",
  company: "Empresa",
  deal: "Venta",
  kb: "Doc",
  client: "Cliente",
  task: "Tarea",
  form: "Formulario",
  project: "Proyecto",
};

export default function SpotlightSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setSelectedIndex(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 280);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex].href);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[18vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[3px]" />

      <div
        className="relative w-full max-w-[560px] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-border-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <HugeiconsIcon icon={Search01Icon} size={17} color="#9ca3af" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar"
            className="flex-1 text-sm text-text-primary placeholder:text-text-secondary bg-transparent border-none outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={13} />
            </button>
          )}
          <kbd className="shrink-0 text-[10px] text-text-secondary bg-surface-sidebar px-1.5 py-0.5 rounded font-mono border border-border-subtle">
            ESC
          </kbd>
        </div>

        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-1.5">
            {results.map((r, i) => {
              const Icon = RESULT_ICONS[r.type];
              const isSelected = i === selectedIndex;
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => navigate(r.href)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isSelected ? "bg-surface-sidebar" : "hover:bg-surface-sidebar"
                  }`}
                >
                  <span className="w-7 h-7 rounded-lg bg-surface-app flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={Icon} size={13} color="#9ca3af" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{r.title}</p>
                    {r.subtitle && (
                      <p className="text-xs text-text-secondary truncate">{r.subtitle}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-text-secondary bg-surface-app px-1.5 py-0.5 rounded shrink-0">
                    {RESULT_LABELS[r.type]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {query && !loading && results.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-text-secondary">
            Sin resultados para &ldquo;{query}&rdquo;
          </div>
        )}

        {!query && (
          <div className="px-5 py-5 text-xs text-text-secondary leading-relaxed">
            Busca secciones, contactos, empresas, ventas, docs (título y contenido markdown), clientes, tareas y más.
          </div>
        )}

        <div className="border-t border-border-subtle px-5 py-2.5 flex items-center gap-4">
          <span className="text-[10px] text-text-secondary">
            <kbd className="font-mono bg-surface-sidebar px-1 rounded">↑↓</kbd> navegar
          </span>
          <span className="text-[10px] text-text-secondary">
            <kbd className="font-mono bg-surface-sidebar px-1 rounded">↵</kbd> abrir
          </span>
          <span className="text-[10px] text-text-secondary">
            <kbd className="font-mono bg-surface-sidebar px-1 rounded">esc</kbd> cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
