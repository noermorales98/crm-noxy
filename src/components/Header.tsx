"use client";
import { Search, SlidersHorizontal, ArrowDownUp, Plus, Settings, LogOut, User, ArrowUp, ArrowDown, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useHeader } from "@/src/context/HeaderContext";

export default function Header() {
  const { data: session } = useSession();
  const { config, searchQuery, setSearchQuery, sortField, sortOrder, setSort, activeFilters, setFilter } = useHeader();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setFiltersOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasSortOptions = config.sortOptions && config.sortOptions.length > 0;
  const hasFilterGroups = config.filterGroups && config.filterGroups.length > 0;
  const activeFilterCount = Object.keys(activeFilters).length;
  const currentSortLabel = config.sortOptions?.find((o) => o.value === sortField)?.label;

  return (
    <header className="h-20 px-8 flex items-center justify-between border-b border-gray-100/0 bg-transparent flex-shrink-0">

      {/* Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative flex items-center w-full h-10 rounded-full bg-white/50 backdrop-blur-sm px-4 focus-within:ring-2 focus-within:ring-gray-200 transition-all">
          <Search size={18} className="text-gray-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={config.searchPlaceholder || "Buscar..."}
            className="w-full bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-gray-600 ml-1">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">

        {/* Sort */}
        {hasSortOptions && (
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => { setSortOpen(!sortOpen); setFiltersOpen(false); }}
              className={`flex items-center gap-2 text-sm font-medium transition-colors px-3 py-2 rounded-lg ${sortField ? "bg-gray-900 text-white" : "text-gray-700 hover:text-gray-900 hover:bg-white/60"}`}
            >
              <ArrowDownUp size={15} />
              {currentSortLabel ? (
                <span className="flex items-center gap-1">
                  {currentSortLabel}
                  {sortOrder === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                </span>
              ) : "Ordenar por"}
            </button>

            {sortOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-100 py-1 z-40">
                {config.sortOptions!.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSort(opt.value); setSortOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${sortField === opt.value ? "text-gray-900 font-semibold bg-gray-50" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    {opt.label}
                    {sortField === opt.value && (
                      sortOrder === "asc" ? <ArrowUp size={13} className="text-gray-500" /> : <ArrowDown size={13} className="text-gray-500" />
                    )}
                  </button>
                ))}
                {sortField && (
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button onClick={() => { setSort(""); setSortOpen(false); }} className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 text-left">
                      Quitar orden
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        {hasFilterGroups && (
          <div className="relative" ref={filtersRef}>
            <button
              onClick={() => { setFiltersOpen(!filtersOpen); setSortOpen(false); }}
              className={`flex items-center gap-2 text-sm font-medium transition-colors px-3 py-2 rounded-lg ${activeFilterCount > 0 ? "bg-gray-900 text-white" : "text-gray-700 hover:text-gray-900 hover:bg-white/60"}`}
            >
              <SlidersHorizontal size={15} />
              Filtros
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-gray-900 text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filtersOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 p-4 z-40 flex flex-col gap-4">
                {config.filterGroups!.map((group) => (
                  <div key={group.key}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.label}</p>
                    <select
                      value={activeFilters[group.key] || ""}
                      onChange={(e) => setFilter(group.key, e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-gray-400"
                    >
                      <option value="">Todos</option>
                      {group.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { config.filterGroups!.forEach((g) => setFilter(g.key, "")); }}
                    className="text-sm text-red-500 hover:text-red-700 text-left"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add Button */}
        {config.addButton && (
          <button
            onClick={config.addButton.onClick}
            className="flex items-center gap-2 bg-[#2d2d2d] hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-sm transition-all"
          >
            <Plus size={16} />
            {config.addButton.label}
          </button>
        )}

        {/* User Menu */}
        <div className="relative ml-1" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-9 h-9 rounded-full bg-[#2d2d2d] flex items-center justify-center text-white font-semibold text-sm hover:bg-black transition-colors"
            title={session?.user?.name || "Usuario"}
          >
            {session?.user?.name?.[0]?.toUpperCase() || "U"}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.name || "Usuario"}</p>
                <p className="text-xs text-gray-400 truncate">{session?.user?.email || ""}</p>
              </div>
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User size={16} className="text-gray-400" />
                Mi perfil
              </Link>
              <Link
                href="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings size={16} className="text-gray-400" />
                Configuración
              </Link>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </header>
  );
}
