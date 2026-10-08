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
        select: { title: true, isFolder: true, publicTitle: true, shareTags: true },
      })
    : null;
  const copy = page?.title
    ? sharedDocCopy(page.isFolder, page.title, {
        publicTitle: page.publicTitle,
        shareTags: page.shareTags,
      })
    : null;
  return shareMetadata({
    title: copy?.title ?? "Documento",
    description: copy?.description ?? "Documento compartido.",
    path: `/docs/s/${token}/${pageId}`,
    icon: share?.page.shareIcon && share.page.shareIconBg ? `/docs/s/${token}/icon` : null,
  });
}

export default function PublicDocPageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
