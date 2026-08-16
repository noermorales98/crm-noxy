"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon, Folder01Icon, Search01Icon, FolderAddIcon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import PageIcon from "@/src/components/kb/PageIcon";
import KbInlineDocViewer from "@/src/components/KbInlineDocViewer";

interface KbPageRef {
  id: string;
  title: string;
  emoji: string | null;
  isFolder: boolean;
}

interface KbRelation {
  id: string;
  page: KbPageRef;
}

export default function ProjectDocsManager({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { addToast } = useToast();
  const [relations, setRelations] = useState<KbRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [search, setSearch] = useState("");
  const [allPages, setAllPages] = useState<KbPageRef[]>([]);
  const [saving, setSaving] = useState(false);
  const [viewingPageId, setViewingPageId] = useState<string | null>(null);

  const fetchRelations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kb/relations?entityType=PROJECT&entityId=${projectId}`);
      if (res.ok) setRelations(await res.json());
    } catch { console.error("Error cargando docs vinculados"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRelations(); }, [projectId]);

  const openPicker = async () => {
    setPickerOpen(true);
    try {
      const res = await fetch("/api/kb?all=true");
      if (res.ok) setAllPages(await res.json());
    } catch { console.error("Error cargando páginas de Docs"); }
  };

  const linkedIds = new Set(relations.map((r) => r.page.id));
  const filteredPages = allPages.filter(
    (p) => !linkedIds.has(p.id) && p.title.toLowerCase().includes(search.toLowerCase())
  );

  const linkExisting = async (pageId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/kb/${pageId}/relations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "PROJECT", entityId: projectId, entityLabel: projectName }),
      });
      if (res.ok) {
        addToast("Vinculado a Docs.", "success");
        setPickerOpen(false);
        setSearch("");
        fetchRelations();
      } else {
        addToast("Error al vincular.", "error");
      }
    } catch { addToast("Error de conexión.", "error"); }
    finally { setSaving(false); }
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setSaving(true);
    try {
      const createRes = await fetch("/api/kb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newFolderName.trim(), isFolder: true }),
      });
      if (!createRes.ok) { addToast("Error al crear la carpeta.", "error"); return; }
      const folder = await createRes.json();
      await linkExisting(folder.id);
      setCreatingFolder(false);
      setNewFolderName("");
    } catch { addToast("Error de conexión.", "error"); }
    finally { setSaving(false); }
  };

  const unlink = async (relationId: string, pageId: string) => {
    try {
      const res = await fetch(`/api/kb/${pageId}/relations/${relationId}`, { method: "DELETE" });
      if (res.ok) {
        setRelations((prev) => prev.filter((r) => r.id !== relationId));
      } else {
        addToast("Error al quitar el vínculo.", "error");
      }
    } catch { addToast("Error de conexión.", "error"); }
  };

  if (viewingPageId) {
    return <KbInlineDocViewer initialPageId={viewingPageId} onClose={() => setViewingPageId(null)} />;
  }

  return (
    <div className="bg-white border border-border-subtle rounded-lg p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Folder01Icon} size={20} color="#0891b2" />
          <h3 className="font-bold text-text-primary">Docs / Carpetas</h3>
        </div>
        <span className="bg-gray-100 text-text-secondary text-xs font-bold px-2.5 py-1 rounded-full">{relations.length}</span>
      </div>

      <div className="flex-1 min-h-[140px]">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-text-secondary">Cargando...</div>
        ) : relations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center h-full">
            <div className="text-gray-300 mb-2">
              <HugeiconsIcon icon={Folder01Icon} size={24} />
            </div>
            <p className="text-sm text-text-secondary">Sin documentos vinculados</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {relations.map((r) => (
              <li key={r.id} className="py-2.5 flex items-center justify-between gap-2 group">
                <button onClick={() => setViewingPageId(r.page.id)} className="flex items-center gap-2 min-w-0 text-sm font-medium text-text-primary hover:text-action-primary transition-colors">
                  <PageIcon emoji={r.page.emoji} isFolder={r.page.isFolder} size={15} />
                  <span className="truncate">{r.page.title}</span>
                </button>
                <button
                  onClick={() => unlink(r.id, r.page.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 rounded-md transition-all"
                  title="Quitar vínculo"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pt-4 border-t border-border-subtle mt-4 flex gap-2">
        <button
          onClick={openPicker}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-nav-hover rounded-lg py-2 transition-colors"
        >
          <HugeiconsIcon icon={Add01Icon} size={13} />
          Vincular existente
        </button>
        <button
          onClick={() => setCreatingFolder(true)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary border border-border-subtle hover:bg-nav-hover rounded-lg py-2 transition-colors"
        >
          <HugeiconsIcon icon={FolderAddIcon} size={13} />
          Crear carpeta
        </button>
      </div>

      {/* Picker modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4" onClick={() => setPickerOpen(false)}>
          <div className="bg-white rounded-lg w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <h4 className="text-sm font-bold text-text-primary">Vincular página o carpeta</h4>
              <button onClick={() => setPickerOpen(false)} className="text-text-secondary hover:text-text-primary">
                <HugeiconsIcon icon={Cancel01Icon} size={18} />
              </button>
            </div>
            <div className="p-3 border-b border-border-subtle flex items-center gap-2">
              <HugeiconsIcon icon={Search01Icon} size={14} color="#9ca3af" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en Docs..."
                className="flex-1 text-sm outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredPages.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">Sin resultados</p>
              ) : (
                filteredPages.map((p) => (
                  <button
                    key={p.id}
                    disabled={saving}
                    onClick={() => linkExisting(p.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-surface-sidebar text-left transition-colors disabled:opacity-50"
                  >
                    <PageIcon emoji={p.emoji} isFolder={p.isFolder} size={15} />
                    <span className="text-sm text-text-primary truncate">{p.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create folder modal */}
      {creatingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4" onClick={() => setCreatingFolder(false)}>
          <form onSubmit={createFolder} className="bg-white rounded-lg w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-text-primary mb-3">Crear carpeta para este proyecto</h4>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nombre de la carpeta"
              className="w-full px-3 py-2.5 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none text-sm mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setCreatingFolder(false)} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-nav-hover rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving || !newFolderName.trim()} className="px-4 py-2 text-sm font-semibold text-action-primary-foreground bg-action-primary hover:bg-black rounded-lg transition-colors disabled:opacity-50">
                {saving ? "Creando..." : "Crear y vincular"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
