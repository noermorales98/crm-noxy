/* eslint-disable @typescript-eslint/no-explicit-any */
// Herramientas que completan el CRUD (crear, ver, editar, borrar) de cada entidad del CRM para el MCP.
// Todo va acotado a `organizationId`. Los borrados son destructivos: exigen `approvalToken` de la página de confirmación humana
// (igual que `delete_content_item`) y se niegan si dejarían datos huérfanos importantes.
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/src/lib/db";
import { NEW_CATEGORY_STAGES, parseCategoryName } from "@/src/lib/pipeline-categories";
import { tryPublicUrls } from "@/src/lib/url";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { canonicalAction, gateWrite } from "./approval.ts";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function err(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}
const DATE = z.string().describe("Fecha ISO 8601, p. ej. 2026-08-15T15:00:00Z");
const TOKEN = z.string().optional().describe("Token que devuelve la página de confirmación humana");
const FIELD_TYPES = ["TEXT", "EMAIL", "PHONE", "NUMBER", "TEXTAREA", "SELECT", "CHECKBOX", "RADIO", "DATE"] as const;
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "campo";
const compact = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export function registerCrudTools(server: McpServer, organizationId: string) {
  const org = organizationId;
  const urls = () => tryPublicUrls();

  /** ¿La fila existe y es de esta organización? */
  async function owns(model: string, id: string | null | undefined): Promise<boolean> {
    if (!id) return false;
    const row = await (prisma as any)[model].findUnique({ where: { id }, select: { organizationId: true } });
    return row?.organizationId === org;
  }
  /** Compuerta de borrado: sin token válido devuelve la petición de aprobación; con él, `null` y se puede seguir. */
  function gate(tool: string, key: unknown, summary: string, token?: string) {
    const gated = gateWrite(canonicalAction(tool, key), summary, token);
    return gated.ok ? null : gated.result;
  }
  async function safeDelete(run: () => Promise<unknown>, what: string) {
    try {
      await run();
      return json({ ok: true, deleted: what });
    } catch (e) {
      console.error("[mcp crud] delete:", e);
      return err(`No se pudo eliminar (${what}): tiene registros ligados que lo impiden.`);
    }
  }

  // ─── Contactos y empresas: borrar ───────────────────────────────────────────

  server.registerTool(
    "delete_contact",
    {
      description: "Elimina un contacto. Destructivo: exige approvalToken. Sus tareas, deals y citas quedan sin contacto.",
      inputSchema: { id: z.string().describe("ID del contacto"), approvalToken: TOKEN },
    },
    async ({ id, approvalToken }) => {
      const c = await prisma.contact.findFirst({ where: { id, organizationId: org }, select: { firstName: true, lastName: true, _count: { select: { deals: true, quotes: true, appointments: true } } } });
      if (!c) return err("Contacto no encontrado");
      if (c._count.quotes > 0) return err(`El contacto tiene ${c._count.quotes} cotización(es); desvincúlalas o bórralas primero.`);
      const blocked = gate("delete_contact", { id }, `Eliminar el contacto «${`${c.firstName} ${c.lastName ?? ""}`.trim()}» (${c._count.deals} deals, ${c._count.appointments} citas ligadas).`, approvalToken);
      if (blocked) return blocked;
      return safeDelete(() => prisma.contact.delete({ where: { id } }), id);
    },
  );

  server.registerTool(
    "delete_company",
    {
      description: "Elimina una empresa. Destructivo: exige approvalToken. También elimina los formularios de esa empresa; se niega si tiene deals o contactos.",
      inputSchema: { id: z.string().describe("ID de la empresa"), approvalToken: TOKEN },
    },
    async ({ id, approvalToken }) => {
      const c = await prisma.company.findFirst({ where: { id, organizationId: org }, select: { name: true, _count: { select: { contacts: true, deals: true, forms: true } } } });
      if (!c) return err("Empresa no encontrada");
      if (c._count.deals > 0 || c._count.contacts > 0) return err(`La empresa tiene ${c._count.contacts} contacto(s) y ${c._count.deals} deal(s); muévelos o bórralos primero.`);
      const blocked = gate("delete_company", { id }, `Eliminar la empresa «${c.name}» y sus ${c._count.forms} formulario(s).`, approvalToken);
      if (blocked) return blocked;
      return safeDelete(() => prisma.company.delete({ where: { id } }), id);
    },
  );

  // ─── Deals: borrar y archivar ───────────────────────────────────────────────

  server.registerTool(
    "delete_deal",
    {
      description: "Elimina un deal para siempre. Destructivo: exige approvalToken. Para quitarlo de la vista sin perderlo usa archive_deal.",
      inputSchema: { id: z.string().describe("ID del deal"), approvalToken: TOKEN },
    },
    async ({ id, approvalToken }) => {
      const d = await prisma.deal.findFirst({ where: { id, organizationId: org }, select: { title: true, _count: { select: { quotes: true, payments: true } } } });
      if (!d) return err("Deal no encontrado");
      const blocked = gate("delete_deal", { id }, `Eliminar el deal «${d.title}» (${d._count.quotes} cotizaciones, ${d._count.payments} pagos ligados).`, approvalToken);
      if (blocked) return blocked;
      return safeDelete(() => prisma.deal.delete({ where: { id } }), id);
    },
  );

  server.registerTool(
    "archive_deal",
    {
      description: "Archiva un deal (deja de salir en listados, búsqueda y métricas) o lo desarchiva. No borra nada.",
      inputSchema: { id: z.string().describe("ID del deal"), archived: z.boolean().default(true).describe("true = archivar, false = desarchivar") },
    },
    async ({ id, archived }) => {
      if (!(await owns("deal", id))) return err("Deal no encontrado");
      const deal = await prisma.deal.update({ where: { id }, data: { isArchived: archived, archivedAt: archived ? new Date() : null }, select: { id: true, title: true, isArchived: true, archivedAt: true } });
      return json(deal);
    },
  );

  // ─── Tareas ─────────────────────────────────────────────────────────────────

  server.registerTool(
    "get_task",
    { description: "Detalle de una tarea.", inputSchema: { id: z.string() } },
    async ({ id }) => {
      const t = await prisma.task.findFirst({
        where: { id, organizationId: org },
        include: { contact: { select: { id: true, firstName: true, lastName: true } }, deal: { select: { id: true, title: true } }, assignedTo: { select: { id: true, name: true } } },
      });
      return t ? json(t) : err("Tarea no encontrada");
    },
  );

  server.registerTool(
    "delete_task",
    { description: "Elimina una tarea. Destructivo: exige approvalToken.", inputSchema: { id: z.string(), approvalToken: TOKEN } },
    async ({ id, approvalToken }) => {
      const t = await prisma.task.findFirst({ where: { id, organizationId: org }, select: { title: true } });
      if (!t) return err("Tarea no encontrada");
      const blocked = gate("delete_task", { id }, `Eliminar la tarea «${t.title}».`, approvalToken);
      if (blocked) return blocked;
      return safeDelete(() => prisma.task.delete({ where: { id } }), id);
    },
  );

  // ─── Cotizaciones: borrar ───────────────────────────────────────────────────

  server.registerTool(
    "delete_quote",
    {
      description: "Elimina una cotización. Destructivo: exige approvalToken. Una cotización PAGADA no se puede borrar por aquí.",
      inputSchema: { id: z.string().describe("ID de la cotización"), approvalToken: TOKEN },
    },
    async ({ id, approvalToken }) => {
      const q = await prisma.quote.findFirst({ where: { id, organizationId: org }, select: { folio: true, status: true, total: true, currency: true } });
      if (!q) return err("Cotización no encontrada");
      if (q.status === "PAGADA") return err(`La cotización ${q.folio} está PAGADA; no se borra desde el MCP.`);
      const blocked = gate("delete_quote", { id }, `Eliminar la cotización ${q.folio} (${q.status}, ${q.total} ${q.currency}).`, approvalToken);
      if (blocked) return blocked;
      return safeDelete(() => prisma.quote.delete({ where: { id } }), id);
    },
  );

  // ─── Pipelines (categorías) y etapas ────────────────────────────────────────

  server.registerTool(
    "create_pipeline",
    {
      description: "Crea una categoría de pipeline (p. ej. «Noxy Cursos»). Sin stages nace con Nuevo, En proceso, Ganado y Perdido.",
      inputSchema: {
        name: z.string().describe("Nombre de la categoría"),
        stages: z.array(z.object({ name: z.string(), color: z.string().optional(), isWon: z.boolean().default(false), isLost: z.boolean().default(false) })).optional().describe("Etapas en orden; por defecto las 4 estándar"),
      },
    },
    async ({ name, stages }) => {
      const existing = await prisma.pipeline.findMany({ where: { organizationId: org }, select: { name: true } });
      const parsed = parseCategoryName({ name }, existing.map((p) => p.name));
      if (!parsed.ok) return err(parsed.error);
      const list = stages?.length ? stages.map((s) => ({ name: s.name.trim(), color: s.color ?? "#6B7280", isWon: s.isWon, isLost: s.isLost })) : NEW_CATEGORY_STAGES.map((s) => ({ ...s }));
      if (list.some((s) => !s.name)) return err("Todas las etapas necesitan nombre");
      const pipeline = await prisma.pipeline.create({
        data: { name: parsed.name, organizationId: org, stages: { create: list.map((s, order) => ({ ...s, order })) } },
        include: { stages: { orderBy: { order: "asc" }, select: { id: true, name: true, order: true, isWon: true, isLost: true } } },
      });
      return json(pipeline);
    },
  );

  server.registerTool(
    "update_pipeline",
    { description: "Renombra una categoría de pipeline.", inputSchema: { id: z.string(), name: z.string() } },
    async ({ id, name }) => {
      if (!(await owns("pipeline", id))) return err("Pipeline no encontrado");
      const others = await prisma.pipeline.findMany({ where: { organizationId: org, NOT: { id } }, select: { name: true } });
      const parsed = parseCategoryName({ name }, others.map((p) => p.name));
      if (!parsed.ok) return err(parsed.error);
      return json(await prisma.pipeline.update({ where: { id }, data: { name: parsed.name }, select: { id: true, name: true } }));
    },
  );

  server.registerTool(
    "delete_pipeline",
    {
      description: "Elimina una categoría de pipeline y sus etapas. Destructivo: exige approvalToken. Se niega si tiene deals (muévelos o bórralos antes) o si es la única.",
      inputSchema: { id: z.string(), approvalToken: TOKEN },
    },
    async ({ id, approvalToken }) => {
      const p = await prisma.pipeline.findFirst({ where: { id, organizationId: org }, select: { name: true, _count: { select: { deals: true, stages: true } } } });
      if (!p) return err("Pipeline no encontrado");
      if (p._count.deals > 0) return err(`«${p.name}» tiene ${p._count.deals} deal(s); muévelos o bórralos primero.`);
      if ((await prisma.pipeline.count({ where: { organizationId: org } })) <= 1) return err("No se puede borrar el único pipeline.");
      const blocked = gate("delete_pipeline", { id }, `Eliminar la categoría «${p.name}» y sus ${p._count.stages} etapas.`, approvalToken);
      if (blocked) return blocked;
      return safeDelete(() => prisma.pipeline.delete({ where: { id } }), id);
    },
  );

  server.registerTool(
    "create_stage",
    {
      description: "Agrega una etapa a un pipeline (al final, o en la posición `order`).",
      inputSchema: { pipelineId: z.string(), name: z.string(), color: z.string().optional(), isWon: z.boolean().default(false), isLost: z.boolean().default(false), order: z.number().int().min(0).optional() },
    },
    async ({ pipelineId, name, color, isWon, isLost, order }) => {
      if (!(await owns("pipeline", pipelineId))) return err("Pipeline no encontrado");
      if (!name.trim()) return err("La etapa necesita nombre");
      if (isWon && isLost) return err("Una etapa no puede ser ganada y perdida a la vez");
      const last = await prisma.stage.aggregate({ where: { pipelineId }, _max: { order: true } });
      const stage = await prisma.stage.create({ data: { pipelineId, name: name.trim(), color: color ?? "#6B7280", isWon, isLost, order: order ?? (last._max.order ?? -1) + 1 } });
      return json(stage);
    },
  );

  server.registerTool(
    "update_stage",
    {
      description: "Edita una etapa: nombre, color, si es ganada o perdida, y su posición.",
      inputSchema: { id: z.string(), name: z.string().optional(), color: z.string().optional(), isWon: z.boolean().optional(), isLost: z.boolean().optional(), order: z.number().int().min(0).optional() },
    },
    async ({ id, ...fields }) => {
      const st = await prisma.stage.findUnique({ where: { id }, select: { pipeline: { select: { organizationId: true } }, isWon: true, isLost: true } });
      if (!st || st.pipeline.organizationId !== org) return err("Etapa no encontrada");
      const data: any = compact(fields);
      if (data.name !== undefined) { data.name = String(data.name).trim(); if (!data.name) return err("La etapa necesita nombre"); }
      if ((data.isWon ?? st.isWon) && (data.isLost ?? st.isLost)) return err("Una etapa no puede ser ganada y perdida a la vez");
      if (!Object.keys(data).length) return err("No hay nada que cambiar");
      return json(await prisma.stage.update({ where: { id }, data }));
    },
  );

  server.registerTool(
    "delete_stage",
    { description: "Elimina una etapa vacía. Destructivo: exige approvalToken. Se niega si tiene deals.", inputSchema: { id: z.string(), approvalToken: TOKEN } },
    async ({ id, approvalToken }) => {
      const st = await prisma.stage.findUnique({ where: { id }, select: { name: true, pipeline: { select: { organizationId: true, name: true } }, _count: { select: { deals: true } } } });
      if (!st || st.pipeline.organizationId !== org) return err("Etapa no encontrada");
      if (st._count.deals > 0) return err(`La etapa «${st.name}» tiene ${st._count.deals} deal(s); muévelos primero.`);
      const blocked = gate("delete_stage", { id }, `Eliminar la etapa «${st.name}» de «${st.pipeline.name}».`, approvalToken);
      if (blocked) return blocked;
      return safeDelete(() => prisma.stage.delete({ where: { id } }), id);
    },
  );

  // ─── Formularios ────────────────────────────────────────────────────────────

  const formFieldInput = z.object({
    type: z.enum(FIELD_TYPES),
    label: z.string(),
    name: z.string().optional().describe("Nombre interno; por defecto sale de la etiqueta"),
    placeholder: z.string().optional(),
    isRequired: z.boolean().default(false),
    options: z.array(z.string()).optional().describe("Opciones para SELECT / RADIO"),
  });
  const fieldRows = (fields: z.infer<typeof formFieldInput>[]) =>
    fields.map((f, order) => ({ type: f.type, label: f.label.trim(), name: slug(f.name ?? f.label), placeholder: f.placeholder ?? null, isRequired: f.isRequired, options: f.options?.length ? JSON.stringify(f.options) : null, order }));

  server.registerTool(
    "get_form",
    { description: "Detalle de un formulario: campos, ajustes, enlace público y cuántos contactos ha captado.", inputSchema: { id: z.string() } },
    async ({ id }) => {
      const f = await prisma.form.findFirst({
        where: { id, organizationId: org },
        select: { id: true, name: true, description: true, isActive: true, successAction: true, successMessage: true, redirectUrl: true, accentColor: true, backgroundColor: true, showNoxyBrand: true, companyId: true, createdAt: true, fields: { orderBy: { order: "asc" } }, _count: { select: { contacts: true, tasks: true } } },
      });
      return f ? json({ ...f, publicUrl: urls()?.formPublic(f.id) ?? null }) : err("Formulario no encontrado");
    },
  );

  server.registerTool(
    "create_form",
    {
      description: "Crea un formulario público ligado a una empresa. Devuelve su enlace público. Captura contactos y activa su seguimiento.",
      inputSchema: {
        companyId: z.string().describe("Empresa dueña del formulario (list_companies)"),
        name: z.string(),
        description: z.string().optional(),
        fields: z.array(formFieldInput).min(1),
        successMessage: z.string().optional(),
        isActive: z.boolean().default(true),
      },
    },
    async ({ companyId, name, description, fields, successMessage, isActive }) => {
      if (!(await owns("company", companyId))) return err("Empresa no encontrada");
      if (!name.trim()) return err("El formulario necesita nombre");
      if (fields.some((f) => !f.label.trim())) return err("Todos los campos necesitan etiqueta");
      const form = await prisma.form.create({
        data: { organizationId: org, companyId, name: name.trim(), description: description ?? null, successMessage: successMessage ?? null, isActive, fields: { create: fieldRows(fields) } },
        select: { id: true, name: true, isActive: true, fields: { orderBy: { order: "asc" }, select: { id: true, label: true, name: true, type: true, isRequired: true } } },
      });
      return json({ ...form, publicUrl: urls()?.formPublic(form.id) ?? null });
    },
  );

  server.registerTool(
    "update_form",
    {
      description: "Edita un formulario: nombre, descripción, activo/inactivo, mensaje de éxito, colores y, si pasas `fields`, REEMPLAZA todos sus campos (los registros ya captados no se tocan).",
      inputSchema: {
        id: z.string(),
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        successMessage: z.string().nullable().optional(),
        redirectUrl: z.string().nullable().optional(),
        accentColor: z.string().nullable().optional(),
        backgroundColor: z.string().nullable().optional(),
        showNoxyBrand: z.boolean().optional(),
        fields: z.array(formFieldInput).min(1).optional(),
      },
    },
    async ({ id, fields, ...rest }) => {
      if (!(await owns("form", id))) return err("Formulario no encontrado");
      const data: any = compact(rest);
      if (data.name !== undefined) { data.name = String(data.name).trim(); if (!data.name) return err("El formulario necesita nombre"); }
      if (!Object.keys(data).length && !fields) return err("No hay nada que cambiar");
      if (fields?.some((f) => !f.label.trim())) return err("Todos los campos necesitan etiqueta");
      const form = await prisma.$transaction(async (tx) => {
        if (fields) await tx.formField.deleteMany({ where: { formId: id } });
        return tx.form.update({ where: { id }, data: { ...data, ...(fields ? { fields: { create: fieldRows(fields) } } : {}) }, select: { id: true, name: true, isActive: true } });
      });
      return json({ ...form, publicUrl: urls()?.formPublic(form.id) ?? null });
    },
  );

  server.registerTool(
    "delete_form",
    { description: "Elimina un formulario y sus campos. Destructivo: exige approvalToken. Su enlace público deja de funcionar; los contactos ya captados se conservan.", inputSchema: { id: z.string(), approvalToken: TOKEN } },
    async ({ id, approvalToken }) => {
      const f = await prisma.form.findFirst({ where: { id, organizationId: org }, select: { name: true, _count: { select: { contacts: true } } } });
      if (!f) return err("Formulario no encontrado");
      const blocked = gate("delete_form", { id }, `Eliminar el formulario «${f.name}» (${f._count.contacts} contactos captados se conservan; el enlace público deja de funcionar).`, approvalToken);
      if (blocked) return blocked;
      return safeDelete(() => prisma.form.delete({ where: { id } }), id);
    },
  );

  // ─── Proyectos («Entregas») ─────────────────────────────────────────────────

  const projectLinks = async (b: { companyId?: string | null; contactId?: string | null; clientId?: string | null }) => {
    if (b.companyId && !(await owns("company", b.companyId))) return "Empresa no encontrada";
    if (b.contactId && !(await owns("contact", b.contactId))) return "Contacto no encontrado";
    if (b.clientId && !(await owns("client", b.clientId))) return "Cliente recurrente no encontrado";
    return null;
  };

  server.registerTool(
    "create_project",
    {
      description: "Crea un proyecto («Entregas»), opcionalmente ligado a una empresa, contacto o cliente recurrente.",
      inputSchema: { name: z.string(), description: z.string().optional(), icon: z.string().optional(), companyId: z.string().optional(), contactId: z.string().optional(), clientId: z.string().optional() },
    },
    async (input) => {
      if (!input.name.trim()) return err("El proyecto necesita nombre");
      const bad = await projectLinks(input);
      if (bad) return err(bad);
      const p = await prisma.project.create({ data: { organizationId: org, name: input.name.trim(), description: input.description ?? null, icon: input.icon ?? null, companyId: input.companyId ?? null, contactId: input.contactId ?? null, clientId: input.clientId ?? null }, select: { id: true, name: true } });
      return json({ ...p, crmUrl: urls()?.projectCrm(p.id) ?? null });
    },
  );

  server.registerTool(
    "update_project",
    {
      description: "Edita un proyecto: nombre, descripción, icono y sus vínculos (null los quita).",
      inputSchema: { id: z.string(), name: z.string().optional(), description: z.string().nullable().optional(), icon: z.string().nullable().optional(), companyId: z.string().nullable().optional(), contactId: z.string().nullable().optional(), clientId: z.string().nullable().optional() },
    },
    async ({ id, ...rest }) => {
      if (!(await owns("project", id))) return err("Proyecto no encontrado");
      const bad = await projectLinks(rest);
      if (bad) return err(bad);
      const data: any = compact(rest);
      if (data.name !== undefined) { data.name = String(data.name).trim(); if (!data.name) return err("El proyecto necesita nombre"); }
      if (!Object.keys(data).length) return err("No hay nada que cambiar");
      const p = await prisma.project.update({ where: { id }, data, select: { id: true, name: true } });
      return json({ ...p, crmUrl: urls()?.projectCrm(p.id) ?? null });
    },
  );

  server.registerTool(
    "delete_project",
    { description: "Elimina un proyecto. Destructivo: exige approvalToken. Sus tareas y formularios se conservan, sin proyecto.", inputSchema: { id: z.string(), approvalToken: TOKEN } },
    async ({ id, approvalToken }) => {
      const p = await prisma.project.findFirst({ where: { id, organizationId: org }, select: { name: true, _count: { select: { tasks: true, forms: true } } } });
      if (!p) return err("Proyecto no encontrado");
      const blocked = gate("delete_project", { id }, `Eliminar el proyecto «${p.name}» (${p._count.tasks} tareas y ${p._count.forms} formularios quedan sin proyecto).`, approvalToken);
      if (blocked) return blocked;
      return safeDelete(() => prisma.project.delete({ where: { id } }), id);
    },
  );

  // ─── Clientes recurrentes («Suscripciones») ─────────────────────────────────

  const clientInput = {
    name: z.string(),
    monthlyFee: z.number().min(0).describe("Cuota mensual"),
    currency: z.string().optional().describe("USD o MXN"),
    startDate: DATE,
    billingDay: z.number().int().min(1).max(28).optional().describe("Día de cobro del mes (1-28)"),
    autoMarkPaid: z.boolean().optional(),
    notes: z.string().optional(),
    contactName: z.string().optional(),
    phone: z.string().optional(),
    phoneCode: z.string().optional(),
    email: z.string().email().optional(),
    companyId: z.string().optional(),
    contactId: z.string().optional(),
    isActive: z.boolean().optional(),
  };

  server.registerTool(
    "create_client",
    { description: "Crea un cliente recurrente (una suscripción con cobro mensual, la sección «Suscripciones»). No es lo mismo que una organización/sub-cuenta: para esas usa create_organization.", inputSchema: clientInput },
    async (input) => {
      if (!input.name.trim()) return err("El cliente necesita nombre");
      if (Number.isNaN(new Date(input.startDate).getTime())) return err("Fecha de inicio no válida");
      const bad = await projectLinks({ companyId: input.companyId, contactId: input.contactId });
      if (bad) return err(bad);
      const c = await prisma.client.create({ data: { organizationId: org, ...compact({ ...input, name: input.name.trim(), startDate: new Date(input.startDate) }) } as any, select: { id: true, name: true, monthlyFee: true, currency: true, billingDay: true, isActive: true } });
      return json(c);
    },
  );

  server.registerTool(
    "update_client",
    { description: "Edita un cliente recurrente (suscripción): cuota, día de cobro, contacto, activo/inactivo, notas…", inputSchema: { id: z.string(), ...Object.fromEntries(Object.entries(clientInput).map(([k, v]) => [k, (v as z.ZodTypeAny).optional()])) } as any },
    async ({ id, ...rest }: any) => {
      if (!(await owns("client", id))) return err("Cliente no encontrado");
      const bad = await projectLinks({ companyId: rest.companyId, contactId: rest.contactId });
      if (bad) return err(bad);
      const data: any = compact(rest);
      if (data.startDate !== undefined) { const d = new Date(data.startDate); if (Number.isNaN(d.getTime())) return err("Fecha de inicio no válida"); data.startDate = d; }
      if (data.name !== undefined) data.name = String(data.name).trim();
      if (!Object.keys(data).length) return err("No hay nada que cambiar");
      return json(await prisma.client.update({ where: { id }, data, select: { id: true, name: true, monthlyFee: true, currency: true, billingDay: true, isActive: true } }));
    },
  );

  server.registerTool(
    "delete_client",
    { description: "Elimina un cliente recurrente y su historial de cobros y bóveda. Destructivo: exige approvalToken. Para solo dejar de cobrarle usa update_client con isActive false.", inputSchema: { id: z.string(), approvalToken: TOKEN } },
    async ({ id, approvalToken }) => {
      const c = await prisma.client.findFirst({ where: { id, organizationId: org }, select: { name: true, _count: { select: { payments: true, vaultEntries: true } } } });
      if (!c) return err("Cliente no encontrado");
      const blocked = gate("delete_client", { id }, `Eliminar al cliente «${c.name}» con ${c._count.payments} cobros y ${c._count.vaultEntries} credenciales de la bóveda.`, approvalToken);
      if (blocked) return blocked;
      return safeDelete(() => prisma.client.delete({ where: { id } }), id);
    },
  );

  // ─── Citas ──────────────────────────────────────────────────────────────────

  const APPT_STATUS = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;

  server.registerTool(
    "get_appointment",
    { description: "Detalle de una cita.", inputSchema: { id: z.string() } },
    async ({ id }) => {
      const a = await prisma.appointment.findFirst({ where: { id, organizationId: org }, include: { appointmentType: { select: { id: true, name: true, duration: true } }, contact: { select: { id: true, firstName: true, lastName: true } } } });
      return a ? json(a) : err("Cita no encontrada");
    },
  );

  server.registerTool(
    "create_appointment",
    {
      description: "Aparta una cita a mano. No envía correos ni WhatsApp. Si se da un tipo de cita y no endTime, la duración sale del tipo. Se niega si choca con otra cita (allowOverlap lo permite).",
      inputSchema: {
        startTime: DATE,
        endTime: DATE.optional(),
        appointmentTypeId: z.string().optional(),
        guestName: z.string(),
        guestEmail: z.string().email(),
        guestPhone: z.string().optional(),
        title: z.string().optional(),
        notes: z.string().optional(),
        contactId: z.string().optional(),
        dealId: z.string().optional(),
        timezone: z.string().optional(),
        allowOverlap: z.boolean().default(false),
      },
    },
    async (i) => {
      const start = new Date(i.startTime);
      if (Number.isNaN(start.getTime())) return err("startTime no válido");
      let end = i.endTime ? new Date(i.endTime) : null;
      if (i.appointmentTypeId) {
        const type = await prisma.appointmentType.findFirst({ where: { id: i.appointmentTypeId, organizationId: org }, select: { duration: true } });
        if (!type) return err("Tipo de cita no encontrado");
        if (!end) end = new Date(start.getTime() + type.duration * 60_000);
      }
      if (!end || Number.isNaN(end.getTime())) return err("Indica endTime o un appointmentTypeId para calcularlo");
      if (end <= start) return err("endTime debe ser posterior a startTime");
      if (i.contactId && !(await owns("contact", i.contactId))) return err("Contacto no encontrado");
      if (i.dealId && !(await owns("deal", i.dealId))) return err("Deal no encontrado");
      if (!i.allowOverlap) {
        const clash = await prisma.appointment.findFirst({ where: { organizationId: org, status: { not: "CANCELLED" }, startTime: { lt: end }, endTime: { gt: start } }, select: { id: true, startTime: true, guestName: true } });
        if (clash) return err(`Choca con otra cita (${clash.guestName}, ${clash.startTime.toISOString()}). Usa allowOverlap para permitirlo.`);
      }
      const a = await prisma.appointment.create({
        data: { organizationId: org, startTime: start, endTime: end, status: "CONFIRMED", guestName: i.guestName, guestEmail: i.guestEmail, guestPhone: i.guestPhone ?? null, title: i.title ?? null, notes: i.notes ?? null, appointmentTypeId: i.appointmentTypeId ?? null, contactId: i.contactId ?? null, dealId: i.dealId ?? null, ...(i.timezone ? { timezone: i.timezone } : {}) },
      });
      return json(a);
    },
  );

  server.registerTool(
    "update_appointment",
    {
      description: "Edita una cita: reagendar (startTime/endTime), estado, título, notas y datos del invitado. Reagendar reinicia sus recordatorios. No envía avisos.",
      inputSchema: { id: z.string(), startTime: DATE.optional(), endTime: DATE.optional(), status: z.enum(APPT_STATUS).optional(), title: z.string().nullable().optional(), notes: z.string().nullable().optional(), guestName: z.string().optional(), guestEmail: z.string().email().optional(), guestPhone: z.string().nullable().optional() },
    },
    async ({ id, startTime, endTime, ...rest }) => {
      const cur = await prisma.appointment.findFirst({ where: { id, organizationId: org }, select: { startTime: true, endTime: true } });
      if (!cur) return err("Cita no encontrada");
      const data: any = compact(rest);
      if (startTime || endTime) {
        const start = startTime ? new Date(startTime) : cur.startTime;
        const end = endTime ? new Date(endTime) : startTime ? new Date(start.getTime() + (cur.endTime.getTime() - cur.startTime.getTime())) : cur.endTime;
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return err("Fecha no válida");
        if (end <= start) return err("endTime debe ser posterior a startTime");
        Object.assign(data, { startTime: start, endTime: end, reminderSent1h: false, reminderSent10m: false, reminderSent5m: false });
      }
      if (!Object.keys(data).length) return err("No hay nada que cambiar");
      return json(await prisma.appointment.update({ where: { id }, data }));
    },
  );

  server.registerTool(
    "delete_appointment",
    { description: "Elimina una cita. Destructivo: exige approvalToken. Para solo cancelarla usa update_appointment con status CANCELLED.", inputSchema: { id: z.string(), approvalToken: TOKEN } },
    async ({ id, approvalToken }) => {
      const a = await prisma.appointment.findFirst({ where: { id, organizationId: org }, select: { guestName: true, startTime: true } });
      if (!a) return err("Cita no encontrada");
      const blocked = gate("delete_appointment", { id }, `Eliminar la cita de ${a.guestName} del ${a.startTime.toISOString()}.`, approvalToken);
      if (blocked) return blocked;
      return safeDelete(() => prisma.appointment.delete({ where: { id } }), id);
    },
  );

  // ─── Docs (base de conocimiento) ────────────────────────────────────────────

  server.registerTool(
    "create_kb_page",
    {
      description: "Crea una página (o carpeta) en Docs. Contenido en Markdown. No sincroniza con Notion por sí sola (usa sync_lead_to_notion / las herramientas notion_*).",
      inputSchema: { title: z.string(), content: z.string().optional().describe("Markdown"), parentId: z.string().nullable().optional(), isFolder: z.boolean().default(false), emoji: z.string().optional() },
    },
    async ({ title, content, parentId, isFolder, emoji }) => {
      if (parentId && !(await owns("kbPage", parentId))) return err("Página padre no encontrada");
      const last = await prisma.kbPage.aggregate({ where: { organizationId: org, parentId: parentId ?? null }, _max: { sortOrder: true } });
      const page = await prisma.kbPage.create({ data: { organizationId: org, title: title.trim() || "Sin título", content: content ?? null, parentId: parentId ?? null, isFolder, emoji: emoji ?? null, sortOrder: (last._max.sortOrder ?? -1) + 1 }, select: { id: true, title: true, isFolder: true, parentId: true } });
      return json({ ...page, crmUrl: urls()?.kbPageCrm(page.id) ?? null });
    },
  );

  server.registerTool(
    "update_kb_page",
    {
      description: "Edita una página de Docs: título, contenido Markdown, emoji, publicada o no, o la mueve a otra carpeta (parentId, null = raíz).",
      inputSchema: { id: z.string(), title: z.string().optional(), content: z.string().nullable().optional(), emoji: z.string().nullable().optional(), isPublished: z.boolean().optional(), parentId: z.string().nullable().optional() },
    },
    async ({ id, ...rest }) => {
      if (!(await owns("kbPage", id))) return err("Página no encontrada");
      const data: any = compact(rest);
      if (data.parentId) {
        if (data.parentId === id) return err("Una página no puede ser su propia carpeta");
        if (!(await owns("kbPage", data.parentId))) return err("Página padre no encontrada");
        // Sin ciclos: la nueva carpeta no puede colgar de esta página.
        let cursor: string | null = data.parentId;
        for (let depth = 0; cursor && depth < 50; depth++) {
          if (cursor === id) return err("No se puede mover una carpeta dentro de sí misma");
          cursor = (await prisma.kbPage.findUnique({ where: { id: cursor }, select: { parentId: true } }))?.parentId ?? null;
        }
      }
      if (!Object.keys(data).length) return err("No hay nada que cambiar");
      const page = await prisma.kbPage.update({ where: { id }, data, select: { id: true, title: true, isFolder: true, parentId: true, isPublished: true } });
      return json({ ...page, crmUrl: urls()?.kbPageCrm(page.id) ?? null });
    },
  );

  server.registerTool(
    "delete_kb_page",
    { description: "Elimina una página de Docs. Destructivo: exige approvalToken. Sus subpáginas se conservan, sin padre.", inputSchema: { id: z.string(), approvalToken: TOKEN } },
    async ({ id, approvalToken }) => {
      const p = await prisma.kbPage.findFirst({ where: { id, organizationId: org }, select: { title: true, _count: { select: { children: true } } } });
      if (!p) return err("Página no encontrada");
      const blocked = gate("delete_kb_page", { id }, `Eliminar la página «${p.title}» (${p._count.children} subpáginas quedan en la raíz).`, approvalToken);
      if (blocked) return blocked;
      return safeDelete(async () => {
        await prisma.kbPage.updateMany({ where: { parentId: id, organizationId: org }, data: { parentId: null } });
        await prisma.kbPage.delete({ where: { id } });
      }, id);
    },
  );

  // ─── Clientes de contenido ──────────────────────────────────────────────────

  const contentClientInput = {
    name: z.string(),
    kind: z.enum(["cliente", "marca"]).optional(),
    description: z.string().nullable().optional(),
    context: z.string().nullable().optional().describe("Voz de marca, audiencia, productos, tono (lo usa la IA)"),
    color: z.string().optional().describe("Hex del calendario general"),
    isActive: z.boolean().optional(),
    reminderHour: z.number().int().min(0).max(23).optional(),
    reminderMinute: z.number().int().min(0).max(59).optional(),
    reminderDaysBefore: z.number().int().min(0).max(30).optional(),
  };

  server.registerTool(
    "create_content_client",
    { description: "Crea un cliente o marca de Gestión de contenido (calendario propio). Para encender sus avisos por WhatsApp usa set_content_reminders.", inputSchema: contentClientInput },
    async (input) => {
      if (!input.name.trim()) return err("Necesita nombre");
      const c = await prisma.contentClient.create({ data: { organizationId: org, ...compact({ ...input, name: input.name.trim() }) } as any, select: { id: true, name: true, kind: true, color: true, isActive: true } });
      return json({ ...c, crmUrl: urls()?.contentClientCrm(c.id) ?? null });
    },
  );

  server.registerTool(
    "update_content_client",
    { description: "Edita un cliente de Gestión de contenido: nombre, tipo, descripción, contexto de marca, color, activo/inactivo y la hora de sus avisos.", inputSchema: { id: z.string(), ...Object.fromEntries(Object.entries(contentClientInput).map(([k, v]) => [k, (v as z.ZodTypeAny).optional()])) } as any },
    async ({ id, ...rest }: any) => {
      if (!(await owns("contentClient", id))) return err("Cliente de contenido no encontrado");
      const data: any = compact(rest);
      if (data.name !== undefined) { data.name = String(data.name).trim(); if (!data.name) return err("Necesita nombre"); }
      if (!Object.keys(data).length) return err("No hay nada que cambiar");
      const c = await prisma.contentClient.update({ where: { id }, data, select: { id: true, name: true, kind: true, color: true, isActive: true } });
      return json({ ...c, crmUrl: urls()?.contentClientCrm(c.id) ?? null });
    },
  );

  server.registerTool(
    "delete_content_client",
    { description: "Elimina un cliente de Gestión de contenido y TODAS sus piezas del calendario. Destructivo: exige approvalToken. Para pausarlo usa update_content_client con isActive false.", inputSchema: { id: z.string(), approvalToken: TOKEN } },
    async ({ id, approvalToken }) => {
      const c = await prisma.contentClient.findFirst({ where: { id, organizationId: org }, select: { name: true, _count: { select: { items: true } } } });
      if (!c) return err("Cliente de contenido no encontrado");
      const blocked = gate("delete_content_client", { id }, `Eliminar «${c.name}» y sus ${c._count.items} piezas del calendario.`, approvalToken);
      if (blocked) return blocked;
      return safeDelete(() => prisma.contentClient.delete({ where: { id } }), id);
    },
  );

  // ─── Notificaciones ─────────────────────────────────────────────────────────

  server.registerTool(
    "mark_notification_read",
    { description: "Marca una notificación como leída, o todas con all=true.", inputSchema: { id: z.string().optional(), all: z.boolean().default(false) } },
    async ({ id, all }) => {
      if (!all && !id) return err("Indica id o all=true");
      const result = await prisma.notification.updateMany({ where: { organizationId: org, ...(all ? {} : { id }) }, data: { isRead: true } });
      return json({ ok: true, updated: result.count });
    },
  );

  server.registerTool(
    "delete_notification",
    { description: "Borra una notificación.", inputSchema: { id: z.string() } },
    async ({ id }) => {
      const result = await prisma.notification.deleteMany({ where: { id, organizationId: org } });
      return result.count ? json({ ok: true, deleted: id }) : err("Notificación no encontrada");
    },
  );
}
