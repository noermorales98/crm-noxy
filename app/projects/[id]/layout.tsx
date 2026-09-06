import { prisma, isDbUnavailableError } from "@/src/lib/db";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import ProjectWorkspaceHeader from "@/src/components/ProjectWorkspaceHeader";
import { ProjectHeaderSetter } from "@/src/components/ProjectHeaderSetter";
import DbUnavailableNotice from "@/src/components/DbUnavailableNotice";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return <div>Access Denied</div>;
  const currentOrganizationId = (session as { currentOrganizationId?: string }).currentOrganizationId;

  try {
    const project = await prisma.project.findUnique({
      where: { id, organizationId: currentOrganizationId },
      include: {
        clientCompany: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        client: { select: { id: true, name: true } },
        emailAccountCompany: { select: { id: true, name: true } },
        _count: { select: { tasks: { where: { isCompleted: false } } } },
      },
    });

    if (!project) return notFound();

    const docsCount = await prisma.kbPageRelation.count({
      where: { entityType: "PROJECT", entityId: project.id },
    });

    const projectForms = await prisma.form.findMany({
      where: { projectId: project.id },
      select: { id: true },
    });
    const submissionsCount =
      projectForms.length === 0
        ? 0
        : await prisma.contact.count({
            where: {
              organizationId: currentOrganizationId,
              sourceFormId: { in: projectForms.map((f) => f.id) },
            },
          });

    return (
      <>
        <ProjectHeaderSetter
          projectId={project.id}
          projectName={project.name}
          initial={{
            companyId: project.companyId,
            contactId: project.contactId,
            clientId: project.clientId,
            emailAccountCompanyId: project.emailAccountCompanyId,
          }}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-surface-app">
          <ProjectWorkspaceHeader
            project={project}
            tasksCount={project._count.tasks}
            docsCount={docsCount}
            submissionsCount={submissionsCount}
          />
          {children}
        </div>
      </>
    );
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    return (
      <div className="crm-mobile-bottom-clearance flex min-h-0 flex-1 flex-col bg-surface-app">
        <DbUnavailableNotice />
        <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
          <p className="max-w-sm text-sm text-text-secondary">
            No se pudo cargar el proyecto. El resto del CRM sigue disponible; reintenta cuando bajen las conexiones.
          </p>
        </div>
      </div>
    );
  }
}
