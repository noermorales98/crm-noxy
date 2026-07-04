import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { matchCrmSearchPages } from "@/src/lib/crm-search-pages";
import { markdownContentSnippet } from "@/src/lib/kb-search-snippet";

const LIMIT = 5;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const orgId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!orgId) return new Response("No organization context", { status: 400 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) return Response.json([]);

  const qLower = q.toLowerCase();

  const [
    pages,
    contacts,
    companies,
    deals,
    kbPages,
    clients,
    tasks,
    forms,
    projects,
  ] = await Promise.all([
    Promise.resolve(matchCrmSearchPages(q, LIMIT)),
    prisma.contact.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
        ],
      },
      take: LIMIT,
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.company.findMany({
      where: { organizationId: orgId, name: { contains: q } },
      take: LIMIT,
      select: { id: true, name: true, industry: true },
    }),
    prisma.deal.findMany({
      where: { organizationId: orgId, title: { contains: q } },
      take: LIMIT,
      select: { id: true, title: true, value: true, currency: true },
    }),
    prisma.kbPage.findMany({
      where: {
        organizationId: orgId,
        OR: [{ title: { contains: q } }, { content: { contains: q } }],
      },
      take: LIMIT * 2,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, isFolder: true, content: true },
    }),
    prisma.client.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { name: { contains: q } },
          { contactName: { contains: q } },
          { email: { contains: q } },
        ],
      },
      take: LIMIT,
      select: { id: true, name: true, contactName: true },
    }),
    prisma.task.findMany({
      where: {
        organizationId: orgId,
        OR: [{ title: { contains: q } }, { description: { contains: q } }],
      },
      take: LIMIT,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, isCompleted: true },
    }),
    prisma.form.findMany({
      where: { organizationId: orgId, name: { contains: q } },
      take: LIMIT,
      select: { id: true, name: true, description: true },
    }),
    prisma.project.findMany({
      where: {
        organizationId: orgId,
        OR: [{ name: { contains: q } }, { description: { contains: q } }],
      },
      take: LIMIT,
      select: { id: true, name: true },
    }),
  ]);

  const kbResults = kbPages.slice(0, LIMIT).map((p) => {
    const titleMatch = p.title.toLowerCase().includes(qLower);
    const snippet = !p.isFolder ? markdownContentSnippet(p.content, q) : undefined;
    const contentMatch = !!snippet;

    let subtitle: string | undefined;
    if (p.isFolder) {
      subtitle = "Carpeta";
    } else if (titleMatch && contentMatch) {
      subtitle = snippet;
    } else if (contentMatch) {
      subtitle = snippet;
    } else if (titleMatch) {
      subtitle = "Documento";
    } else {
      subtitle = "Documento";
    }

    return {
      id: p.id,
      type: "kb" as const,
      title: p.title,
      subtitle,
      href: `/kb/${p.id}`,
    };
  });

  const results = [
    ...pages.map((p) => ({
      id: p.id,
      type: "page" as const,
      title: p.title,
      subtitle: p.subtitle,
      href: p.href,
    })),
    ...contacts.map((c) => ({
      id: c.id,
      type: "contact" as const,
      title: `${c.firstName} ${c.lastName ?? ""}`.trim(),
      subtitle: c.email ?? undefined,
      href: `/contacts/${c.id}`,
    })),
    ...companies.map((c) => ({
      id: c.id,
      type: "company" as const,
      title: c.name,
      subtitle: c.industry ?? undefined,
      href: `/companies/${c.id}`,
    })),
    ...deals.map((d) => ({
      id: d.id,
      type: "deal" as const,
      title: d.title,
      subtitle: d.value != null ? `$${d.value.toLocaleString("es-MX")} ${d.currency}` : undefined,
      href: `/pipeline/${d.id}`,
    })),
    ...kbResults,
    ...clients.map((c) => ({
      id: c.id,
      type: "client" as const,
      title: c.name,
      subtitle: c.contactName ?? undefined,
      href: `/boveda/${c.id}`,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      subtitle: t.isCompleted ? "Completada" : "Pendiente",
      href: "/tasks",
    })),
    ...forms.map((f) => ({
      id: f.id,
      type: "form" as const,
      title: f.name,
      subtitle: f.description?.slice(0, 80) ?? undefined,
      href: `/forms/${f.id}`,
    })),
    ...projects.map((p) => ({
      id: p.id,
      type: "project" as const,
      title: p.name,
      href: `/projects/${p.id}`,
    })),
  ];

  return Response.json(results);
}
