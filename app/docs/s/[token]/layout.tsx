import { getShareByToken } from "@/src/lib/kb-share-access";
import { shareMetadata, sharedDocCopy } from "@/src/lib/share-metadata";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await getShareByToken(token);
  const page = share?.page;
  const copy = page?.title
    ? sharedDocCopy(page.isFolder, page.title, {
        publicTitle: page.publicTitle,
        shareTags: page.shareTags,
      })
    : null;
  return shareMetadata({
    title: copy?.title ?? "Documento",
    description: copy?.description ?? "Documento compartido.",
    path: `/docs/s/${token}`,
    icon: page?.shareIcon && page.shareIconBg ? `/docs/s/${token}/icon` : null,
  });
}

export default function PublicDocShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
