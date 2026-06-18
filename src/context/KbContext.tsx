"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { moveBetweenLists, reorderList } from "@/src/lib/kb-tree-dnd";

export interface KbNode {
  id: string;
  title: string;
  emoji: string | null;
  iconColor?: string | null;
  iconBg?: string | null;
  isFolder: boolean;
  _count: { children: number };
}

interface KbContextValue {
  rootPages: KbNode[];
  rootLoading: boolean;
  isExpanded: (id: string) => boolean;
  toggleExpand: (id: string) => Promise<void>;
  ensureExpanded: (ids: string[]) => Promise<void>;
  getChildren: (parentId: string) => KbNode[] | null;
  loadChildren: (parentId: string) => Promise<KbNode[]>;
  refreshRoot: () => Promise<void>;
  invalidateChildren: (parentId: string) => void;
  registerActiveNode: (id: string, el: HTMLElement | null) => void;
  syncTree: (action: KbSyncAction) => Promise<void>;
  movePage: (params: KbMoveParams) => Promise<boolean>;
}

export type KbMoveParams = {
  id: string;
  fromParentId: string | null;
  toParentId: string | null;
  fromIndex: number;
  toIndex: number;
};

export type KbSyncAction =
  | { type: "update"; id: string; patch: Partial<Pick<KbNode, "title" | "emoji" | "iconColor" | "iconBg" | "isFolder">> }
  | { type: "create"; parentId: string | null }
  | { type: "delete"; id: string; parentId: string | null };

const STORAGE_KEY = "kb-tree-state";

const KbContext = createContext<KbContextValue | null>(null);

function loadExpandedFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as string[];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function saveExpandedToStorage(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export function KbProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [rootPages, setRootPages] = useState<KbNode[]>([]);
  const [rootLoading, setRootLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => loadExpandedFromStorage());
  const [childrenCache, setChildrenCache] = useState<Record<string, KbNode[]>>({});
  const cacheRef = useRef<Record<string, KbNode[]>>({});
  const loadingRef = useRef<Set<string>>(new Set());
  const activeNodeRef = useRef<HTMLElement | null>(null);
  const revealInFlight = useRef<string | null>(null);
  const rootPagesRef = useRef<KbNode[]>([]);

  useEffect(() => {
    rootPagesRef.current = rootPages;
  }, [rootPages]);

  const persistExpanded = useCallback((next: Set<string>) => {
    setExpandedIds(next);
    saveExpandedToStorage(next);
  }, []);

  const refreshRoot = useCallback(async () => {
    const res = await fetch("/api/kb");
    if (res.ok) setRootPages(await res.json());
    setRootLoading(false);
  }, []);

  useEffect(() => {
    refreshRoot();
  }, [refreshRoot]);

  const loadChildren = useCallback(async (parentId: string): Promise<KbNode[]> => {
    if (cacheRef.current[parentId]) return cacheRef.current[parentId];
    if (loadingRef.current.has(parentId)) {
      await new Promise((r) => setTimeout(r, 50));
      return cacheRef.current[parentId] ?? [];
    }
    loadingRef.current.add(parentId);
    try {
      const res = await fetch(`/api/kb?parentId=${parentId}`);
      if (!res.ok) return [];
      const data: KbNode[] = await res.json();
      cacheRef.current[parentId] = data;
      setChildrenCache({ ...cacheRef.current });
      return data;
    } finally {
      loadingRef.current.delete(parentId);
    }
  }, []);

  const getChildren = useCallback(
    (parentId: string) => childrenCache[parentId] ?? null,
    [childrenCache]
  );

  const invalidateChildren = useCallback((parentId: string) => {
    delete cacheRef.current[parentId];
    setChildrenCache({ ...cacheRef.current });
  }, []);

  const syncTree = useCallback(
    async (action: KbSyncAction) => {
      if (action.type === "update") {
        const { id, patch } = action;
        setRootPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
        const next = { ...cacheRef.current };
        let changed = false;
        for (const key of Object.keys(next)) {
          const idx = next[key].findIndex((c) => c.id === id);
          if (idx >= 0) {
            next[key] = [...next[key]];
            next[key][idx] = { ...next[key][idx], ...patch };
            changed = true;
          }
        }
        if (changed) {
          cacheRef.current = next;
          setChildrenCache(next);
        }
        return;
      }

      if (action.type === "delete") {
        const { id, parentId } = action;
        setRootPages((prev) => prev.filter((p) => p.id !== id));
        const next = { ...cacheRef.current };
        for (const key of Object.keys(next)) {
          next[key] = next[key].filter((c) => c.id !== id);
        }
        delete next[id];
        cacheRef.current = next;
        setChildrenCache(next);
        if (parentId) {
          invalidateChildren(parentId);
          if (expandedIds.has(parentId)) await loadChildren(parentId);
        }
        await refreshRoot();
        return;
      }

      // create
      await refreshRoot();
      if (action.parentId) {
        invalidateChildren(action.parentId);
        if (expandedIds.has(action.parentId)) await loadChildren(action.parentId);
      }
    },
    [expandedIds, invalidateChildren, loadChildren, refreshRoot]
  );

  const refreshParents = useCallback(
    async (parentIds: (string | null)[]) => {
      const unique = [...new Set(parentIds.filter((p): p is string => p !== null))];
      await refreshRoot();
      for (const pid of unique) {
        invalidateChildren(pid);
        if (expandedIds.has(pid)) await loadChildren(pid);
      }
    },
    [expandedIds, invalidateChildren, loadChildren, refreshRoot]
  );

  const movePage = useCallback(
    async ({ id, fromParentId, toParentId, fromIndex, toIndex }: KbMoveParams): Promise<boolean> => {
      const readList = (parentId: string | null) =>
        parentId === null ? rootPagesRef.current : cacheRef.current[parentId] ?? [];

      const applyLocal = () => {
        if (fromParentId === toParentId) {
          const reordered = reorderList(readList(fromParentId), fromIndex, toIndex);
          if (fromParentId === null) {
            setRootPages(reordered);
          } else {
            cacheRef.current[fromParentId] = reordered;
            setChildrenCache({ ...cacheRef.current });
          }
          return;
        }

        const { from, to } = moveBetweenLists(
          readList(fromParentId),
          readList(toParentId),
          fromIndex,
          toIndex
        );

        if (fromParentId === null) setRootPages(from);
        else cacheRef.current[fromParentId] = from;

        if (toParentId === null) setRootPages(to);
        else cacheRef.current[toParentId] = to;

        setChildrenCache({ ...cacheRef.current });
      };

      applyLocal();

      if (toParentId) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.add(toParentId);
          saveExpandedToStorage(next);
          return next;
        });
        invalidateChildren(toParentId);
        await loadChildren(toParentId);
      }

      try {
        const res = await fetch("/api/kb/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, parentId: toParentId, index: toIndex }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("[kb move]", err);
          await refreshParents([fromParentId, toParentId]);
          return false;
        }
        return true;
      } catch (e) {
        console.error("[kb move]", e);
        await refreshParents([fromParentId, toParentId]);
        return false;
      }
    },
    [loadChildren, refreshParents]
  );

  const ensureExpanded = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      setExpandedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        saveExpandedToStorage(next);
        return next;
      });
      for (const id of ids) {
        await loadChildren(id);
      }
    },
    [loadChildren]
  );

  const toggleExpand = useCallback(
    async (id: string) => {
      if (expandedIds.has(id)) {
        const next = new Set(expandedIds);
        next.delete(id);
        persistExpanded(next);
        return;
      }
      await loadChildren(id);
      persistExpanded(new Set([...expandedIds, id]));
    },
    [expandedIds, loadChildren, persistExpanded]
  );

  const isExpanded = useCallback((id: string) => expandedIds.has(id), [expandedIds]);

  const registerActiveNode = useCallback(
    (id: string, el: HTMLElement | null) => {
      if (pathname === `/kb/${id}` && el) activeNodeRef.current = el;
    },
    [pathname]
  );

  const revealActivePage = useCallback(
    async (pageId: string) => {
      if (revealInFlight.current === pageId) return;
      revealInFlight.current = pageId;
      try {
        const res = await fetch(`/api/kb/${pageId}`);
        if (!res.ok) return;
        const data = await res.json();
        const ancestorIds: string[] = data.ancestorIds ?? [];
        await ensureExpanded(ancestorIds);
        requestAnimationFrame(() => {
          activeNodeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
      } finally {
        revealInFlight.current = null;
      }
    },
    [ensureExpanded]
  );

  useEffect(() => {
    const match = pathname.match(/^\/kb\/([^/]+)$/);
    if (match?.[1]) revealActivePage(match[1]);
  }, [pathname, revealActivePage]);

  return (
    <KbContext.Provider
      value={{
        rootPages,
        rootLoading,
        isExpanded,
        toggleExpand,
        ensureExpanded,
        getChildren,
        loadChildren,
        refreshRoot,
        invalidateChildren,
        registerActiveNode,
        syncTree,
        movePage,
      }}
    >
      {children}
    </KbContext.Provider>
  );
}

export function useKbContext() {
  const ctx = useContext(KbContext);
  if (!ctx) throw new Error("useKbContext must be used within KbProvider");
  return ctx;
}

export function useOptionalKbContext() {
  return useContext(KbContext);
}
