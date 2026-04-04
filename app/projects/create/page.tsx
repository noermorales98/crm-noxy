"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { FolderIcon, Target01Icon, FavouriteIcon, ZapIcon, AnalyticsUpIcon, GitBranchIcon, Megaphone01Icon, ArrowLeft01Icon, Loading01Icon, DashboardSquare02Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";

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
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/companies")
      .then(res => res.json())
      .then(data => {
        if (!data.error) setCompanies(data);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, icon, companyId: companyId || null }),
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
    <div className="flex h-screen bg-background font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto w-full">
            <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              Volver a proyectos
            </Link>

            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Crear nuevo proyecto</h1>
                <p className="text-gray-500 mt-1">Los proyectos organizan contactos, empresas, campañas y tareas en un solo lugar.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-sm font-semibold text-gray-900">Nombre del proyecto <span className="text-red-500">*</span></label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Black Friday 2026, Q3 Launch, Marketing Automation"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="description" className="text-sm font-semibold text-gray-900">Descripción</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="¿Cuál es el objetivo de este proyecto?"
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-colors resize-y"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="company" className="text-sm font-semibold text-gray-900">Cliente asociado (Opcional)</label>
                  <select
                    id="company"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-colors"
                  >
                    <option value="">No associated client</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-gray-900">Selecciona un icono</label>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    {availableIcons.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setIcon(item.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${icon === item.id
                          ? "border-gray-900 bg-gray-900 text-white shadow-md transform scale-105"
                          : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-white"
                          }`}
                      >
                        <div className="mb-2">{item.icon}</div>
                        <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <Link
                    href="/projects"
                    className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    disabled={isLoading || !name.trim()}
                    className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading && <HugeiconsIcon icon={Loading01Icon} size={18} className="animate-spin" />}
                    {isLoading ? "Creando..." : "Crear proyecto"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
