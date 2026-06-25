import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return new Response("No organization context", { status: 400 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) return Response.json([]);

  const [contacts, companies, deals] = await Promise.all([
    prisma.contact.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
        ],
      },
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.company.findMany({
      where: { organizationId: orgId, name: { contains: q } },
      take: 5,
      select: { id: true, name: true, industry: true },
    }),
    prisma.deal.findMany({
      where: { organizationId: orgId, title: { contains: q } },
      take: 5,
      select: { id: true, title: true, value: true, currency: true },
    }),
  ]);

  const results = [
    ...contacts.map((c) => ({
      id: c.id,
      type: "contact",
      title: `${c.firstName} ${c.lastName ?? ""}`.trim(),
      subtitle: c.email ?? undefined,
      href: `/contacts/${c.id}`,
    })),
    ...companies.map((c) => ({
      id: c.id,
      type: "company",
      title: c.name,
      subtitle: c.industry ?? undefined,
      href: `/companies/${c.id}`,
    })),
    ...deals.map((d) => ({
      id: d.id,
      type: "deal",
      title: d.title,
      subtitle: d.value != null ? `$${d.value.toLocaleString("es-MX")} ${d.currency}` : undefined,
      href: `/pipeline`,
    })),
  ];

  return Response.json(results);
}
