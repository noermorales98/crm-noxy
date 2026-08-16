"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { FolderIcon, Target01Icon, FavouriteIcon, ZapIcon, AnalyticsUpIcon, GitBranchIcon, Megaphone01Icon, ArrowLeft01Icon, Loading01Icon, DashboardSquare02Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

const availableIcons = [
  { id: "folder", icon: <HugeiconsIcon icon={FolderIcon} size={20} />, label: "Folder" },
  { id: "layout-dashboard", icon: <HugeiconsIcon icon={DashboardSquare02Icon} size={20} />, label: "Dashboard" },
  { id: "zap", icon: <HugeiconsIcon icon={ZapIcon} size={20} />, label: "Zap" },
  { id: "trending-up", icon: <HugeiconsIcon icon={AnalyticsUpIcon} size={20} />, label: "Trending" },
  { id: "git-branch", icon: <HugeiconsIcon icon={GitBranchIcon} size={20} />, label: "Branch" },
  { id: "megaphone", icon: <HugeiconsIcon icon={Megaphone01Icon} size={20} />, label: "Campaign" }
];

export default function CreateProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("folder");
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [clientId, setClientId] = useState("");
  const [emailAccountCompanyId, setEmailAccountCompanyId] = useState("");
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/companies").then(res => res.json()).then(data => { if (!data.error) setCompanies(data); }).catch(console.error);
    fetch("/api/contacts").then(res => res.json()).then(data => { if (!data.error) setContacts(data); }).catch(console.error);
    fetch("/api/clients").then(res => res.json()).then(data => { if (!data.error) setClients(data); }).catch(console.error);
  }, []);

  const emailAccounts = companies.filter((c: any) => c.smtpHost);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          icon,
          companyId: companyId || null,
          contactId: contactId || null,
          clientId: clientId || null,
          emailAccountCompanyId: emailAccountCompanyId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create project");
      }

      const project = await res.json();
      router.push(`/projects/${project.id}`); // Or just router.push("/projects")
      router.refresh();

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-6 py-6 bg-surface-app">
          <div className="max-w-3xl mx-auto w-full">
            <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              Volver a proyectos
            </Link>

            <div className="bg-white border border-border-subtle rounded-lg p-8">
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">Crear nuevo proyecto</h1>
                <p className="text-text-secondary mt-1">Organiza tareas, correo y documentación alrededor de un cliente, empresa o contacto.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-sm font-semibold text-text-primary">Nombre del proyecto <span className="text-red-500">*</span></label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Black Friday 2026, Q3 Launch, Marketing Automation"
                    className="w-full px-4 py-3 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="description" className="text-sm font-semibold text-text-primary">Descripción</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="¿Cuál es el objetivo de este proyecto?"
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-colors resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="company" className="text-sm font-semibold text-text-primary">Empresa asociada (Opcional)</label>
                    <select
                      id="company"
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-colors"
                    >
                      <option value="">— Ninguna —</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="client" className="text-sm font-semibold text-text-primary">Cliente recurrente asociado (Opcional)</label>
                    <select
                      id="client"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-colors"
                    >
                      <option value="">— Ninguno —</option>
                      {clients.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="contact" className="text-sm font-semibold text-text-primary">Contacto asociado (Opcional)</label>
                    <select
                      id="contact"
                      value={contactId}
                      onChange={(e) => setContactId(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-colors"
                    >
                      <option value="">— Ninguno —</option>
                      {contacts.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName || ""}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="emailAccount" className="text-sm font-semibold text-text-primary">Cuenta de correo vinculada (Opcional)</label>
                    <select
                      id="emailAccount"
                      value={emailAccountCompanyId}
                      onChange={(e) => setEmailAccountCompanyId(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-border-subtle bg-surface-sidebar focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-colors"
                    >
                      <option value="">— Ninguna —</option>
                      {emailAccounts.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {emailAccounts.length === 0 && (
                      <p className="text-xs text-text-secondary">Ninguna empresa tiene correo (SMTP) configurado todavía.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-text-primary">Selecciona un icono</label>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    {availableIcons.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setIcon(item.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all ${icon === item.id
                          ? "border-action-primary bg-action-primary text-white transform scale-105"
                          : "border-border-subtle bg-surface-sidebar text-text-secondary hover:border-border-subtle hover:bg-white"
                          }`}
                      >
                        <div className="mb-2">{item.icon}</div>
                        <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-3">
                  <Link
                    href="/projects"
                    className="px-5 py-2.5 rounded-lg font-medium text-text-secondary hover:bg-nav-hover transition-colors"
                  >
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    disabled={isLoading || !name.trim()}
                    className="flex items-center gap-2 bg-action-primary text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading && <HugeiconsIcon icon={Loading01Icon} size={18} className="animate-spin" />}
                    {isLoading ? "Creando..." : "Crear proyecto"}
                  </button>
                </div>
              </form>
            </div>
          </div>
    </main>
  );
}
