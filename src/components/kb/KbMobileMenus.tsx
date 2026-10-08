"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderInput, FolderPlus, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useOptionalKbContext } from "@/src/context/KbContext";

interface FolderRow {
  id: string;
  title: string;
  parentId: string | null;
  isFolder: boolean;
}

function containsFolder(pages: FolderRow[], ancestorId: string, nodeId: string): boolean {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const seen = new Set<string>();
  let current = byId.get(nodeId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    if (seen.has(current.id)) return false;
    seen.add(current.id);
    current = byId.get(current.parentId);
  }
  return false;
}

function folderDepth(pages: FolderRow[], id: string): number {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const seen = new Set<string>();
  let depth = 0;
  let current = byId.get(id);
  while (current?.parentId) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    depth += 1;
    current = byId.get(current.parentId);
  }
  return depth;
}

export function KbCreateMenu({
  disabled,
  onCreate,
}: {
  disabled?: boolean;
  onCreate: (isFolder: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label="Agregar"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="flex size-9 items-center justify-center rounded-lg text-text-primary hover:bg-nav-hover disabled:opacity-50"
      >
        <Plus size={18} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-border-subtle bg-white shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text-primary hover:bg-nav-hover"
            onClick={() => {
              setOpen(false);
              onCreate(false);
            }}
          >
            <Plus size={14} />
            Nueva página
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text-primary hover:bg-nav-hover"
            onClick={() => {
              setOpen(false);
              onCreate(true);
            }}
          >
            <FolderPlus size={14} />
            Nueva carpeta
          </button>
        </div>
      )}
    </div>
  );
}

export function KbItemMenu({
  id,
  title,
  parentId,
  isFolder,
  onChanged,
}: {
  id: string;
  title: string;
  parentId: string | null;
  isFolder: boolean;
  onChanged: () => void;
}) {
  const router = useRouter();
  const kb = useOptionalKbContext();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [moving, setMoving] = useState(false);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [moveError, setMoveError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!menuPos) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setMenuPos(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuPos(null);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuPos]);

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = 132;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < menuHeight + 24 ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4;
    setMenuPos({ top, right: Math.max(8, window.innerWidth - rect.right) });
  }

  async function openMove() {
    setMenuPos(null);
    setMoveError("");
    setMoving(true);
    const res = await fetch("/api/kb?all=true");
    if (res.ok) {
      const pages = (await res.json()) as FolderRow[];
      setFolders(pages.filter((page) => page.isFolder));
    } else {
      setFolders([]);
      setMoveError("No se pudieron cargar las carpetas.");
    }
  }

  async function moveTo(destinationId: string | null) {
    setMoveError("");
    const res = await fetch("/api/kb/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, parentId: destinationId, index: 0 }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setMoveError(body.error || "No se pudo mover.");
      return;
    }
    await kb?.refreshRoot();
    if (parentId) kb?.invalidateChildren(parentId);
    if (destinationId) kb?.invalidateChildren(destinationId);
    setMoving(false);
    onChanged();
  }

  async function remove() {
    await fetch(`/api/kb/${id}`, { method: "DELETE" });
    await kb?.syncTree({ type: "delete", id, parentId });
    setConfirmDelete(false);
    onChanged();
  }

  const destinations = [
    { id: null as string | null, title: "Inicio Docs", depth: 0 },
    ...folders
      .filter((folder) => folder.id !== id && !(isFolder && containsFolder(folders, id, folder.id)))
      .sort((a, b) => a.title.localeCompare(b.title, "es"))
      .map((folder) => ({
        id: folder.id,
        title: folder.title || "Sin título",
        depth: folderDepth(folders, folder.id),
      })),
  ];

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Acciones de ${title || "Sin título"}`}
        aria-expanded={menuPos !== null}
        aria-haspopup="menu"
        onClick={openMenu}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-nav-hover hover:text-text-primary"
      >
        <MoreHorizontal size={18} />
      </button>
      {menuPos && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-40 w-40 overflow-hidden rounded-lg border border-border-subtle bg-white shadow-lg"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text-primary hover:bg-nav-hover"
            onClick={() => {
              setMenuPos(null);
              router.push(`/kb/${id}`);
            }}
          >
            <Pencil size={14} />
            Editar
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text-primary hover:bg-nav-hover"
            onClick={() => void openMove()}
          >
            <FolderInput size={14} />
            Mover
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              setMenuPos(null);
              setConfirmDelete(true);
            }}
          >
            <Trash2 size={14} />
            Borrar
          </button>
        </div>
      )}
      {moving && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" onClick={() => setMoving(false)}>
          <div className="absolute inset-0 bg-brand-obsidian/35" />
          <div
            role="dialog"
            aria-label="Mover"
            className="relative max-h-[70vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-sm sm:rounded-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-semibold text-text-primary">Mover «{title || "Sin título"}»</p>
            <p className="mb-3 mt-1 text-xs text-text-secondary">Elige la carpeta de destino.</p>
            <ul className="flex flex-col">
              {destinations.map((destination) => {
                const current = destination.id === parentId;
                return (
                  <li key={destination.id ?? "root"}>
                    <button
                      type="button"
                      disabled={current}
                      onClick={() => void moveTo(destination.id)}
                      className="flex min-h-11 w-full items-center rounded-lg px-2 text-left text-sm text-text-primary hover:bg-nav-hover disabled:text-text-secondary"
                      style={{ paddingLeft: 8 + destination.depth * 14 }}
                    >
                      {destination.title}
                      {current ? " · aquí" : ""}
                    </button>
                  </li>
                );
              })}
            </ul>
            {moveError && <p className="mt-2 text-xs text-red-600">{moveError}</p>}
          </div>
        </div>
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center" onClick={() => setConfirmDelete(false)}>
          <div className="absolute inset-0 bg-brand-obsidian/35" />
          <div className="relative mx-4 w-72 rounded-lg bg-white p-6" onClick={(event) => event.stopPropagation()}>
            <p className="mb-1 text-sm font-semibold text-text-primary">¿Eliminar?</p>
            <p className="mb-5 truncate text-xs text-text-secondary">«{title || "Sin título"}»</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg py-2 text-sm text-text-primary hover:bg-surface-sidebar"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
