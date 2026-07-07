"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, FolderIcon, ArrowRight01Icon, Activity01Icon, ZapIcon, AnalyticsUpIcon, GitBranchIcon, Megaphone01Icon } from "@hugeicons/core-free-icons";
import DeleteProjectButton from "@/src/components/DeleteProjectButton";
import { useHeader } from "@/src/context/HeaderContext";
import { useRouter } from "next/navigation";

export default function ProjectsPage() {
  const { setConfig, resetState, sortField, sortOrder } = useHeader();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    resetState();
  }, []);

  useEffect(() => {
    setConfig({
      title: "Proyectos",
      titleBadge: isLoading ? undefined : projects.length,
      sortOptions: [
        { label: "Nombre", value: "name" },
        { label: "Fecha de creación", value: "createdAt" },
        { label: "Assets", value: "assets" },
      ],
      addButton: { label: "Nuevo proyecto", onClick: () => router.push("/projects/create") },
    });
    return () => setConfig({});
  }, [isLoading, projects.length]);

  useEffect(() => {
    fetch("/api/projects")
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setProjects(data); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const displayed = useMemo(() => {
    let result = [...projects];

    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal: any, bVal: any;
        if (sortField === "name") { aVal = a.name?.toLowerCase() || ""; bVal = b.name?.toLowerCase() || ""; }
        else if (sortField === "createdAt") { aVal = a.createdAt || ""; bVal = b.createdAt || ""; }
        else if (sortField === "assets") {
          aVal = (a._count?.forms || 0) + (a._count?.campaigns || 0) + (a._count?.contacts || 0) + (a._count?.companies || 0) + (a._count?.tasks || 0);
          bVal = (b._count?.forms || 0) + (b._count?.campaigns || 0) + (b._count?.contacts || 0) + (b._count?.companies || 0) + (b._count?.tasks || 0);
        } else { aVal = ""; bVal = ""; }
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [projects, sortField, sortOrder]);

  return (
    <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-6 py-6 bg-surface-app">
          <div className="max-w-7xl mx-auto w-full">
            <div className="mb-6">
              <p className="text-sm text-text-secondary">Organiza tus campañas, formularios y contactos por iniciativa o cliente.</p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayed.map(project => {
                  const totalAssets = (project._count?.forms || 0) + (project._count?.campaigns || 0) + (project._count?.contacts || 0) + (project._count?.companies || 0) + (project._count?.tasks || 0);
                  return (
                    <Link key={project.id} href={`/projects/${project.id}`} className="group bg-white border border-border-subtle rounded-lg p-6 hover:border-border-subtle transition-all cursor-pointer flex flex-col h-full relative overflow-hidden">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-surface-sidebar rounded-lg flex items-center justify-center text-text-primary group-hover:bg-accent-charcoal group-hover:text-white transition-all">
                          {project.icon === "zap" && <HugeiconsIcon icon={ZapIcon} size={24} />}
                          {project.icon === "trending-up" && <HugeiconsIcon icon={AnalyticsUpIcon} size={24} />}
                          {project.icon === "git-branch" && <HugeiconsIcon icon={GitBranchIcon} size={24} />}
                          {project.icon === "megaphone" && <HugeiconsIcon icon={Megaphone01Icon} size={24} />}
                          {!["zap", "trending-up", "git-branch", "megaphone"].includes(project.icon || "") && <HugeiconsIcon icon={FolderIcon} size={24} />}
                        </div>
                        <DeleteProjectButton projectId={project.id} projectName={project.name} />
                      </div>
                      <h3 className="text-lg font-bold text-text-primary mb-2 truncate">{project.name}</h3>
                      <p className="text-sm text-text-secondary line-clamp-2 mb-6 flex-1">{project.description || "Sin descripción."}</p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border-subtle">
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <HugeiconsIcon icon={Activity01Icon} size={16} />
                          <span>{totalAssets} assets connected</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-surface-sidebar flex items-center justify-center group-hover:bg-accent-charcoal group-hover:text-white transition-colors">
                          <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {displayed.length === 0 && (
                  <div className="col-span-full bg-surface-sidebar rounded-3xl border border-dashed border-border-subtle p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-text-secondary mb-4">
                      <HugeiconsIcon icon={FolderIcon} size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">No projects yet</h3>
                    <p className="text-text-secondary max-w-sm mb-6">Group your forms, campaigns, contacts, and companies together by creating your first project.</p>
                    <Link href="/projects/create" className="inline-flex items-center justify-center gap-2 bg-white text-text-primary border border-border-subtle px-5 py-2.5 rounded-lg hover:bg-surface-sidebar transition-colors font-medium">
                      <HugeiconsIcon icon={Add01Icon} size={18} /> Create your first project
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
    </main>
  );
}
