import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import Link from "next/link";
import { Plus, Folder, Calendar, ArrowRight, Activity, Zap, TrendingUp, GitBranch, Megaphone } from "lucide-react";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import DeleteProjectButton from "@/src/components/DeleteProjectButton";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) return <div>Access Denied</div>;
  const currentOrganizationId = (session as any).currentOrganizationId;

  const projects = await prisma.project.findMany({
    where: { organizationId: currentOrganizationId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { forms: true, campaigns: true, contacts: true, companies: true, tasks: true }
      }
    }
  });

  return (
    <div className="flex h-screen bg-background font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 py-6">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Projects</h1>
                <p className="text-gray-500 mt-1">Organize your campaigns, events, and larger initiatives.</p>
              </div>
              <Link
                href="/projects/create"
                className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-sm font-medium"
              >
                <Plus size={18} />
                New Project
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => {
                const totalAssets = project._count.forms + project._count.campaigns + project._count.contacts + project._count.companies + project._count.tasks;

                return (
                  <Link key={project.id} href={`/projects/${project.id}`} className="group bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer flex flex-col h-full relative overflow-hidden">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-700 group-hover:scale-110 transition-transform">
                        {project.icon === "zap" && <Zap size={24} />}
                        {project.icon === "trending-up" && <TrendingUp size={24} />}
                        {project.icon === "git-branch" && <GitBranch size={24} />}
                        {project.icon === "megaphone" && <Megaphone size={24} />}
                        {!["zap", "trending-up", "git-branch", "megaphone"].includes(project.icon || "") && <Folder size={24} />}
                      </div>
                      <DeleteProjectButton projectId={project.id} projectName={project.name} />
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{project.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1">
                      {project.description || "Sin descripción."}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Activity size={16} />
                        <span>{totalAssets} assets connected</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-900 group-hover:text-white transition-colors">
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </Link>
                );
              })}

              {projects.length === 0 && (
                <div className="col-span-full bg-gray-50 rounded-3xl border border-dashed border-gray-300 p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-400 mb-4">
                    <Folder size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No projects yet</h3>
                  <p className="text-gray-500 max-w-sm mb-6">Group your forms, campaigns, contacts, and companies together by creating your first project.</p>
                  <Link
                    href="/projects/create"
                    className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 border border-gray-200 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
                  >
                    <Plus size={18} />
                    Create your first project
                  </Link>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
