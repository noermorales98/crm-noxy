"use client";
import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

export interface SortOption {
  label: string;
  value: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
}

export interface HeaderActionMenuItem {
  label: string;
  onClick: () => void;
}

export interface HeaderAction {
  key: string;
  icon: any;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  spinning?: boolean;
  active?: boolean;
  menu?: HeaderActionMenuItem[];
}

export interface HeaderConfig {
  title?: ReactNode;
  titleBadge?: string | number;
  backHref?: string;
  sortOptions?: SortOption[];
  filterGroups?: FilterGroup[];
  addButton?: { label: string; onClick: () => void };
  actions?: HeaderAction[];
}

interface HeaderContextValue {
  config: HeaderConfig;
  setConfig: (config: HeaderConfig) => void;
  sortField: string;
  sortOrder: "asc" | "desc";
  setSort: (field: string) => void;
  activeFilters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  resetState: () => void;
}

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<HeaderConfig>({});
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const setConfig = useCallback((newConfig: HeaderConfig) => {
    setConfigState(newConfig);
  }, []);

  const setSort = useCallback((field: string) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        return field;
      }
      setSortOrder("asc");
      return field;
    });
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setActiveFilters((prev) => {
      if (!value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const resetState = useCallback(() => {
    setSortField("");
    setSortOrder("asc");
    setActiveFilters({});
  }, []);

  return (
    <HeaderContext.Provider value={{ config, setConfig, sortField, sortOrder, setSort, activeFilters, setFilter, resetState }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const ctx = useContext(HeaderContext);
  if (!ctx) throw new Error("useHeader must be used within HeaderProvider");
  return ctx;
}
