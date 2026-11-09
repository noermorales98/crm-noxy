"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  User02Icon,
} from "@hugeicons/core-free-icons";
import AddClientModal from "./AddClientModal";
import ImportExistingModal from "./ImportExistingModal";
import DeleteClientVaultDialog from "@/src/components/DeleteClientVaultDialog";

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

export default function VaultNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [clients, setClients] = useState<VaultClient[]>([]);
  const [deleting, setDeleting] = useState<VaultClient | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchClients = useCallback(async () => {
    const res = await fetch("/api/clients");
    if (res.ok) setClients(await res.json());
  }, []);

  useEffect(() => {
    if (session?.user) fetchClients();
  }, [session, fetchClients]);

  const filtered = clients;

  function handleClientAdded(client: { id: string; name: string }) {
    setShowAddModal(false);
    setShowImportModal(false);
    fetchClients();
    onNavigate?.();
    router.push(`/boveda/${client.id}`);
  }

  async function confirmDelete(vault: "delete" | "keep") {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/clients/${deleting.id}?vault=${vault}`, { method: "DELETE" });
      if (!res.ok) return;

      if (vault === "delete") {
        const viewingDeleted = pathname === `/boveda/${deleting.id}`;
        const next = clients.filter((c) => c.id !== deleting.id);
        setClients(next);
        if (viewingDeleted) {
          onNavigate?.();
          router.push(next.length > 0 ? `/boveda/${next[0].id}` : "/boveda");
        }
      }
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="pb-2 shrink-0 flex flex-col">
          <button
            onClick={() => setShowAddModal(true)}
            className="relative isolate flex min-h-11 w-full items-center gap-2 px-3 text-sm font-medium text-text-primary outline-none before:absolute before:inset-x-0 before:inset-y-1 before:-z-10 before:rounded-control before:border before:border-control before:bg-surface-elevated hover:before:bg-nav-hover focus-visible:before:ring-2 focus-visible:before:ring-focus"
          >
            <HugeiconsIcon icon={Add01Icon} size={ICON_SIZE} aria-hidden="true" />
            Nuevo cliente
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex min-h-11 w-full items-center gap-2 px-3 text-sm font-medium text-text-secondary-strong hover:text-text-primary rounded-control outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Agregar existente
          </button>
        </div>

        <div className="pb-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-text-secondary px-1 py-2 italic">
              Sin clientes
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
                      onClick={onNavigate}
                      className={navItemClass(isActive, "justify-between pr-8 w-full")}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <HugeiconsIcon icon={User02Icon} size={ICON_SIZE} color={ICON_COLOR} />
                        <span className="truncate">{client.name}</span>
                      </span>
                      {count > 0 && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-nav-hover text-text-secondary shrink-0">
                          {count}
                        </span>
                      )}
                    </Link>
                    <button
                        onClick={() => setDeleting(client)}
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
      {deleting && (
        <DeleteClientVaultDialog
          name={deleting.name}
          vaultCount={deleting._count?.vaultEntries ?? 0}
          busy={deleteBusy}
          onCancel={() => { if (!deleteBusy) setDeleting(null); }}
          onKeepVault={() => confirmDelete("keep")}
          onDeleteVault={() => confirmDelete("delete")}
        />
      )}
    </>
  );
}
