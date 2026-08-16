"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";

interface ProjectAssociationsEditorProps {
  projectId: string;
  initial: {
    companyId: string | null;
    contactId: string | null;
    clientId: string | null;
    emailAccountCompanyId: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProjectAssociationsEditor({ projectId, initial, open: isOpen, onOpenChange: setIsOpen }: ProjectAssociationsEditorProps) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const [companyId, setCompanyId] = useState(initial.companyId ?? "");
  const [contactId, setContactId] = useState(initial.contactId ?? "");
  const [clientId, setClientId] = useState(initial.clientId ?? "");
  const [emailAccountCompanyId, setEmailAccountCompanyId] = useState(initial.emailAccountCompanyId ?? "");

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/companies").then(r => r.json()).then(d => { if (!d.error) setCompanies(d); }).catch(console.error);
    fetch("/api/contacts").then(r => r.json()).then(d => { if (!d.error) setContacts(d); }).catch(console.error);
    fetch("/api/clients").then(r => r.json()).then(d => { if (!d.error) setClients(d); }).catch(console.error);
  }, [isOpen]);

  const emailAccounts = companies.filter((c: any) => c.smtpHost);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            companyId: companyId || null,
            contactId: contactId || null,
            clientId: clientId || null,
            emailAccountCompanyId: emailAccountCompanyId || null,
          },
        }),
      });
      if (res.ok) {
        addToast("Asociaciones actualizadas.", "success");
        setTimeout(() => window.location.reload(), 500);
      } else {
        addToast("Error al guardar.", "error");
      }
    } catch { addToast("Error de conexión.", "error"); }
    finally { setSaving(false); }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-obsidian/35 p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle">
              <h3 className="text-base font-bold text-text-primary">Editar asociaciones</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 text-text-secondary hover:text-text-primary rounded-lg">
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Empresa asociada</label>
                <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border-subtle bg-surface-sidebar text-sm focus:bg-white focus:outline-none">
                  <option value="">— Ninguna —</option>
                  {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Cliente recurrente asociado</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border-subtle bg-surface-sidebar text-sm focus:bg-white focus:outline-none">
                  <option value="">— Ninguno —</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Contacto asociado</label>
                <select value={contactId} onChange={e => setContactId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border-subtle bg-surface-sidebar text-sm focus:bg-white focus:outline-none">
                  <option value="">— Ninguno —</option>
                  {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName || ""}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Cuenta de correo vinculada</label>
                <select value={emailAccountCompanyId} onChange={e => setEmailAccountCompanyId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border-subtle bg-surface-sidebar text-sm focus:bg-white focus:outline-none">
                  <option value="">— Ninguna —</option>
                  {emailAccounts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2 border-t border-border-subtle mt-2">
                <button onClick={() => setIsOpen(false)} className="flex-1 py-2.5 font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 font-semibold text-action-primary-foreground bg-action-primary hover:bg-black rounded-lg text-sm disabled:opacity-50 transition-colors">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
