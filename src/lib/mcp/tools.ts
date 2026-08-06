/* eslint-disable @typescript-eslint/no-explicit-any */
// Los filtros `where`/`data` de Prisma se construyen dinámicamente según los
// argumentos dados; el proyecto ya usa `any` en sus route handlers.
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/src/lib/db";

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
        select: { userId: true },
      })) ??
      (await prisma.organizationMember.findFirst({
        where: { organizationId: org },
        select: { userId: true },
      }));
    return member?.userId ?? null;
  }

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
      const where: any = { organizationId: org };
      if (companyId) where.companyId = companyId;
      if (search) {
        where.OR = [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
        ];
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
      description: "Actualiza los datos de un contacto existente.",
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
          deals: { select: { id: true, title: true, value: true, currency: true, stage: { select: { name: true } } } },
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
      description: "Lista los deals (oportunidades) del CRM con filtros por etapa, pipeline, contacto o empresa.",
      inputSchema: {
        stageId: z.string().optional(),
        pipelineId: z.string().optional(),
        contactId: z.string().optional(),
        companyId: z.string().optional(),
        ...pagination,
      },
    },
    async ({ stageId, pipelineId, contactId, companyId, limit, offset }) => {
      const where: any = { organizationId: org };
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
      description: "Obtiene el detalle completo de un deal: etapa, contacto, empresa, propuestas, pagos y actividad reciente.",
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
      return json(deal);
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
          .enum(["WHATSAPP", "REFERIDO", "LINKEDIN", "VISITA", "EMAIL_FRIO", "FORMULARIO", "INSTAGRAM", "OTRO"])
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
      return json(deal);
    }
  );

  server.registerTool(
    "update_deal",
    {
      description: "Actualiza un deal: título, valor, etapa (mover en el pipeline), probabilidad, notas, seguimiento o razón de pérdida.",
      inputSchema: {
        id: z.string().describe("ID del deal"),
        title: z.string().optional(),
        value: z.number().optional(),
        currency: z.string().optional(),
        stageId: z.string().optional().describe("ID de la nueva etapa (mover de etapa)"),
        source: z
          .enum(["WHATSAPP", "REFERIDO", "LINKEDIN", "VISITA", "EMAIL_FRIO", "FORMULARIO", "INSTAGRAM", "OTRO"])
          .nullable()
          .optional(),
        probability: z.number().int().min(0).max(100).optional(),
        notes: z.string().nullable().optional(),
        followUpAt: DATE.nullable().optional(),
        lostReason: z.string().nullable().optional(),
      },
    },
    async ({ id, stageId, ...fields }) => {
      if (!(await owns("deal", id))) return err("Deal no encontrado");
      const data: any = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
      if (stageId) {
        const stage = await prisma.stage.findUnique({ where: { id: stageId }, include: { pipeline: true } });
        if (!stage || stage.pipeline.organizationId !== org) return err("Etapa inválida");
        data.stageId = stageId;
        data.pipelineId = stage.pipelineId;
      }
      const deal = await prisma.deal.update({
        where: { id },
        data,
        include: { stage: { select: { name: true, isWon: true, isLost: true } } },
      });
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
      description: "Lista las citas agendadas, con filtros por estado y rango de fechas.",
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
        type: z.enum(["RECEIVED", "SENT"]).optional(),
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

  server.registerTool(
    "list_quotes",
    {
      description: "Lista las cotizaciones con su folio, cliente, estado y total.",
      inputSchema: {
        status: z.enum(["BORRADOR", "ENVIADA", "ACEPTADA", "PAGADA", "VENCIDA", "RECHAZADA"]).optional(),
        ...pagination,
      },
    },
    async ({ status, limit, offset }) => {
      const where: any = { organizationId: org };
      if (status) where.status = status;
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
            contact: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
      ]);
      return json({ total, quotes });
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
          senderCompany: { select: { id: true, name: true } },
        },
      });
      if (!quote) return err("Cotización no encontrada");
      return json(quote);
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
      description: "Lista los clientes de facturación recurrente (mensualidades) con sus pagos del año en curso.",
      inputSchema: {
        isActive: z.boolean().optional().describe("Filtrar por activos/inactivos"),
        ...pagination,
      },
    },
    async ({ isActive, limit, offset }) => {
      const where: any = { organizationId: org };
      if (isActive !== undefined) where.isActive = isActive;
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
      },
    },
    async ({ query, limit }) => {
      const [contacts, companies, deals, projects, clients] = await Promise.all([
        prisma.contact.findMany({
          where: {
            organizationId: org,
            OR: [
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { email: { contains: query } },
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
          where: { organizationId: org, title: { contains: query } },
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
      description: "Métricas de ventas: deals totales/activos/ganados/perdidos, valor del pipeline, tasa de cierre, ingresos del mes y seguimientos pendientes.",
      inputSchema: {},
    },
    async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const [totalDeals, dealsThisMonth, allDeals, revenueData, followUpsData] = await Promise.all([
        prisma.deal.count({ where: { organizationId: org } }),
        prisma.deal.count({ where: { organizationId: org, createdAt: { gte: startOfMonth } } }),
        prisma.deal.findMany({
          where: { organizationId: org },
          select: { value: true, stage: { select: { isWon: true, isLost: true } } },
        }),
        prisma.payment.aggregate({
          where: { organizationId: org, status: "RECIBIDO", receivedAt: { gte: startOfMonth, lte: endOfMonth } },
          _sum: { amount: true },
        }),
        prisma.deal.findMany({
          where: { organizationId: org, followUpAt: { lte: now }, stage: { isWon: false, isLost: false } },
          select: {
            id: true,
            title: true,
            followUpAt: true,
            contact: { select: { firstName: true, lastName: true } },
          },
          orderBy: { followUpAt: "asc" },
          take: 10,
        }),
      ]);

      const wonDeals = allDeals.filter((d) => d.stage.isWon).length;
      const lostDeals = allDeals.filter((d) => d.stage.isLost).length;
      const activeDeals = allDeals.filter((d) => !d.stage.isWon && !d.stage.isLost);

      return json({
        totalDeals,
        dealsThisMonth,
        wonDeals,
        lostDeals,
        activeDeals: activeDeals.length,
        followUpsDue: followUpsData.length,
        closingRate: totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0,
        pipelineValue: activeDeals.reduce((sum, d) => sum + (d.value ?? 0), 0),
        revenueThisMonth: revenueData._sum.amount ?? 0,
        followUps: followUpsData,
      });
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
