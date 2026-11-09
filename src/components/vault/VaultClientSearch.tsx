"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { ContactAvatar } from "@/src/components/ui/EntityIcon";

type VaultClient = { id: string; name: string };

/** Buscador de clientes de la bóveda: vive en la página (no en el sidebar) y abre el cliente elegido. */
export default function VaultClientSearch({ clients, currentId }: { clients: VaultClient[]; currentId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((client) => client.id !== currentId && (!q || client.name.toLowerCase().includes(q))).slice(0, 8);
  }, [clients, currentId, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={wrap} className="relative w-full max-w-sm">
      <label className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface-elevated px-4 lg:min-h-10">
        <HugeiconsIcon icon={Search01Icon} size={16} aria-hidden="true" className="shrink-0 text-text-secondary-strong" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && results[0]) {
              router.push(`/boveda/${results[0].id}`);
              setOpen(false);
              setQuery("");
            }
          }}
          placeholder="Buscar cliente…"
          aria-label="Buscar cliente de la bóveda"
          className="min-w-0 flex-1 border-none bg-transparent text-sm text-text-primary outline-none! placeholder:text-text-secondary focus:outline-none! focus-visible:outline-none!"
        />
      </label>
      {open && (
        <ul role="listbox" aria-label="Clientes" className="crm-floating-menu absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-surface border border-line bg-surface-elevated py-1">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-text-secondary">Sin resultados</li>
          ) : (
            results.map((client) => (
              <li key={client.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => {
                    router.push(`/boveda/${client.id}`);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm text-text-primary hover:bg-nav-hover lg:min-h-10"
                >
                  <ContactAvatar />
                  <span className="truncate">{client.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
