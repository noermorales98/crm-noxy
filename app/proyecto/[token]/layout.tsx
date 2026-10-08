import { notFound } from "next/navigation";
import { getPublicProjectMeta } from "@/src/lib/project-public";
import PublicProjectHeader from "@/src/components/PublicProjectHeader";
import { shareMetadata } from "@/src/lib/share-metadata";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const meta = await getPublicProjectMeta(token);
  const name = meta?.name?.trim();
  return shareMetadata({
    title: name ? `Proyecto — ${name}` : "Proyecto",
    description: meta?.description?.trim() || (name ? `Proyecto ${name}.` : "Proyecto compartido."),
    path: `/proyecto/${token}`,
  });
}

export default async function PublicProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const meta = await getPublicProjectMeta(token);
  if (!meta) notFound();

  return (
    <div className="min-h-screen bg-surface-app flex flex-col">
      <PublicProjectHeader token={token} name={meta.name} icon={meta.icon} counts={meta.counts} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
