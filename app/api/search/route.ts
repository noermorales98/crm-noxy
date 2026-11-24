import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { matchCrmSearchPages } from "@/src/lib/crm-search-pages";
import { markdownContentSnippet } from "@/src/lib/kb-search-snippet";
import { visibleContactWhere } from "@/src/lib/visible-contacts";
import { dealArchiveFilter, wantsArchived } from "@/src/lib/deal-filters";
import { dealSearchSubtitle, quoteSearchSubtitle } from "@/src/lib/search-subtitles";

const LIMIT = 5;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const orgId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!orgId) return new Response("No organization context", { status: 400 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) return Response.json([]);

  const includeArchived = wantsArchived(searchParams.get("includeArchived"));
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
    quotes,
  ] = await Promise.all([
    Promise.resolve(matchCrmSearchPages(q, 8)),
    prisma.contact.findMany({
      where: {
        organizationId: orgId,
        AND: [
          visibleContactWhere,
          {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } },
            ],
          },
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
      // También por el motivo de pérdida: «caro» o «sin respuesta» encuentran los deals perdidos por eso.
      where: { organizationId: orgId, ...dealArchiveFilter(includeArchived), OR: [{ title: { contains: q } }, { lostReason: { contains: q } }] },
      take: LIMIT,
      select: { id: true, title: true, value: true, currency: true, isArchived: true, lostReason: true, stage: { select: { name: true, isWon: true, isLost: true } }, quotes: { select: { status: true } } },
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
    prisma.quote.findMany({
      where: { organizationId: orgId, OR: [{ folio: { contains: q } }, { clientName: { contains: q } }, { clientCompany: { contains: q } }] },
      take: LIMIT,
      orderBy: { createdAt: "desc" },
      select: { id: true, folio: true, status: true, clientName: true, total: true, currency: true, deal: { select: { title: true } } },
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
      subtitle: dealSearchSubtitle(d),
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
    ...quotes.map((quote) => ({
      id: quote.id,
      type: "quote" as const,
      title: `${quote.folio} · ${quote.clientName}`,
      subtitle: quoteSearchSubtitle(quote),
      href: `/cotizaciones/${quote.folio}`,
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
