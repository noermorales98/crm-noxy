import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import ProjectInboxView from "@/src/components/ProjectInboxView";

export default async function ProjectEmailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user) return <div>Access Denied</div>;
  const currentOrganizationId = (session as any).currentOrganizationId;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: currentOrganizationId },
    select: { id: true, emailAccountCompanyId: true },
  });
  if (!project) return notFound();
  if (!project.emailAccountCompanyId) redirect(`/projects/${id}`);

  return <ProjectInboxView companyId={project.emailAccountCompanyId} />;
}
