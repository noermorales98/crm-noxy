/* eslint-disable @typescript-eslint/no-explicit-any */
// Los filtros `where`/`data` de Prisma se construyen dinámicamente según los
// argumentos dados; el proyecto ya usa `any` en sus route handlers.
import { ACTIVE_DEALS, dealArchiveFilter } from "@/src/lib/deal-filters";
import { ensureContactForWonDeal, ensureProjectForWonDeal } from "@/src/lib/deal-won";
import { ensureLeadFollowups } from "@/src/lib/lead-followup-service";
import { buildDigestContext } from "@/src/lib/digest";
import { weeklyComparison, weeklyText } from "@/src/lib/video-analytics";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/src/lib/db";
import { visibleContactWhere } from "@/src/lib/visible-contacts";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { canonicalAction, definedRecord, gateWrite } from "./approval.ts";
import { loadSalesMetrics } from "@/src/lib/mcp/sales-metrics";
import { loadMonthMetrics, loadYearMetrics } from "@/src/lib/month-metrics";
import { createDealFromQuote, findQuoteForLink, linkQuoteToDeal } from "@/src/lib/quote-deal-link";
import { dealToQuotePrefill } from "@/src/lib/deal-sales";
import { computeQuoteTotals, nextQuoteFolio } from "@/src/lib/quotes";
import { tryPublicUrls } from "@/src/lib/url";
import { normalizeDraft } from "@/src/lib/email-drafts";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { canEditQuote, quoteScalarData, validateQuoteEdit } from "./quote-input.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function err(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

const pagination = {
  limit: z.number().int().min(1).max(100).default(20).describe("Máximo de resultados (1-100)"),
  offset: z.number().int().min(0).default(0).describe("Resultados a saltar (paginación)"),
};

const DATE = z.string().describe("Fecha ISO 8601, p. ej. 2026-08-15T15:00:00Z");

// ─── Registro de tools ────────────────────────────────────────────────────────

export function registerCrmTools(server: McpServer, organizationId: string) {
  const org = organizationId;

  // Verifica que una entidad exista y pertenezca a la organización
  async function owns(model: keyof typeof prisma, id: string): Promise<boolean> {
    const delegate = prisma[model] as any;
    const row = await delegate.findUnique({ where: { id }, select: { organizationId: true } });
    return row?.organizationId === org;
  }

  // Usuario por defecto para asignar tareas (primer OWNER, si no el primer miembro)
  async function defaultUserId(): Promise<string | null> {
    const member =
      (await prisma.organizationMember.findFirst({
        where: { organizationId: org, role: "OWNER" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { userId: true },
      })) ??
      (await prisma.organizationMember.findFirst({
        where: { organizationId: org },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { userId: true },
      }));
    return member?.userId ?? null;
  }

  // ─── Bot Noxy: consultas y acciones del CRM ────────────────────────────────
  server.registerTool("get_daily_summary", {
    description: "Resumen diario del CRM para el operador: tareas, deals y cobros. Solo lectura; no envía WhatsApp.",
    inputSchema: {},
  }, async () => {
    const userId = await defaultUserId();
    if (!userId) return err("No hay dueño de la organización");
    return json({ text: await buildDigestContext(org, userId) });
  });

  server.registerTool("get_weekly_video_report", {
    description: "Reporte semanal de videos: mejor y peor 20 %, hook, formato, duración, hora, predictor y vistas. Solo lectura.",
    inputSchema: { weeks: z.number().int().min(1).max(52).default(1) },
  }, async ({ weeks }) => {
    const since = new Date(Date.now() - weeks * 7 * 86400000);
    const videos = await prisma.video.findMany({ where: { organizationId: org, publishedAt: { gte: since } } });
    const comparison = weeklyComparison(videos);
    return json({ ...comparison, text: weeklyText(comparison) });
  });

  server.registerTool("create_lead", {
    description: "Crea un lead en la etapa Lead del pipeline Noxy Digital y sus tres tareas de seguimiento. No envía mensajes.",
    inputSchema: {
      title: z.string().trim().min(1).max(200),
      notes: z.string().max(5000).optional(),
      contactId: z.string().optional(),
      referredByContactId: z.string().optional(),
      referredByClientId: z.string().optional(),
      source: z.enum(["WHATSAPP", "REFERIDO", "LINKEDIN", "VISITA", "EMAIL_FRIO", "FORMULARIO", "INSTAGRAM", "TIKTOK", "FACEBOOK", "OTRO"]).default("OTRO"),
    },
  }, async ({ title, notes, contactId, referredByContactId, referredByClientId, source }) => {
    if (contactId && !(await owns("contact", contactId))) return err("Contacto inválido");
    if (referredByContactId && referredByClientId) return err("Indica solo un tipo de referente");
    if (referredByContactId && !(await owns("contact", referredByContactId))) return err("Contacto referente inválido");
    if (referredByClientId && !(await owns("client", referredByClientId))) return err("Cliente referente inválido");
    const pipelines = await prisma.pipeline.findMany({ where: { organizationId: org }, orderBy: { createdAt: "asc" }, include: { stages: true } });
    const pipeline = pipelines.find(p => p.name === "Noxy Digital") ?? pipelines[0];
    const stage = pipeline?.stages.find(s => s.name.toLowerCase() === "lead");
    if (!pipeline || !stage) return err("No hay pipeline con etapa Lead");
    const deal = await prisma.deal.create({ data: { title: title.trim(), notes, contactId, referredByContactId, referredByClientId, source, organizationId: org, pipelineId: pipeline.id, stageId: stage.id } });
    let followupTasksCreated = 0;
    try { followupTasksCreated = await ensureLeadFollowups(deal.id, org); }
    catch (error) { console.error("MCP create_lead followups:", error); }
    return json({ id: deal.id, title: deal.title, followupTasksCreated });
  });

  server.registerTool("mark_payment_received", {
    description: "Marca un pago de deal o mensualidad como recibido. Requiere aprobación humana mediante approvalToken; no envía mensajes.",
    inputSchema: { paymentId: z.string(), approvalToken: z.string().optional() },
  }, async ({ paymentId, approvalToken }) => {
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, organizationId: org }, select: { id: true, status: true, amount: true, currency: true } });
    const monthly = payment ? null : await prisma.clientPayment.findFirst({ where: { id: paymentId, organizationId: org }, select: { id: true, status: true, amount: true, currency: true } });
    const found = payment ?? monthly;
    if (!found) return err("Pago no encontrado en esta organización");
    if (found.status === "RECIBIDO") return json({ id: paymentId, status: "RECIBIDO", alreadyReceived: true });
    if (found.status !== "PENDIENTE") return err("Solo un pago pendiente puede marcarse como recibido");
    const action = canonicalAction("mark_payment_received", { org, paymentId, kind: payment ? "deal" : "monthly", status: found.status, amount: found.amount, currency: found.currency });
    const gated = gateWrite(action, `Marcar como recibido el pago ${paymentId} por ${found.amount} ${found.currency}.`, approvalToken);
    if (!gated.ok) return gated.result;
    const where = { id: paymentId, organizationId: org, status: found.status, amount: found.amount, currency: found.currency };
    const changed = payment
      ? await prisma.payment.updateMany({ where, data: { status: "RECIBIDO", receivedAt: new Date() } })
      : await prisma.clientPayment.updateMany({ where, data: { status: "RECIBIDO", receivedAt: new Date() } });
    if (changed.count !== 1) return err("El pago cambió desde la aprobación; vuelve a revisar y aprobar.");
    return json({ id: paymentId, status: "RECIBIDO" });
  });

  // ─── Contactos ────────────────────────────────────────────────────────────

  server.registerTool(
    "list_contacts",
    {
      description: "Lista los contactos del CRM, con búsqueda opcional por nombre, email o empresa.",
      inputSchema: {
        search: z.string().optional().describe("Buscar en nombre, apellido o email"),
        companyId: z.string().optional().describe("Filtrar por ID de empresa"),
        ...pagination,
      },
    },
    async ({ search, companyId, limit, offset }) => {
      const where: any = { organizationId: org, AND: [visibleContactWhere] };
      if (companyId) where.companyId = companyId;
      if (search) {
        where.AND.push({
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
          ],
        });
      }
      const [total, contacts] = await Promise.all([
        prisma.contact.count({ where }),
        prisma.contact.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          include: {
            company: { select: { id: true, name: true } },
            sourceForm: { select: { id: true, name: true } },
          },
        }),
      ]);
      return json({ total, contacts });
    }
  );

  server.registerTool(
    "get_contact",
    {
      description: "Obtiene el detalle de un contacto: empresa, deals, citas y tareas asociadas.",
      inputSchema: { id: z.string().describe("ID del contacto") },
    },
    async ({ id }) => {
      const contact = await prisma.contact.findFirst({
        where: { id, organizationId: org },
        include: {
          company: { select: { id: true, name: true, website: true, industry: true } },
          sourceForm: { select: { id: true, name: true } },
          deals: {
            where: ACTIVE_DEALS,
            select: { id: true, title: true, value: true, currency: true, stage: { select: { name: true } } },
          },
          appointments: {
            orderBy: { startTime: "desc" },
            take: 10,
            select: { id: true, startTime: true, endTime: true, status: true, appointmentType: { select: { name: true } } },
          },
          tasks: {
            where: { isCompleted: false },
            take: 10,
            select: { id: true, title: true, dueDate: true },
          },
        },
      });
      if (!contact) return err("Contacto no encontrado");
      return json(contact);
    }
  );

  server.registerTool(
    "create_contact",
    {
      description: "Crea un contacto nuevo en el CRM.",
      inputSchema: {
        firstName: z.string().describe("Nombre (requerido)"),
        lastName: z.string().optional().describe("Apellido"),
        email: z.string().email().optional().describe("Email"),
        phone: z.string().optional().describe("Teléfono"),
        companyId: z.string().optional().describe("ID de empresa existente (usa list_companies)"),
        source: z.string().optional().describe("Origen, p. ej. 'Manual', 'Referido'"),
      },
    },
    async ({ firstName, lastName, email, phone, companyId, source }) => {
      if (companyId && !(await owns("company", companyId))) return err("Empresa inválida");
      const contact = await prisma.contact.create({
        data: { firstName, lastName, email, phone, companyId, source: source ?? "MCP", organizationId: org },
        include: { company: { select: { id: true, name: true } } },
      });
      return json(contact);
    }
  );

  server.registerTool(
    "update_contact",
    {
      description: "Actualiza los datos de un contacto existente (nombre, correo, teléfono, empresa). Para agregar el correo de un cliente en una cotización usa update_quote.",
      inputSchema: {
        id: z.string().describe("ID del contacto"),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        companyId: z.string().nullable().optional().describe("ID de empresa, o null para quitarla"),
      },
    },
    async ({ id, companyId, ...fields }) => {
      if (!(await owns("contact", id))) return err("Contacto no encontrado");
      if (companyId && !(await owns("company", companyId))) return err("Empresa inválida");
      const data: any = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
      if (companyId !== undefined) data.companyId = companyId;
      const contact = await prisma.contact.update({
        where: { id },
        data,
        include: { company: { select: { id: true, name: true } } },
      });
      return json(contact);
    }
  );

  // ─── Empresas ─────────────────────────────────────────────────────────────

  const COMPANY_SAFE_SELECT = {
    id: true,
    name: true,
    website: true,
    industry: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  server.registerTool(
    "list_companies",
    {
      description: "Lista las empresas del CRM con el número de contactos de cada una.",
      inputSchema: {
        search: z.string().optional().describe("Buscar por nombre"),
        ...pagination,
      },
    },
    async ({ search, limit, offset }) => {
      const where: any = { organizationId: org };
      if (search) where.name = { contains: search };
      const [total, companies] = await Promise.all([
        prisma.company.count({ where }),
        prisma.company.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          select: { ...COMPANY_SAFE_SELECT, _count: { select: { contacts: true, deals: true } } },
        }),
      ]);
      return json({ total, companies });
    }
  );

  server.registerTool(
    "get_company",
    {
      description: "Obtiene el detalle de una empresa con sus contactos y deals.",
      inputSchema: { id: z.string().describe("ID de la empresa") },
    },
    async ({ id }) => {
      const company = await prisma.company.findFirst({
        where: { id, organizationId: org },
        select: {
          ...COMPANY_SAFE_SELECT,
          contacts: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          deals: { where: ACTIVE_DEALS, select: { id: true, title: true, value: true, currency: true, stage: { select: { name: true } } } },
        },
      });
      if (!company) return err("Empresa no encontrada");
      return json(company);
    }
  );

  server.registerTool(
    "create_company",
    {
      description: "Crea una empresa nueva en el CRM.",
      inputSchema: {
        name: z.string().describe("Nombre de la empresa (requerido)"),
        website: z.string().optional(),
        industry: z.string().optional().describe("Industria o sector"),
      },
    },
    async ({ name, website, industry }) => {
      const company = await prisma.company.create({
        data: { name, website, industry, organizationId: org },
        select: COMPANY_SAFE_SELECT,
      });
      return json(company);
    }
  );

  server.registerTool(
    "update_company",
    {
      description: "Actualiza los datos básicos de una empresa (nombre, web, industria).",
      inputSchema: {
        id: z.string().describe("ID de la empresa"),
        name: z.string().optional(),
        website: z.string().nullable().optional(),
        industry: z.string().nullable().optional(),
      },
    },
    async ({ id, ...fields }) => {
      if (!(await owns("company", id))) return err("Empresa no encontrada");
      const data = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
      const company = await prisma.company.update({ where: { id }, data, select: COMPANY_SAFE_SELECT });
      return json(company);
    }
  );

  // ─── Pipelines y Deals ────────────────────────────────────────────────────

  server.registerTool(
    "list_pipelines",
    {
      description: "Lista los pipelines de venta con sus etapas ordenadas (incluye flags isWon/isLost).",
      inputSchema: {},
    },
    async () => {
      const pipelines = await prisma.pipeline.findMany({
        where: { organizationId: org },
        include: { stages: { orderBy: { order: "asc" } } },
      });
      return json(pipelines);
    }
  );

  server.registerTool(
    "list_deals",
    {
      description:
        "Lista los leads / deals (oportunidades) del CRM con filtros por texto, etapa, pipeline, contacto o empresa. Los archivados quedan fuera salvo que pidas includeArchived. Cada deal trae `wonAt` (fecha de la venta), `lostAt` y `lostReason` (por qué se perdió).",
      inputSchema: {
        search: z.string().optional().describe("Buscar en el título del deal"),
        status: z.enum(["open", "won", "lost"]).optional().describe("open = en curso, won = ganados (ventas), lost = perdidos"),
        includeArchived: z.boolean().default(false),
        stageId: z.string().optional(),
        pipelineId: z.string().optional(),
        contactId: z.string().optional(),
        companyId: z.string().optional(),
        ...pagination,
      },
    },
    async ({ search, status, includeArchived, stageId, pipelineId, contactId, companyId, limit, offset }) => {
      const where: any = { organizationId: org };
      if (!includeArchived) where.isArchived = false;
      if (status === "won") where.stage = { isWon: true };
      if (status === "lost") where.stage = { isLost: true };
      if (status === "open") where.stage = { isWon: false, isLost: false };
      if (search) where.title = { contains: search };
      if (stageId) where.stageId = stageId;
      if (pipelineId) where.pipelineId = pipelineId;
      if (contactId) where.contactId = contactId;
      if (companyId) where.companyId = companyId;
      const [total, deals] = await Promise.all([
        prisma.deal.count({ where }),
        prisma.deal.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          take: limit,
          skip: offset,
          include: {
            stage: { select: { id: true, name: true, color: true, isWon: true, isLost: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
            company: { select: { id: true, name: true } },
          },
        }),
      ]);
      return json({ total, deals });
    }
  );

  server.registerTool(
    "get_deal",
    {
      description: "Obtiene el detalle completo de un deal: etapa, contacto, empresa, propuestas, pagos y actividad reciente. Si está perdido trae `lostReason` (por qué) y `lostAt`; si está ganado, `wonAt` es la ÚNICA fecha de la venta. Sus cotizaciones traen sus fechas de aceptación y pago (son datos de cobro, no la fecha de la venta).",
      inputSchema: { id: z.string().describe("ID del deal") },
    },
    async ({ id }) => {
      const deal = await prisma.deal.findFirst({
        where: { id, organizationId: org },
        include: {
          stage: true,
          pipeline: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          company: { select: { id: true, name: true } },
          proposals: { include: { items: { orderBy: { order: "asc" } } } },
          quotes: { select: { id: true, folio: true, status: true, total: true, currency: true, issuedAt: true, acceptedAt: true, paidAt: true, depositPaidAt: true, finalPaidAt: true } },
          payments: { orderBy: { createdAt: "desc" } },
          activities: { orderBy: { createdAt: "desc" }, take: 20 },
          appointments: {
            orderBy: { startTime: "desc" },
            take: 10,
            select: { id: true, startTime: true, status: true, appointmentType: { select: { name: true } } },
          },
        },
      });
      if (!deal) return err("Deal no encontrado");
      return json({ ...deal, crmUrl: tryPublicUrls()?.dealCrm(deal.id) ?? null });
    }
  );

  server.registerTool(
    "create_deal",
    {
      description: "Crea un deal nuevo. Requiere la etapa (stageId, ver list_pipelines); el pipeline se deduce de la etapa.",
      inputSchema: {
        title: z.string().describe("Título del deal (requerido)"),
        stageId: z.string().describe("ID de la etapa inicial (requerido)"),
        value: z.number().optional().describe("Valor monetario"),
        currency: z.string().optional().describe("Moneda, p. ej. USD, MXN (default USD)"),
        source: z
          .enum(["WHATSAPP", "REFERIDO", "LINKEDIN", "VISITA", "EMAIL_FRIO", "FORMULARIO", "INSTAGRAM", "TIKTOK", "FACEBOOK", "OTRO"])
          .optional(),
        contactId: z.string().optional(),
        companyId: z.string().optional(),
        probability: z.number().int().min(0).max(100).optional(),
        notes: z.string().optional(),
        followUpAt: DATE.optional().describe("Fecha de próximo seguimiento"),
      },
    },
    async ({ title, stageId, contactId, companyId, ...fields }) => {
      const stage = await prisma.stage.findUnique({ where: { id: stageId }, include: { pipeline: true } });
      if (!stage || stage.pipeline.organizationId !== org) return err("Etapa inválida");
      if (contactId && !(await owns("contact", contactId))) return err("Contacto inválido");
      if (companyId && !(await owns("company", companyId))) return err("Empresa inválida");
      const deal = await prisma.deal.create({
        data: {
          title,
          stageId,
          pipelineId: stage.pipelineId,
          contactId,
          companyId,
          organizationId: org,
          ...fields,
        },
        include: { stage: { select: { name: true } } },
      });
      return json({ ...deal, crmUrl: tryPublicUrls()?.dealCrm(deal.id) ?? null });
    }
  );

  server.registerTool(
    "update_deal",
    {
      description:
        "Actualiza un deal: título, valor, etapa (mover en el pipeline), probabilidad, notas, seguimiento o razón de pérdida. Mover a una etapa ganada o perdida exige approvalToken.",
      inputSchema: {
        id: z.string().describe("ID del deal"),
        title: z.string().optional(),
        value: z.number().optional(),
        currency: z.string().optional(),
        stageId: z.string().optional().describe("ID de la nueva etapa (mover de etapa)"),
        approvalToken: z.string().optional().describe("Token que devuelve la página de confirmación humana"),
        source: z
          .enum(["WHATSAPP", "REFERIDO", "LINKEDIN", "VISITA", "EMAIL_FRIO", "FORMULARIO", "INSTAGRAM", "TIKTOK", "FACEBOOK", "OTRO"])
          .nullable()
          .optional(),
        probability: z.number().int().min(0).max(100).optional(),
        notes: z.string().nullable().optional(),
        followUpAt: DATE.nullable().optional(),
        lostReason: z.string().nullable().optional(),
        referredByClientId: z.string().nullable().optional().describe("ID del cliente que refirió este lead"),
        referredByContactId: z.string().nullable().optional().describe("ID del contacto que refirió este lead"),
      },
    },
    async ({ id, stageId, approvalToken, ...fields }) => {
      if (!(await owns("deal", id))) return err("Deal no encontrado");
      if (fields.referredByClientId && !(await owns("client", fields.referredByClientId))) return err("Cliente referidor no encontrado");
      if (fields.referredByContactId && !(await owns("contact", fields.referredByContactId))) return err("Contacto referidor no encontrado");
      const data: any = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
      if ("followUpAt" in data) data.followUpNotifiedAt = null; // fecha nueva: puede volver a avisar
      let lostNote: string | null = null;
      if (stageId) {
        const stage = await prisma.stage.findUnique({ where: { id: stageId }, include: { pipeline: true } });
        if (!stage || stage.pipeline.organizationId !== org) return err("Etapa inválida");
        if (stage.isLost) {
          // Perder un deal exige decir por qué (queda en lostReason, lostAt y la bitácora). No lo inventes: pregúntaselo a la persona.
          const current = await prisma.deal.findUnique({ where: { id }, select: { lostReason: true } });
          const reason = (typeof data.lostReason === "string" ? data.lostReason : current?.lostReason ?? "").trim();
          if (!reason) return err("Para marcar un deal como perdido indica lostReason: por qué se perdió. Pregúntaselo a la persona; no lo inventes.");
          data.lostReason = reason;
          lostNote = reason;
        }
        if (stage.isWon || stage.isLost) {
          const action = canonicalAction("update_deal", definedRecord({ id, ...data, stageId }));
          const summary = `Mover el deal ${id} a «${stage.name}» (${stage.isWon ? "ganado" : "perdido"}).`;
          const gated = gateWrite(action, summary, approvalToken);
          if (!gated.ok) return gated.result;
        }
        data.stageId = stageId;
        data.pipelineId = stage.pipelineId;
        const before = await prisma.deal.findUnique({ where: { id }, select: { wonAt: true } });
        if (stage.isWon) {
          if (!before?.wonAt) data.wonAt = new Date();
        } else {
          data.wonAt = null;
        }
        data.lostAt = stage.isLost ? new Date() : null;
      }
      const deal = await prisma.deal.update({
        where: { id },
        data,
        include: { stage: { select: { name: true, isWon: true, isLost: true } } },
      });
      if (lostNote) {
        await prisma.activityLog.create({ data: { type: "NOTA", description: `Deal perdido en «${deal.stage.name}». Motivo: ${lostNote}`, dealId: id, organizationId: org, createdById: await defaultUserId() } });
      }
      if (stageId && deal.stage.isWon) {
        await ensureContactForWonDeal({ dealId: id, organizationId: org });
        const wonProject = await ensureProjectForWonDeal({ dealId: id, organizationId: org, actorUserId: await defaultUserId() });
        return json({ ...deal, wonProject });
      }
      return json(deal);
    }
  );

  server.registerTool(
    "add_deal_activity",
    {
      description: "Registra una actividad en un deal (llamada, WhatsApp, email, nota, reunión...).",
      inputSchema: {
        dealId: z.string().describe("ID del deal"),
        type: z
          .enum(["LLAMADA", "WHATSAPP", "VISITA", "EMAIL", "NOTA", "PROPUESTA_ENVIADA", "REUNION", "OTRO"])
          .describe("Tipo de actividad"),
        description: z.string().describe("Descripción de la actividad"),
      },
    },
    async ({ dealId, type, description }) => {
      if (!(await owns("deal", dealId))) return err("Deal no encontrado");
      const activity = await prisma.activityLog.create({
        data: { dealId, type, description, organizationId: org },
      });
      return json(activity);
    }
  );

  server.registerTool(
    "list_deal_activities",
    {
      description: "Lista el historial de actividades de un deal, de más reciente a más antigua.",
      inputSchema: {
        dealId: z.string().describe("ID del deal"),
        limit: z.number().int().min(1).max(100).default(50),
      },
    },
    async ({ dealId, limit }) => {
      if (!(await owns("deal", dealId))) return err("Deal no encontrado");
      const activities = await prisma.activityLog.findMany({
        where: { dealId, organizationId: org },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return json(activities);
    }
  );

  // ─── Tareas ───────────────────────────────────────────────────────────────

  server.registerTool(
    "list_tasks",
    {
      description: "Lista las tareas del CRM, con filtros por estado, deal, contacto o proyecto.",
      inputSchema: {
        isCompleted: z.boolean().optional().describe("true = completadas, false = pendientes, omitir = todas"),
        dealId: z.string().optional(),
        contactId: z.string().optional(),
        projectId: z.string().optional(),
        ...pagination,
      },
    },
    async ({ isCompleted, dealId, contactId, projectId, limit, offset }) => {
      const where: any = { organizationId: org };
      if (isCompleted !== undefined) where.isCompleted = isCompleted;
      if (dealId) where.dealId = dealId;
      if (contactId) where.contactId = contactId;
      if (projectId) where.projectId = projectId;
      const [total, tasks] = await Promise.all([
        prisma.task.count({ where }),
        prisma.task.findMany({
          where,
          orderBy: [{ isCompleted: "asc" }, { dueDate: "asc" }],
          take: limit,
          skip: offset,
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            deal: { select: { id: true, title: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
            project: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
          },
        }),
      ]);
      return json({ total, tasks });
    }
  );

  server.registerTool(
    "create_task",
    {
      description: "Crea una tarea. Se asigna por defecto al dueño de la organización salvo que se indique assignedToId (ver list_team_members).",
      inputSchema: {
        title: z.string().describe("Título de la tarea (requerido)"),
        description: z.string().optional(),
        dueDate: DATE.optional().describe("Fecha límite"),
        dealId: z.string().optional(),
        contactId: z.string().optional(),
        projectId: z.string().optional(),
        companyId: z.string().optional(),
        assignedToId: z.string().optional().describe("ID de usuario asignado"),
      },
    },
    async ({ title, description, dueDate, dealId, contactId, projectId, companyId, assignedToId }) => {
      if (dealId && !(await owns("deal", dealId))) return err("Deal inválido");
      if (contactId && !(await owns("contact", contactId))) return err("Contacto inválido");
      if (projectId && !(await owns("project", projectId))) return err("Proyecto inválido");
      if (companyId && !(await owns("company", companyId))) return err("Empresa inválida");
      let userId = assignedToId;
      if (userId) {
        const member = await prisma.organizationMember.findFirst({ where: { organizationId: org, userId } });
        if (!member) return err("El usuario asignado no pertenece a la organización");
      } else {
        userId = (await defaultUserId()) ?? undefined;
        if (!userId) return err("No hay usuarios en la organización para asignar la tarea");
      }
      const task = await prisma.task.create({
        data: {
          title,
          description,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          dealId,
          contactId,
          projectId,
          companyId,
          assignedToId: userId,
          organizationId: org,
        },
      });
      return json(task);
    }
  );

  server.registerTool(
    "update_task",
    {
      description: "Actualiza una tarea: completarla, cambiar título, descripción o fecha límite.",
      inputSchema: {
        id: z.string().describe("ID de la tarea"),
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        dueDate: DATE.nullable().optional(),
        isCompleted: z.boolean().optional().describe("true para marcar como completada"),
      },
    },
    async ({ id, dueDate, ...fields }) => {
      if (!(await owns("task", id))) return err("Tarea no encontrada");
      const data: any = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
      if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
      const task = await prisma.task.update({ where: { id }, data });
      return json(task);
    }
  );

  // ─── Citas ────────────────────────────────────────────────────────────────

  server.registerTool(
    "list_appointments",
    {
      description: "Lista las citas agendadas, con filtros por estado y rango de fechas. Una cita sin appointmentType es un horario apartado a mano (usa su title); bloquea todas las agendas.",
      inputSchema: {
        status: z.string().optional().describe("CONFIRMED, CANCELLED, COMPLETED, etc."),
        from: DATE.optional().describe("Inicio del rango"),
        to: DATE.optional().describe("Fin del rango"),
        limit: z.number().int().min(1).max(100).default(50),
      },
    },
    async ({ status, from, to, limit }) => {
      const where: any = { organizationId: org };
      if (status) where.status = status;
      if (from || to) {
        where.startTime = {};
        if (from) where.startTime.gte = new Date(from);
        if (to) where.startTime.lte = new Date(to);
      }
      const appointments = await prisma.appointment.findMany({
        where,
        orderBy: { startTime: "asc" },
        take: limit,
        include: {
          appointmentType: { select: { id: true, name: true, duration: true, color: true, location: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          deal: { select: { id: true, title: true } },
        },
      });
      return json(appointments);
    }
  );

  server.registerTool(
    "list_appointment_types",
    {
      description: "Lista los tipos de cita configurados (nombre, duración, ubicación, slug de reserva).",
      inputSchema: {},
    },
    async () => {
      const types = await prisma.appointmentType.findMany({
        where: { organizationId: org },
        include: {
          schedule: { select: { id: true, name: true, timezone: true } },
          company: { select: { id: true, name: true } },
          _count: { select: { appointments: true } },
        },
      });
      return json(types);
    }
  );

  // ─── Campañas de email ────────────────────────────────────────────────────

  server.registerTool(
    "list_campaigns",
    {
      description: "Lista las campañas de email marketing con su estado y número de destinatarios.",
      inputSchema: {
        status: z.enum(["DRAFT", "SENDING", "COMPLETED"]).optional(),
        ...pagination,
      },
    },
    async ({ status, limit, offset }) => {
      const where: any = { organizationId: org };
      if (status) where.status = status;
      const [total, campaigns] = await Promise.all([
        prisma.emailCampaign.count({ where }),
        prisma.emailCampaign.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          select: {
            id: true,
            subject: true,
            status: true,
            sentAt: true,
            createdAt: true,
            company: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
            targetForm: { select: { id: true, name: true } },
            _count: { select: { logs: true } },
          },
        }),
      ]);
      return json({ total, campaigns });
    }
  );

  server.registerTool(
    "get_campaign",
    {
      description: "Obtiene el detalle de una campaña: asunto, cuerpo y estadísticas de envío (enviados, fallidos, abiertos).",
      inputSchema: { id: z.string().describe("ID de la campaña") },
    },
    async ({ id }) => {
      const campaign = await prisma.emailCampaign.findFirst({
        where: { id, organizationId: org },
        include: {
          company: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          targetForm: { select: { id: true, name: true } },
        },
      });
      if (!campaign) return err("Campaña no encontrada");
      const stats = await prisma.emailLog.groupBy({
        by: ["status"],
        where: { campaignId: id },
        _count: { status: true },
      });
      return json({ ...campaign, stats: Object.fromEntries(stats.map((s) => [s.status, s._count.status])) });
    }
  );

  // ─── Emails ───────────────────────────────────────────────────────────────

  server.registerTool(
    "list_emails",
    {
      description: "Lista los emails recibidos/enviados (sin cuerpo). Usa get_email para leer el contenido.",
      inputSchema: {
        type: z.enum(["RECEIVED", "SENT", "DRAFT"]).optional(),
        isRead: z.boolean().optional().describe("Filtrar por leídos/no leídos"),
        search: z.string().optional().describe("Buscar en asunto, remitente o destinatario"),
        ...pagination,
      },
    },
    async ({ type, isRead, search, limit, offset }) => {
      const where: any = { organizationId: org, isArchived: false, isSpam: false };
      if (type) where.type = type;
      if (isRead !== undefined) where.isRead = isRead;
      if (search) {
        where.OR = [
          { subject: { contains: search } },
          { fromAddress: { contains: search } },
          { fromName: { contains: search } },
          { toAddress: { contains: search } },
        ];
      }
      const [total, emails] = await Promise.all([
        prisma.email.count({ where }),
        prisma.email.findMany({
          where,
          orderBy: { receivedAt: "desc" },
          take: limit,
          skip: offset,
          select: {
            id: true,
            subject: true,
            fromAddress: true,
            fromName: true,
            toAddress: true,
            type: true,
            isRead: true,
            receivedAt: true,
            company: { select: { id: true, name: true } },
            _count: { select: { attachments: true } },
          },
        }),
      ]);
      return json({ total, emails });
    }
  );

  server.registerTool(
    "create_email_draft",
    {
      description: "Guarda un correo como BORRADOR en el CRM (Correo → Borradores) para que una persona lo revise. NO envía nada. El destinatario puede ir vacío si no se conoce; nunca lo inventes.",
      inputSchema: {
        companyId: z.string().describe("Empresa desde la que se enviaría (id de list_companies)"),
        to: z.string().max(500).optional(),
        cc: z.string().max(500).optional(),
        subject: z.string().max(500).optional(),
        body: z.string().min(1).max(100000).describe("Mensaje en texto plano; las líneas en blanco separan párrafos"),
      },
    },
    async ({ companyId, to, cc, subject, body }) => {
      const company = await prisma.company.findFirst({ where: { id: companyId, organizationId: org }, select: { id: true, name: true, smtpFromEmail: true, smtpUser: true } });
      if (!company) return err("Empresa inválida");
      const draft = normalizeDraft({ to, cc, subject, body });
      if (!draft.ok) return err(draft.error);
      const email = await prisma.email.create({
        data: { ...draft.data, type: "DRAFT", isRead: true, fromAddress: company.smtpFromEmail || company.smtpUser || "", fromName: company.name, companyId: company.id, organizationId: org },
        select: { id: true, subject: true, toAddress: true },
      });
      return json({ ...email, estado: "borrador guardado; no se envió" });
    }
  );

  server.registerTool(
    "get_email",
    {
      description: "Lee el contenido completo de un email (cuerpo de texto y metadatos de adjuntos, sin su contenido binario).",
      inputSchema: { id: z.string().describe("ID del email") },
    },
    async ({ id }) => {
      const email = await prisma.email.findFirst({
        where: { id, organizationId: org },
        select: {
          id: true,
          subject: true,
          fromAddress: true,
          fromName: true,
          toAddress: true,
          ccAddress: true,
          bodyText: true,
          type: true,
          isRead: true,
          receivedAt: true,
          company: { select: { id: true, name: true } },
          attachments: { select: { id: true, filename: true, contentType: true, size: true } },
        },
      });
      if (!email) return err("Email no encontrado");
      return json(email);
    }
  );

  // ─── Cotizaciones ─────────────────────────────────────────────────────────

  /** Agrega `publicUrl` (lo que ve el cliente) y `crmUrl` (el registro en el CRM) y no expone el token suelto. */
  const withQuoteLinks = <Q extends { folio: string; publicToken: string }>(quote: Q) => {
    const urls = tryPublicUrls();
    const { publicToken, ...rest } = quote;
    return { ...rest, publicUrl: urls?.quotePublic(publicToken) ?? null, crmUrl: urls?.quoteCrm(quote.folio) ?? null };
  };

  server.registerTool(
    "list_quotes",
    {
      description: "Lista las cotizaciones con su folio, cliente, estado, total, sus fechas de aceptación y pago, y el lead (deal) al que están ligadas. Con unlinked=true y status=PAGADA salen las cotizaciones ya pagadas que no están en el historial de ventas (no tienen deal): conéctalas con link_quote_to_deal o create_deal_from_quote.",
      inputSchema: {
        status: z.enum(["BORRADOR", "ENVIADA", "ACEPTADA", "PARCIAL", "PAGADA", "VENCIDA", "RECHAZADA"]).optional(),
        dealId: z.string().optional().describe("Solo las cotizaciones de este lead"),
        unlinked: z.boolean().optional().describe("true = solo las que no están ligadas a ningún lead"),
        ...pagination,
      },
    },
    async ({ status, dealId, unlinked, limit, offset }) => {
      const where: any = { organizationId: org };
      if (status) where.status = status;
      if (dealId) where.dealId = dealId;
      if (unlinked) where.dealId = null;
      const [total, quotes] = await Promise.all([
        prisma.quote.count({ where }),
        prisma.quote.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          select: {
            id: true,
            folio: true,
            status: true,
            clientName: true,
            clientCompany: true,
            currency: true,
            total: true,
            issuedAt: true,
            validUntil: true,
            acceptedAt: true,
            paidAt: true,
            splitPayment: true,
            depositPaidAt: true,
            finalPaidAt: true,
            publicToken: true,
            contact: { select: { id: true, firstName: true, lastName: true } },
            deal: { select: { id: true, title: true } },
          },
        }),
      ]);
      return json({ total, quotes: quotes.map(withQuoteLinks) });
    }
  );

  server.registerTool(
    "get_quote",
    {
      description: "Obtiene el detalle de una cotización: ítems, totales, condiciones e historial de eventos.",
      inputSchema: { id: z.string().describe("ID de la cotización") },
    },
    async ({ id }) => {
      const quote = await prisma.quote.findFirst({
        where: { id, organizationId: org },
        include: {
          items: { orderBy: { order: "asc" } },
          events: { orderBy: { createdAt: "desc" }, take: 20 },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          deal: { select: { id: true, title: true } },
          senderCompany: { select: { id: true, name: true } },
        },
      });
      if (!quote) return err("Cotización no encontrada");
      return json(withQuoteLinks(quote));
    }
  );

  server.registerTool(
    "link_quote_to_deal",
    {
      description:
        "Vincula una cotización existente a un lead (deal), o la desvincula con dealId null. No borra nada. Una venta tiene UNA sola fecha (la del deal): si el deal está ganado y la cotización trae otra fecha (aceptada, pagada…), NO se vincula y la respuesta lista las fechas posibles; pregunta a la persona cuál es la correcta y repite con saleDate (el `value` de la opción elegida).",
      inputSchema: {
        quoteId: z.string().describe("ID de la cotización (list_quotes)"),
        dealId: z.string().nullable().describe("ID del lead (list_deals); null para desvincular"),
        saleDate: z.string().optional().describe("Fecha de la venta elegida por la persona: el `value` de una de las opciones devueltas"),
      },
    },
    async ({ quoteId, dealId, saleDate }) => {
      const quote = await findQuoteForLink(org, quoteId);
      if (!quote) return err("Cotización no encontrada");
      const result = await linkQuoteToDeal({ organizationId: org, quote, dealId, saleDate });
      if (!result.ok) {
        return err(result.needsDate ? `${result.error}. Opciones: ${JSON.stringify(result.choices)}. Pregunta a la persona y repite con saleDate.` : result.error);
      }
      return json(result.quote);
    }
  );

  server.registerTool(
    "create_deal_from_quote",
    {
      description:
        "Crea un deal nuevo a partir de una cotización (cliente, moneda y total de la cotización) y la vincula. Úsalo para cotizaciones pagadas o aceptadas que no tienen deal. Mover a una etapa ganada pide aprobación. Si la etapa es ganada y la cotización trae fechas distintas (aceptada, pagada…), la respuesta lista las opciones: pregunta a la persona cuál es la fecha correcta de la venta y repite con saleDate.",
      inputSchema: {
        quoteId: z.string().describe("ID de la cotización (list_quotes con unlinked=true)"),
        stageId: z.string().describe("Etapa del deal (list_pipelines); una etapa ganada si la venta ya se cerró"),
        title: z.string().optional().describe("Título del deal; por defecto el nombre del cliente"),
        saleDate: z.string().optional().describe("Fecha de la venta elegida por la persona: el `value` de una de las opciones devueltas"),
        approvalToken: z.string().optional(),
      },
    },
    async ({ quoteId, stageId, title, saleDate, approvalToken }) => {
      const quote = await findQuoteForLink(org, quoteId);
      if (!quote) return err("Cotización no encontrada");
      const stage = await prisma.stage.findUnique({ where: { id: stageId }, include: { pipeline: true } });
      if (!stage || stage.pipeline.organizationId !== org) return err("Etapa inválida");
      if (stage.isWon) {
        const action = canonicalAction("create_deal_from_quote", definedRecord({ quoteId, stageId, title, saleDate }));
        const gated = gateWrite(action, `Crear un deal ganado desde la cotización ${quote.folio} (${quote.clientName}).`, approvalToken);
        if (!gated.ok) return gated.result;
      }
      const result = await createDealFromQuote({ organizationId: org, quote, stageId, title, saleDate });
      if (!result.ok) {
        return err(result.needsDate ? `${result.error}. Opciones: ${JSON.stringify(result.choices)}. Pregunta a la persona y repite con saleDate.` : result.error);
      }
      return json({ deal: result.deal, quote: result.quote, crmUrl: tryPublicUrls()?.dealCrm(result.deal.id) ?? null });
    }
  );

  server.registerTool(
    "update_quote",
    {
      description:
        "Edita una cotización en BORRADOR o ENVIADA: conceptos (recalcula totales), IVA, vigencia, notas, condiciones y datos del cliente (nombre, empresa, correo, teléfono). En ENVIADA exige approvalToken porque el cliente ya la vio. Otros estados no se pueden editar.",
      inputSchema: {
        id: z.string().describe("ID de la cotización (list_quotes)"),
        items: z
          .array(z.object({ description: z.string(), quantity: z.number().positive().default(1), unitPrice: z.number().min(0), discount: z.number().min(0).max(100).default(0) }))
          .optional()
          .describe("Lista COMPLETA de conceptos: reemplaza a la actual"),
        taxRate: z.number().min(0).max(100).optional().describe("IVA %"),
        validUntil: DATE.nullable().optional(),
        notes: z.string().nullable().optional(),
        terms: z.string().nullable().optional(),
        clientName: z.string().optional(),
        clientCompany: z.string().nullable().optional(),
        clientEmail: z.string().nullable().optional().describe("Correo del cliente; null para quitarlo"),
        clientPhone: z.string().nullable().optional(),
        approvalToken: z.string().optional().describe("Token que devuelve la página de confirmación humana (solo para cotizaciones ENVIADA)"),
      },
    },
    async ({ id, approvalToken, ...input }) => {
      const existing = await prisma.quote.findFirst({
        where: { id, organizationId: org },
        include: { items: { orderBy: { order: "asc" } } },
      });
      if (!existing) return err("Cotización no encontrada");
      if (!canEditQuote(existing.status)) {
        return err(`La cotización ${existing.folio} está en estado ${existing.status}; solo se editan las que están en BORRADOR o ENVIADA.`);
      }
      const invalid = validateQuoteEdit(input);
      if (invalid) return err(invalid);
      if (existing.status === "ENVIADA") {
        const action = canonicalAction("update_quote", definedRecord({ id, ...input }));
        const gated = gateWrite(action, `Editar la cotización ${existing.folio}, que ya fue enviada al cliente.`, approvalToken);
        if (!gated.ok) return gated.result;
      }
      const data: Record<string, unknown> = quoteScalarData(input);
      const rate = input.taxRate ?? existing.taxRate;
      let newItems: ReturnType<typeof computeQuoteTotals>["items"] | null = null;
      if (input.items !== undefined || input.taxRate !== undefined) {
        const totals = computeQuoteTotals(input.items ?? existing.items, rate);
        data.taxRate = rate;
        data.subtotal = totals.subtotal;
        data.taxAmount = totals.taxAmount;
        data.total = totals.total;
        if (input.items !== undefined) newItems = totals.items;
      }
      const changed = Object.keys(input).filter((key) => (input as Record<string, unknown>)[key] !== undefined);
      const quote = await prisma.$transaction(async (tx) => {
        if (newItems) await tx.quoteItem.deleteMany({ where: { quoteId: existing.id } });
        const updated = await tx.quote.update({
          where: { id: existing.id },
          data: { ...data, ...(newItems ? { items: { create: newItems } } : {}) } as any,
          include: { items: { orderBy: { order: "asc" } } },
        });
        await tx.quoteEvent.create({
          data: { type: "EDITADA", description: `Cotización editada por el MCP (${changed.join(", ")})`, actor: "mcp", quoteId: existing.id, organizationId: org },
        });
        return updated;
      });
      return json(withQuoteLinks(quote));
    }
  );

  server.registerTool(
    "create_quote_for_deal",
    {
      description:
        "Crea una cotización en borrador ligada a un lead. Toma el cliente, la moneda y el valor del lead; sin items crea un solo concepto con el título y el valor del lead.",
      inputSchema: {
        dealId: z.string().describe("ID del lead (list_deals)"),
        items: z
          .array(
            z.object({
              description: z.string(),
              quantity: z.number().positive().default(1),
              unitPrice: z.number().min(0),
              discount: z.number().min(0).max(100).default(0),
            }),
          )
          .optional()
          .describe("Conceptos; si se omiten, se usa el valor del lead"),
        taxRate: z.number().min(0).max(100).optional().describe("IVA %; por defecto el de la configuración de cotizaciones"),
        validUntil: DATE.optional(),
        notes: z.string().optional(),
        terms: z.string().optional(),
      },
    },
    async ({ dealId, items, taxRate, validUntil, notes, terms }) => {
      const deal = await prisma.deal.findFirst({
        where: { id: dealId, organizationId: org },
        select: {
          id: true, title: true, value: true, currency: true,
          contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          company: { select: { name: true } },
        },
      });
      if (!deal) return err("Lead no encontrado");
      const prefill = dealToQuotePrefill(deal);
      const settings = await prisma.quoteSettings.findUnique({
        where: { organizationId: org },
        select: { defaultTaxRate: true, defaultTerms: true, defaultSenderCompanyId: true },
      });
      const rate = taxRate ?? settings?.defaultTaxRate ?? 16;
      const totals = computeQuoteTotals(items ?? prefill.items, rate);
      const { folio, folioNumber } = await nextQuoteFolio(org);
      const quote = await prisma.quote.create({
        data: {
          folio,
          folioNumber,
          status: "BORRADOR",
          currency: prefill.currency,
          validUntil: validUntil ? new Date(validUntil) : null,
          dealId: deal.id,
          contactId: prefill.contactId || null,
          clientName: prefill.clientName,
          clientCompany: prefill.clientCompany || null,
          clientEmail: prefill.clientEmail || null,
          clientPhone: prefill.clientPhone || null,
          senderCompanyId: settings?.defaultSenderCompanyId ?? null,
          taxRate: rate,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          total: totals.total,
          notes: notes ?? null,
          terms: terms ?? settings?.defaultTerms ?? null,
          organizationId: org,
          items: { create: totals.items },
          events: { create: { type: "CREADA", description: `Cotización ${folio} creada desde el lead «${deal.title}» (MCP)`, actor: "crm", organizationId: org } },
        },
        select: { id: true, folio: true, status: true, total: true, currency: true, clientName: true, publicToken: true, deal: { select: { id: true, title: true } } },
      });
      return json(withQuoteLinks(quote));
    }
  );

  // ─── Proyectos ────────────────────────────────────────────────────────────

  server.registerTool(
    "list_projects",
    {
      description: "Lista los proyectos con la empresa, contacto y cliente recurrente asociados.",
      inputSchema: {
        search: z.string().optional(),
        ...pagination,
      },
    },
    async ({ search, limit, offset }) => {
      const where: any = { organizationId: org };
      if (search) where.name = { contains: search };
      const [total, projects] = await Promise.all([
        prisma.project.count({ where }),
        prisma.project.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          take: limit,
          skip: offset,
          include: {
            clientCompany: { select: { id: true, name: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
            client: { select: { id: true, name: true } },
            _count: { select: { tasks: true, forms: true } },
          },
        }),
      ]);
      return json({ total, projects });
    }
  );

  server.registerTool(
    "get_project",
    {
      description: "Obtiene el detalle de un proyecto con su actividad reciente y tareas pendientes.",
      inputSchema: { id: z.string().describe("ID del proyecto") },
    },
    async ({ id }) => {
      const project = await prisma.project.findFirst({
        where: { id, organizationId: org },
        include: {
          clientCompany: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          client: { select: { id: true, name: true } },
          activities: { orderBy: { createdAt: "desc" }, take: 20 },
          tasks: {
            where: { isCompleted: false },
            orderBy: { dueDate: "asc" },
            take: 20,
            select: { id: true, title: true, dueDate: true },
          },
        },
      });
      if (!project) return err("Proyecto no encontrado");
      return json(project);
    }
  );

  // ─── Clientes recurrentes ─────────────────────────────────────────────────

  server.registerTool(
    "list_clients",
    {
      description:
        "Lista los clientes de facturación recurrente (mensualidades) con sus pagos del año en curso. Para los clientes de gestión de contenido usa list_content_clients.",
      inputSchema: {
        search: z.string().optional().describe("Buscar en nombre, contacto o email"),
        isActive: z.boolean().optional().describe("Filtrar por activos/inactivos"),
        ...pagination,
      },
    },
    async ({ search, isActive, limit, offset }) => {
      const where: any = { organizationId: org };
      if (isActive !== undefined) where.isActive = isActive;
      if (search) where.OR = [{ name: { contains: search } }, { contactName: { contains: search } }, { email: { contains: search } }];
      const year = new Date().getFullYear();
      const [total, clients] = await Promise.all([
        prisma.client.count({ where }),
        prisma.client.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          select: {
            id: true,
            name: true,
            monthlyFee: true,
            currency: true,
            startDate: true,
            billingDay: true,
            isActive: true,
            contactName: true,
            email: true,
            phone: true,
            company: { select: { id: true, name: true } },
            payments: {
              where: { year },
              orderBy: { month: "asc" },
              select: { id: true, amount: true, status: true, month: true, year: true, dueDate: true, receivedAt: true },
            },
          },
        }),
      ]);
      return json({ total, year, clients });
    }
  );

  server.registerTool(
    "get_client",
    {
      description:
        "Detalle de un cliente de facturación: tarifa, contacto, notas y todos sus pagos (todos los años). No incluye la bóveda de credenciales.",
      inputSchema: { id: z.string().describe("ID del cliente (list_clients)") },
    },
    async ({ id }) => {
      const client = await prisma.client.findFirst({
        where: { id, organizationId: org },
        select: {
          id: true, name: true, monthlyFee: true, currency: true, startDate: true, billingDay: true, autoMarkPaid: true,
          notes: true, isActive: true, contactName: true, phoneCode: true, phone: true, email: true, createdAt: true,
          company: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          payments: {
            orderBy: [{ year: "desc" }, { month: "desc" }],
            select: { id: true, amount: true, status: true, month: true, year: true, dueDate: true, receivedAt: true },
          },
        },
      });
      return client ? json(client) : err("Cliente no encontrado");
    }
  );

  // ─── Formularios ──────────────────────────────────────────────────────────

  server.registerTool(
    "list_forms",
    {
      description: "Lista los formularios de captación con su número de campos y de leads generados.",
      inputSchema: {},
    },
    async () => {
      const forms = await prisma.form.findMany({
        where: { organizationId: org },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          company: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          _count: { select: { fields: true, contacts: true, variants: true } },
        },
      });
      return json(forms);
    }
  );

  // ─── Knowledge Base ───────────────────────────────────────────────────────

  server.registerTool(
    "list_kb_pages",
    {
      description: "Lista las páginas de la base de conocimiento (sin contenido). Usa parentId para navegar el árbol.",
      inputSchema: {
        parentId: z.string().nullable().optional().describe("ID de página padre; null u omitir para raíz"),
      },
    },
    async ({ parentId }) => {
      const pages = await prisma.kbPage.findMany({
        where: { organizationId: org, parentId: parentId ?? null },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          emoji: true,
          isFolder: true,
          isPublished: true,
          parentId: true,
          updatedAt: true,
          _count: { select: { children: true } },
        },
      });
      return json(pages);
    }
  );

  server.registerTool(
    "get_kb_page",
    {
      description: "Lee el contenido completo (markdown) de una página de la base de conocimiento.",
      inputSchema: { id: z.string().describe("ID de la página") },
    },
    async ({ id }) => {
      const page = await prisma.kbPage.findFirst({
        where: { id, organizationId: org },
        select: {
          id: true,
          title: true,
          emoji: true,
          content: true,
          isFolder: true,
          isPublished: true,
          parentId: true,
          updatedAt: true,
          children: { select: { id: true, title: true, isFolder: true } },
          relations: true,
        },
      });
      if (!page) return err("Página no encontrada");
      return json(page);
    }
  );

  server.registerTool(
    "search_kb",
    {
      description: "Busca en el título y contenido de la base de conocimiento.",
      inputSchema: {
        query: z.string().describe("Texto a buscar"),
        limit: z.number().int().min(1).max(50).default(10),
      },
    },
    async ({ query, limit }) => {
      const pages = await prisma.kbPage.findMany({
        where: {
          organizationId: org,
          OR: [{ title: { contains: query } }, { content: { contains: query } }],
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, emoji: true, isFolder: true, updatedAt: true },
      });
      return json(pages);
    }
  );

  // ─── Notificaciones ───────────────────────────────────────────────────────

  server.registerTool(
    "list_notifications",
    {
      description: "Lista las notificaciones del CRM (nuevos emails, contactos, leads de formularios, recordatorios).",
      inputSchema: {
        isRead: z.boolean().optional().describe("false = solo no leídas"),
        limit: z.number().int().min(1).max(100).default(20),
      },
    },
    async ({ isRead, limit }) => {
      const where: any = { organizationId: org };
      if (isRead !== undefined) where.isRead = isRead;
      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return json(notifications);
    }
  );

  // ─── Búsqueda global y métricas ───────────────────────────────────────────

  server.registerTool(
    "search_crm",
    {
      description: "Búsqueda global: encuentra contactos, empresas, deals, proyectos y clientes que coincidan con el texto.",
      inputSchema: {
        query: z.string().describe("Texto a buscar"),
        limit: z.number().int().min(1).max(20).default(5).describe("Resultados por categoría"),
        includeArchived: z.boolean().default(false).describe("Incluir deals archivados (por defecto no salen)"),
      },
    },
    async ({ query, limit, includeArchived }) => {
      const [contacts, companies, deals, projects, clients] = await Promise.all([
        prisma.contact.findMany({
          where: {
            organizationId: org,
            AND: [
              visibleContactWhere,
              {
                OR: [
                  { firstName: { contains: query } },
                  { lastName: { contains: query } },
                  { email: { contains: query } },
                ],
              },
            ],
          },
          take: limit,
          select: { id: true, firstName: true, lastName: true, email: true, company: { select: { name: true } } },
        }),
        prisma.company.findMany({
          where: { organizationId: org, name: { contains: query } },
          take: limit,
          select: { id: true, name: true, industry: true },
        }),
        prisma.deal.findMany({
          where: { organizationId: org, ...dealArchiveFilter(includeArchived), title: { contains: query } },
          take: limit,
          select: { id: true, title: true, value: true, currency: true, stage: { select: { name: true } } },
        }),
        prisma.project.findMany({
          where: { organizationId: org, name: { contains: query } },
          take: limit,
          select: { id: true, name: true, description: true },
        }),
        prisma.client.findMany({
          where: { organizationId: org, name: { contains: query } },
          take: limit,
          select: { id: true, name: true, monthlyFee: true, currency: true, isActive: true },
        }),
      ]);
      return json({ contacts, companies, deals, projects, clients });
    }
  );

  server.registerTool(
    "get_sales_metrics",
    {
      description:
        "Métricas de ventas: deals totales/activos/ganados/perdidos, valor del pipeline, tasa de cierre, ingresos del mes y seguimientos pendientes. Incluye `wonSales`: ventas ganadas (mes y total, por moneda), cuántas tienen cotización, lo cotizado aceptado y lo cobrado. Con `month` (YYYY-MM) devuelve el cierre de ese mes (foto guardada, o cifras en vivo si es el mes en curso) y con `year` (YYYY) la suma de los meses del año. Esas respuestas traen: ventas ganadas, perdidos (contados en el mes en que se perdieron), tasa de cierre, cobros recibidos (pagos de deals y de cotizaciones: pago único, anticipo y resto, por su fecha de pago) e `inProgress`: las ventas ya contadas como ganadas que siguen a mitad de proceso (etapa ganada no final o saldo por cobrar), con el motivo de cada una. Cuando cites «ventas ganadas», aclara cuántas siguen en proceso.",
      inputSchema: {
        month: z.string().optional().describe("Mes a consultar, formato YYYY-MM (p. ej. 2026-10)"),
        year: z.string().optional().describe("Año completo, formato YYYY (p. ej. 2026): suma de sus meses"),
      },
    },
    async ({ month, year }) => {
      if (year && !month) {
        const result = await loadYearMetrics(org, Number(year));
        return result.ok ? json(result) : err(result.error);
      }
      if (month) {
        const result = await loadMonthMetrics(org, month);
        return result.ok ? json(result) : err(result.error);
      }
      return json(await loadSalesMetrics(org));
    }
  );

  server.registerTool(
    "list_team_members",
    {
      description: "Lista los usuarios del equipo con su rol (útil para asignar tareas con create_task).",
      inputSchema: {},
    },
    async () => {
      const members = await prisma.organizationMember.findMany({
        where: { organizationId: org },
        select: { role: true, user: { select: { id: true, name: true, email: true } } },
      });
      return json(members.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email, role: m.role })));
    }
  );
}
