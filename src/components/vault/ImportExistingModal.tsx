"use client";

import { useState, useEffect, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Building02Icon,
  User02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

type Company = { id: string; name: string };
type Contact = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: { id: string; name: string } | null;
};
type Client = { companyId?: string | null; contactId?: string | null };

export default function ImportExistingModal({
  onSuccess,
  onClose,
}: {
  onSuccess: (client: { id: string; name: string }) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"companies" | "contacts">("companies");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [usedCompanyIds, setUsedCompanyIds] = useState<Set<string>>(new Set());
  const [usedContactIds, setUsedContactIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [companiesRes, contactsRes, clientsRes] = await Promise.all([
        fetch("/api/companies"),
        fetch("/api/contacts"),
        fetch("/api/clients"),
      ]);
      if (companiesRes.ok) setCompanies(await companiesRes.json());
      if (contactsRes.ok) setContacts(await contactsRes.json());
      if (clientsRes.ok) {
        const clients: Client[] = await clientsRes.json();
        setUsedCompanyIds(new Set(clients.map((c) => c.companyId).filter(Boolean) as string[]));
        setUsedContactIds(new Set(clients.map((c) => c.contactId).filter(Boolean) as string[]));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const availableCompanies = companies.filter(
    (c) =>
      !usedCompanyIds.has(c.id) &&
      (!search || c.name.toLowerCase().includes(search.toLowerCase()))
  );

  const availableContacts = contacts.filter((c) => {
    if (usedContactIds.has(c.id)) return false;
    const fullName = `${c.firstName} ${c.lastName || ""}`.trim();
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      fullName.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.name.toLowerCase().includes(q)
    );
  });

  async function importCompany(company: Company) {
    setImportingId(company.id);
    setError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: company.name,
          companyId: company.id,
          monthlyFee: 0,
          currency: "USD",
          startDate: new Date().toISOString().slice(0, 10),
          billingDay: 1,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Error al agregar la empresa.");
        return;
      }
      onSuccess(await res.json());
    } catch {
      setError("Error de conexión.");
    } finally {
      setImportingId(null);
    }
  }

  async function importContact(contact: Contact) {
    setImportingId(contact.id);
    setError("");
    const fullName = `${contact.firstName} ${contact.lastName || ""}`.trim();
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          contactId: contact.id,
          companyId: contact.company?.id || null,
          contactName: fullName,
          email: contact.email || null,
          phone: contact.phone || null,
          monthlyFee: 0,
          currency: "USD",
          startDate: new Date().toISOString().slice(0, 10),
          billingDay: 1,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Error al agregar el contacto.");
        return;
      }
      onSuccess(await res.json());
    } catch {
      setError("Error de conexión.");
    } finally {
      setImportingId(null);
    }
  }

  const emptyMessage =
    tab === "companies"
      ? search
        ? "Sin empresas que coincidan."
        : "No hay empresas disponibles para agregar."
      : search
        ? "Sin contactos que coincidan."
        : "No hay contactos disponibles para agregar.";

  return (
    <div className="fixed inset-0 bg-brand-obsidian/35 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle shrink-0">
          <h2 className="text-base font-bold text-text-primary">Agregar existente</h2>
          <button onClick={onClose} className="p-1 text-text-secondary hover:text-text-primary rounded-lg">
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2 shrink-0 flex flex-col gap-3">
          <div className="flex gap-1 p-1 bg-surface-sidebar rounded-lg">
            <button
              type="button"
              onClick={() => setTab("companies")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                tab === "companies"
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Empresas
            </button>
            <button
              type="button"
              onClick={() => setTab("contacts")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                tab === "contacts"
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Contactos
            </button>
          </div>
          <div className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-sidebar border border-border-subtle focus-within:ring-1 focus-within:ring-border-subtle">
            <HugeiconsIcon icon={Search01Icon} size={15} color="#9ca3af" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "companies" ? "Buscar empresa…" : "Buscar contacto…"}
              className="flex-1 text-sm bg-transparent focus:outline-none min-w-0"
            />
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-100">
              {error}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
            </div>
          ) : tab === "companies" ? (
            availableCompanies.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-8">{emptyMessage}</p>
            ) : (
              <div className="flex flex-col gap-1">
                {availableCompanies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    disabled={importingId === company.id}
                    onClick={() => importCompany(company)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-nav-hover transition-colors disabled:opacity-50"
                  >
                    <HugeiconsIcon icon={Building02Icon} size={16} color="#0B0B18" />
                    <span className="text-sm font-medium text-text-primary truncate flex-1">
                      {company.name}
                    </span>
                    {importingId === company.id && (
                      <span className="text-xs text-text-secondary">Agregando…</span>
                    )}
                  </button>
                ))}
              </div>
            )
          ) : availableContacts.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">{emptyMessage}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {availableContacts.map((contact) => {
                const fullName = `${contact.firstName} ${contact.lastName || ""}`.trim();
                return (
                  <button
                    key={contact.id}
                    type="button"
                    disabled={importingId === contact.id}
                    onClick={() => importContact(contact)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-nav-hover transition-colors disabled:opacity-50"
                  >
                    <HugeiconsIcon icon={User02Icon} size={16} color="#0B0B18" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{fullName}</p>
                      {(contact.company?.name || contact.email) && (
                        <p className="text-xs text-text-secondary truncate">
                          {contact.company?.name || contact.email}
                        </p>
                      )}
                    </div>
                    {importingId === contact.id && (
                      <span className="text-xs text-text-secondary shrink-0">Agregando…</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
