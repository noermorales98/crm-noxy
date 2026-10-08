import { getPublicProjectByToken, getPublicProjectPage } from "@/src/lib/project-public";
import { shareMetadata, sharedDocCopy } from "@/src/lib/share-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string; pageId: string }>;
}) {
  const { token, pageId } = await params;
  const project = await getPublicProjectByToken(token);
  const page = project
    ? await getPublicProjectPage({
        projectId: project.id,
        organizationId: project.organizationId,
        pageId,
      })
    : null;
  const copy = page?.title ? sharedDocCopy(page.isFolder, page.title) : null;
  return shareMetadata({
    title: copy?.title ?? "Documento",
    description: copy?.description ?? "Documento compartido.",
    path: `/proyecto/${token}/docs/${pageId}`,
  });
}

export default function PublicProjectDocLayout({ children }: { children: React.ReactNode }) {
  return children;
}
