"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { useGlobalSearch } from "@/src/context/SearchContext";

interface Props {
  className?: string;
  compact?: boolean;
}

export default function GlobalSearchTrigger({ className = "w-full", compact = false }: Props) {
  const { openSearch } = useGlobalSearch();

  return (
    <button
      type="button"
      onClick={openSearch}
      className={`relative flex items-center h-9 rounded-full bg-surface-sidebar px-3.5 text-left transition-colors hover:bg-nav-hover focus-within:bg-surface-elevated ${className}`}
    >
      <HugeiconsIcon icon={Search01Icon} size={15} color="#787774" />
      <span className={`flex-1 ml-2 text-sm text-text-secondary truncate ${compact ? "hidden sm:inline" : ""}`}>
        Buscar
      </span>
      <kbd className="shrink-0 text-[10px] font-mono text-text-secondary bg-surface-elevated border border-border-subtle px-1.5 py-0.5 rounded">
        ⌘K
      </kbd>
    </button>
  );
}
