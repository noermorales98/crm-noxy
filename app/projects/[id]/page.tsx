import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Folder, Zap, TrendingUp, GitBranch, Megaphone, LayoutDashboard, Calendar, Users, Activity, AppWindow, CheckSquare, Building, Mail } from "lucide-react";
import { notFound } from "next/navigation";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import ProjectAssetsManager from "@/src/components/ProjectAssetsManager";
import { HeaderConfigSetter } from "@/src/components/HeaderConfigSetter";

export default async function ProjectDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return <div>Access Denied</div>;
  const currentOrganizationId = (session as any).currentOrganizationId;

  const project = await prisma.project.findUnique({
    where: {
      id: params.id,
      organizationId: currentOrganizationId
    },
    include: {
      clientCompany: true,
      forms: {
        orderBy: { createdAt: "desc" },
        take: 5
      },
      campaigns: {
        orderBy: { createdAt: "desc" },
        take: 5
      },
      contacts: {
        orderBy: { createdAt: "desc" },
        take: 5
      },
      companies: {
        orderBy: { createdAt: "desc" },
        take: 5
      },
      tasks: {
        orderBy: { createdAt: "desc" },
        take: 5
      },
      _count: {
        select: { forms: true, campaigns: true, contacts: true, companies: true, tasks: true }
      }
    }
  });

  if (!project) return notFound();

  const totalAssets = project._count.forms + project._count.campaigns + project._count.contacts + project._count.companies + project._count.tasks;

  return (
    <div className="flex h-screen bg-background font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <HeaderConfigSetter
          addButtonLabel="Nuevo proyecto"
          addButtonHref="/projects/create"
        />

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 py-6">
          <div className="max-w-7xl mx-auto w-full">
            <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6">
              <ArrowLeft size={16} />
              Regresar a proyectos
            </Link>

            {/* Project Header */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative overflow-hidden">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center text-gray-700 shrink-0">
                  {project.icon === "zap" && <Zap size={32} />}
                  {project.icon === "trending-up" && <TrendingUp size={32} />}
                  {project.icon === "git-branch" && <GitBranch size={32} />}
                  {project.icon === "megaphone" && <Megaphone size={32} />}
                  {!["zap", "trending-up", "git-branch", "megaphone"].includes(project.icon || "") && <Folder size={32} />}
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">{project.name}</h1>
                  {project.clientCompany && (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full w-fit mb-3 border border-blue-100">
                      <Building size={14} />
                      Negocio: {project.clientCompany.name}
                    </div>
                  )}
                  <p className="text-gray-500 max-w-2xl">{project.description || "Sin descripción."}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 bg-gray-50 px-6 py-4 rounded-xl border border-gray-100 shrink-0">
                <div className="text-2xl font-bold text-gray-900">{totalAssets}</div>
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Total Assets</div>
                <ProjectAssetsManager projectId={project.id} initialCounts={project._count} />
              </div>
            </div>

            {/* Project Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

              {/* Contacts */}
              <DashboardCard
                title="Contacts"
                icon={<Users className="text-blue-500" size={20} />}
                count={project._count.contacts}
                link={`/contacts?projectId=${project.id}`}
              >
                {project.contacts.length === 0 ? (
                  <EmptyState text="No contacts linked to this project" />
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {project.contacts.map((c: any) => (
                      <li key={c.id} className="py-3 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</span>
                        <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardCard>

              {/* Companies */}
              <DashboardCard
                title="Empresas"
                icon={<Building className="text-purple-500" size={20} />}
                count={project._count.companies}
                link={`/companies?projectId=${project.id}`}
              >
                {project.companies.length === 0 ? (
                  <EmptyState text="No companies linked to this project" />
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {project.companies.map((c: any) => (
                      <li key={c.id} className="py-3 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">{c.name}</span>
                        <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardCard>

              {/* Forms */}
              <DashboardCard
                title="Formularios"
                icon={<AppWindow className="text-green-500" size={20} />}
                count={project._count.forms}
                link={`/forms?projectId=${project.id}`}
              >
                {project.forms.length === 0 ? (
                  <EmptyState text="No forms linked to this project" />
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {project.forms.map((f: any) => (
                      <li key={f.id} className="py-3 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">{f.name}</span>
                        <span className="text-xs text-gray-500">{f.isActive ? 'Activo' : 'Inactivo'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardCard>

              {/* Email Campaigns */}
              <DashboardCard
                title="Campaigns"
                icon={<Mail className="text-orange-500" size={20} />}
                count={project._count.campaigns}
                link={`/campaigns?projectId=${project.id}`}
              >
                {project.campaigns.length === 0 ? (
                  <EmptyState text="No campaigns linked to this project" />
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {project.campaigns.map((c: any) => (
                      <li key={c.id} className="py-3 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">{c.subject}</span>
                        <span className="text-xs text-gray-500">{c.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardCard>

              {/* Tasks */}
              <DashboardCard
                title="Tasks"
                icon={<CheckSquare className="text-red-500" size={20} />}
                count={project._count.tasks}
                link={`/tasks?projectId=${project.id}`}
              >
                {project.tasks.length === 0 ? (
                  <EmptyState text="No tasks linked to this project" />
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {project.tasks.map((t: any) => (
                      <li key={t.id} className="py-3 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">{t.title}</span>
                        <span className="text-xs text-gray-500">{t.isCompleted ? 'Done' : 'Pending'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardCard>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

function DashboardCard({ title, icon, count, children, link }: { title: string, icon: React.ReactNode, count: number, children: React.ReactNode, link: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col h-full">
      <div className="flex flex-col mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-bold text-gray-900">{title}</h3>
          </div>
          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{count}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-[140px]">
        {children}
      </div>
      <div className="pt-4 border-t border-gray-50 mt-4">
        <Link href={link} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-between group">
          View all {title.toLowerCase()}
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center h-full">
      <div className="text-gray-300 mb-2">
        <Folder size={24} />
      </div>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}
