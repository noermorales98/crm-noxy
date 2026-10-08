import { prisma } from "@/src/lib/db";
import { getShareByToken, isPageInShareTree } from "@/src/lib/kb-share-access";
import { shareMetadata, sharedDocCopy } from "@/src/lib/share-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string; pageId: string }>;
}) {
  const { token, pageId } = await params;
  const share = await getShareByToken(token);
  const allowed = share ? await isPageInShareTree(share, pageId) : false;
  const page = allowed && share
    ? await prisma.kbPage.findFirst({
        where: { id: pageId, organizationId: share.organizationId },
        select: { title: true, isFolder: true },
      })
    : null;
  const copy = page?.title ? sharedDocCopy(page.isFolder, page.title) : null;
  return shareMetadata({
    title: copy?.title ?? "Documento",
    description: copy?.description ?? "Documento compartido.",
    path: `/docs/s/${token}/${pageId}`,
  });
}

export default function PublicDocPageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
