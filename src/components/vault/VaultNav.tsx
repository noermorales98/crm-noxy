"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Search01Icon,
  User02Icon,
} from "@hugeicons/core-free-icons";
import AddClientModal from "./AddClientModal";
import ImportExistingModal from "./ImportExistingModal";

const ICON_COLOR = "#0B0B18";
const ICON_SIZE = 16;

const itemBase = "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors";
const itemActive = "bg-nav-active text-text-primary font-medium";
const itemHover = "hover:bg-nav-hover";
const itemIdle = "text-text-primary";

function navItemClass(isActive: boolean, extra = "") {
  return `${itemBase} ${isActive ? itemActive : `${itemIdle} ${itemHover}`} ${extra}`.trim();
}

type VaultClient = { id: string; name: string; _count?: { vaultEntries: number } };

export default function VaultNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [clients, setClients] = useState<VaultClient[]>([]);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchClients = useCallback(async () => {
    const res = await fetch("/api/clients");
    if (res.ok) setClients(await res.json());
  }, []);

  useEffect(() => {
    if (session?.user) fetchClients();
  }, [session, fetchClients]);

  const filtered = clients.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleClientAdded(client: { id: string; name: string }) {
    setShowAddModal(false);
    setShowImportModal(false);
    fetchClients();
    router.push(`/boveda/${client.id}`);
  }

  async function deleteClient(id: string) {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!res.ok) return;

      const viewingDeleted = pathname === `/boveda/${id}`;
      const next = clients.filter((c) => c.id !== id);
      setClients(next);

      if (viewingDeleted) {
        router.push(next.length > 0 ? `/boveda/${next[0].id}` : "/boveda");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="px-3 pt-1 pb-3 shrink-0 flex flex-col gap-1.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full min-h-11 flex items-center justify-center gap-2 bg-action-primary text-action-primary-foreground py-2.5 px-3 rounded-control text-sm font-semibold hover:bg-action-secondary transition-colors duration-200 motion-reduce:transition-none"
          >
            <HugeiconsIcon icon={Add01Icon} size={ICON_SIZE} color="white" />
            Nuevo cliente
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="w-full flex items-center justify-center gap-2 border border-border-subtle text-text-primary py-2 px-3 rounded-lg text-sm font-medium hover:bg-nav-hover transition-colors"
          >
            Agregar existente
          </button>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-sidebar border border-border-subtle focus-within:ring-1 focus-within:ring-border-subtle">
            <HugeiconsIcon icon={Search01Icon} size={ICON_SIZE} color="#9ca3af" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente…"
              className="flex-1 text-sm bg-transparent focus:outline-none min-w-0"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-xs text-text-secondary px-1 py-2 italic">
              {clients.length === 0 ? "Sin clientes" : "Sin resultados"}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filtered.map((client) => {
                const isActive = pathname === `/boveda/${client.id}`;
                const count = client._count?.vaultEntries ?? 0;
                return (
                  <div key={client.id} className="group relative">
                    <Link
                      href={`/boveda/${client.id}`}
                      className={navItemClass(isActive, "justify-between pr-8 w-full")}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <HugeiconsIcon icon={User02Icon} size={ICON_SIZE} color={ICON_COLOR} />
                        <span className="truncate">{client.name}</span>
                      </span>
                      {count > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-nav-hover text-text-secondary shrink-0">
                          {count}
                        </span>
                      )}
                    </Link>
                    {deletingId === client.id ? (
                      <div className="absolute inset-0 flex items-center justify-end gap-1 pr-1 bg-surface-elevated rounded-lg">
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-[10px] px-2 py-1 rounded hover:bg-nav-hover text-text-secondary transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => deleteClient(client.id)}
                          className="text-[10px] px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 font-medium transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(client.id)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-nav-active rounded-md transition-all"
                        title="Eliminar cliente"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-text-secondary"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddClientModal
          onSuccess={handleClientAdded}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {showImportModal && (
        <ImportExistingModal
          onSuccess={handleClientAdded}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </>
  );
}
