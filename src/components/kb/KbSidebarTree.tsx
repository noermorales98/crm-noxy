"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { ChevronRight, ChevronDown, Plus, Trash2, GripVertical } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Book01Icon, FolderAddIcon } from "@hugeicons/core-free-icons";
import PageIcon from "@/src/components/kb/PageIcon";
import { useKbContext, type KbNode } from "@/src/context/KbContext";
import { fromDroppableId, toDroppableId } from "@/src/lib/kb-tree-dnd";

const ICON_SIZE = 16;
const ICON_COLOR = "#0B0B18";
const itemActive = "bg-nav-active text-text-primary font-medium";
const itemHover = "hover:bg-nav-hover";
const itemIdle = "text-text-primary";

function DeleteModal({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-brand-obsidian/35" />
      <div className="relative bg-white rounded-lg p-6 w-72 mx-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-text-primary mb-1">¿Eliminar página?</p>
        <p className="text-xs text-text-secondary mb-1 truncate font-medium">&quot;{name}&quot;</p>
        <p className="text-xs text-text-secondary mb-5">Las subpáginas se conservarán pero perderán su padre.</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-sm text-text-primary rounded-control hover:bg-surface-sidebar transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function KbCollapsedDropSlot({
  parentId,
  depth,
  isDragging,
  draggingId,
}: {
  parentId: string;
  depth: number;
  isDragging: boolean;
  draggingId: string | null;
}) {
  const dropDisabled = !isDragging || parentId === draggingId;

  return (
    <Droppable droppableId={toDroppableId(parentId)} isDropDisabled={dropDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          style={{ paddingLeft: `${28 + depth * 14}px` }}
          className={`transition-all rounded mx-1 ${
            !dropDisabled && snapshot.isDraggingOver
              ? "h-7 bg-nav-active mb-0.5"
              : "h-0 overflow-hidden pointer-events-none"
          }`}
        >
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

function KbTreeNode({
  page,
  index,
  depth,
  parentId,
  draggingId,
}: {
  page: KbNode;
  index: number;
  depth: number;
  parentId: string | null;
  draggingId: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const kb = useKbContext();
  const rowRef = useRef<HTMLDivElement>(null);
  const isActive = pathname === `/kb/${page.id}`;
  const expanded = kb.isExpanded(page.id);
  const children = kb.getChildren(page.id);
  const loaded = children !== null;
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const hasChildren = page._count.children > 0 || (loaded && (children?.length ?? 0) > 0);
  const isDragging = draggingId !== null;

  useEffect(() => {
    kb.registerActiveNode(page.id, isActive ? rowRef.current : null);
  }, [kb, page.id, isActive]);

  useEffect(() => {
    if (expanded && !loaded) {
      kb.loadChildren(page.id);
    }
  }, [expanded, loaded, page.id, kb]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    await kb.toggleExpand(page.id);
  };

  const createChild = async (isFolder = false) => {
    const res = await fetch("/api/kb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: isFolder ? "Nueva carpeta" : "Sin título", parentId: page.id, isFolder }),
    });
    if (res.ok) {
      const child = await res.json();
      await kb.syncTree({ type: "create", parentId: page.id });
      await kb.ensureExpanded([page.id]);
      if (!isFolder) router.push(`/kb/${child.id}`);
    }
  };

  const deletePage = async () => {
    await fetch(`/api/kb/${page.id}`, { method: "DELETE" });
    setDeleteConfirm(false);
    await kb.syncTree({ type: "delete", id: page.id, parentId });
    if (pathname === `/kb/${page.id}`) router.push("/kb");
  };

  const rowPad = 8 + depth * 14;

  return (
    <>
      {deleteConfirm && (
        <DeleteModal
          name={page.title || "Sin título"}
          onConfirm={deletePage}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}

      <Draggable draggableId={page.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={snapshot.isDragging ? "relative z-50" : undefined}
          >
            <div
              ref={rowRef}
              className={`group flex items-center gap-0.5 rounded-lg transition-colors cursor-pointer relative ${
                snapshot.isDragging
                  ? "bg-white shadow-md ring-1 ring-border-subtle"
                  : isActive
                    ? itemActive
                    : `${itemIdle} ${itemHover}`
              }`}
              style={{
                paddingLeft: `${rowPad}px`,
                paddingRight: "6px",
                paddingTop: "6px",
                paddingBottom: "6px",
              }}
            >
              <div
                {...provided.dragHandleProps}
                className={`w-4 h-4 flex items-center justify-center shrink-0 rounded text-text-secondary cursor-grab active:cursor-grabbing ${
                  isDragging || snapshot.isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
                title="Arrastrar"
                onClick={(e) => e.preventDefault()}
              >
                <GripVertical size={12} />
              </div>

              <button
                onClick={handleToggle}
                className={`w-4 h-4 flex items-center justify-center shrink-0 rounded text-text-primary ${
                  !hasChildren ? "opacity-0 pointer-events-none" : ""
                }`}
              >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>

              <Link href={`/kb/${page.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                <PageIcon
                  emoji={page.emoji}
                  iconColor={page.iconColor}
                  iconBg={page.iconBg}
                  isFolder={page.isFolder}
                  size={ICON_SIZE}
                  block
                />
                <span className="truncate text-sm font-medium">{page.title || "Sin título"}</span>
              </Link>

              <div
                className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
                  isActive ? "opacity-100" : ""
                }`}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    createChild(false);
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-nav-hover"
                  title="Nueva página"
                >
                  <Plus size={11} />
                </button>
                {page.isFolder && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      createChild(true);
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-nav-hover"
                    title="Nueva carpeta"
                  >
                    <HugeiconsIcon icon={FolderAddIcon} size={11} color="currentColor" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteConfirm(true);
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded text-text-secondary hover:text-red-600 hover:bg-red-50"
                  title="Eliminar"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          </div>
        )}
      </Draggable>

      {!expanded && (
        <KbCollapsedDropSlot
          parentId={page.id}
          depth={depth}
          isDragging={isDragging}
          draggingId={draggingId}
        />
      )}

      {expanded && (
        <KbDroppableList
          parentId={page.id}
          items={loaded ? (children ?? []) : []}
          depth={depth + 1}
          draggingId={draggingId}
          isLoading={!loaded}
        />
      )}
    </>
  );
}

function KbDroppableList({
  parentId,
  items,
  depth,
  draggingId,
  isLoading,
}: {
  parentId: string | null;
  items: KbNode[];
  depth: number;
  draggingId: string | null;
  isLoading?: boolean;
}) {
  const droppableId = toDroppableId(parentId);
  const emptyPad = 20 + depth * 14;

  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`min-h-[2px] transition-colors ${
            snapshot.isDraggingOver ? "rounded-lg bg-nav-hover/60" : ""
          }`}
        >
          {isLoading ? (
            <div
              className="h-6 mr-2 rounded bg-nav-hover animate-pulse"
              style={{ marginLeft: `${8 + depth * 14}px` }}
            />
          ) : items.length === 0 && !snapshot.isDraggingOver ? (
            <p className="text-xs text-text-secondary italic py-1" style={{ paddingLeft: `${emptyPad}px` }}>
              Vacío
            </p>
          ) : (
            items.map((page, index) => (
              <KbTreeNode
                key={page.id}
                page={page}
                index={index}
                depth={depth}
                parentId={parentId}
                draggingId={draggingId}
              />
            ))
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

export default function KbSidebarTree() {
  const router = useRouter();
  const kb = useKbContext();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const createRoot = async (isFolder = false) => {
    const res = await fetch("/api/kb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: isFolder ? "Nueva carpeta" : "Sin título", isFolder }),
    });
    if (res.ok) {
      const page = await res.json();
      await kb.syncTree({ type: "create", parentId: null });
      if (!isFolder) router.push(`/kb/${page.id}`);
    }
  };

  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;

      const clearDrag = () => setDraggingId(null);

      if (!destination) {
        clearDrag();
        return;
      }
      if (source.droppableId === destination.droppableId && source.index === destination.index) {
        clearDrag();
        return;
      }

      // Defer tree updates until @hello-pangea/dnd finishes its drag lifecycle.
      requestAnimationFrame(() => {
        clearDrag();
        requestAnimationFrame(() => {
          void kb.movePage({
            id: draggableId,
            fromParentId: fromDroppableId(source.droppableId),
            toParentId: fromDroppableId(destination.droppableId),
            fromIndex: source.index,
            toIndex: destination.index,
          });
        });
      });
    },
    [kb]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <Link
          href="/kb"
          className="flex items-center gap-2 min-w-0 text-sm font-medium text-text-primary hover:text-action-primary transition-colors"
        >
          <HugeiconsIcon icon={Book01Icon} size={ICON_SIZE} color={ICON_COLOR} />
          <span className="truncate italic">Inicio Docs</span>
        </Link>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => createRoot(false)}
            className="w-7 h-7 flex items-center justify-center rounded-control text-text-primary hover:bg-nav-hover"
            title="Nueva página"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => createRoot(true)}
            className="w-7 h-7 flex items-center justify-center rounded-control text-text-primary hover:bg-nav-hover"
            title="Nueva carpeta"
          >
            <HugeiconsIcon icon={FolderAddIcon} size={14} color={ICON_COLOR} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1 px-2">
        {kb.rootLoading && kb.rootPages.length === 0 ? (
          <div className="flex flex-col gap-1.5 px-2 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 rounded-lg bg-nav-hover animate-pulse" />
            ))}
          </div>
        ) : kb.rootPages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-text-secondary mb-2">Sin páginas</p>
            <button
              onClick={() => createRoot(false)}
              className="text-xs text-action-primary font-medium underline"
            >
              Crear primera página
            </button>
          </div>
        ) : (
          <DragDropContext
            onDragStart={(start) => setDraggingId(start.draggableId)}
            onDragEnd={onDragEnd}
          >
            <KbDroppableList
              parentId={null}
              items={kb.rootPages}
              depth={0}
              draggingId={draggingId}
            />
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
