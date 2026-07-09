import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import ProjectDocsManager from "@/src/components/ProjectDocsManager";

export default async function ProjectDocsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user) return <div>Access Denied</div>;
  const currentOrganizationId = (session as any).currentOrganizationId;

  const project = await prisma.project.findFirst({ where: { id, organizationId: currentOrganizationId }, select: { id: true, name: true } });
  if (!project) return notFound();

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-6">
      <ProjectDocsManager projectId={project.id} projectName={project.name} />
    </div>
  );
}
