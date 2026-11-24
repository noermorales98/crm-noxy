import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { AiPageContext } from "@/src/components/ai/AskAiButton";
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
    <Suspense fallback={null}>
      <AiPageContext context={{ page: "content_client", id: client.id, label: client.name }} />
      <ContentCalendarView
        client={{
          id: client.id,
          name: client.name,
          kind: client.kind,
          description: client.description,
          context: client.context,
          publicToken: client.publicToken,
          reminderHour: client.reminderHour,
          reminderMinute: client.reminderMinute,
          reminderDaysBefore: client.reminderDaysBefore,
          phones: client.phones.map((p) => ({ id: p.id, label: p.label, phone: p.phone, apiKey: p.apiKey })),
        }}
      />
    </Suspense>
  );
}
