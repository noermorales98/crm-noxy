"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import SpotlightSearch from "@/src/components/SpotlightSearch";

type SearchContextValue = {
  openSearch: () => void;
  closeSearch: () => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <SearchContext.Provider value={{ openSearch, closeSearch }}>
      {children}
      <SpotlightSearch open={open} onClose={closeSearch} />
    </SearchContext.Provider>
  );
}

export function useGlobalSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useGlobalSearch must be used within SearchProvider");
  return ctx;
}
