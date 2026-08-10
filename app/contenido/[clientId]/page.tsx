import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import ContentCalendarView from "@/src/components/content/ContentCalendarView";

export default async function ContentClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) redirect("/");

  const { clientId } = await params;
  const client = await prisma.contentClient.findFirst({
    where: { id: clientId, organizationId: orgId },
    include: { phones: { orderBy: { createdAt: "asc" } } },
  });
  if (!client) notFound();

  return (
    <ContentCalendarView
      client={{
        id: client.id,
        name: client.name,
        kind: client.kind,
        description: client.description,
        context: client.context,
        publicToken: client.publicToken,
        phones: client.phones.map((p) => ({ id: p.id, label: p.label, phone: p.phone, apiKey: p.apiKey })),
      }}
    />
  );
}
