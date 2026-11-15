import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { buildDigestContext } from '@/src/lib/digest';
import { ensureLeadFollowups } from '@/src/lib/lead-followup-service';
import { weeklyComparison, weeklyText } from '@/src/lib/video-analytics';
import { leadInput, paymentReceivedInput, taskInput, weeklyVideosInput } from '@/src/lib/bot-input';

function authorized(req: Request): boolean {
  const expected = process.env.NOXY_BOT_TOKEN;
  const match = /^Bearer (.+)$/.exec(req.headers.get('authorization') ?? '');
  if (!expected || !match) return false;
  const actual = Buffer.from(match[1]);
  const secret = Buffer.from(expected);
  return actual.length === secret.length && timingSafeEqual(actual, secret);
}

async function context(req: Request) {
  if (!authorized(req)) return null;
  const organizationId = process.env.NOXY_BOT_ORGANIZATION_ID;
  if (!organizationId) return null;
  const owner = await prisma.organizationMember.findFirst({
    where: { organizationId, role: 'OWNER' }, select: { userId: true },
  });
  return owner ? { organizationId, userId: owner.userId } : null;
}

function invalid(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function bodyAsJson(req: Request): Promise<unknown> {
  try { return await req.json(); } catch { return null; }
}

export async function GET(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const ctx = await context(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { action } = await params;
  if (action === 'daily') return NextResponse.json({ text: await buildDigestContext(ctx.organizationId, ctx.userId) });
  if (action === 'weekly-videos') {
    const parsed = weeklyVideosInput.safeParse(new URL(req.url).searchParams.get('weeks') ?? undefined);
    if (!parsed.success) return invalid('weeks debe estar entre 1 y 52');
    const videos = await prisma.video.findMany({
      where: { organizationId: ctx.organizationId, publishedAt: { gte: new Date(Date.now() - parsed.data * 7 * 86400000) } },
    });
    const comparison = weeklyComparison(videos);
    return NextResponse.json({ ...comparison, text: weeklyText(comparison) });
  }
  return NextResponse.json({ error: 'Acción desconocida' }, { status: 404 });
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const ctx = await context(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { action } = await params;
  if (!['lead', 'task', 'payment-received'].includes(action)) return NextResponse.json({ error: 'Acción desconocida' }, { status: 404 });
  const body = await bodyAsJson(req);

  if (action === 'lead') {
    const parsed = leadInput.safeParse(body);
    if (!parsed.success) return invalid('Lead inválido: revisa título, fuente y referente');
    const lead = parsed.data;
    const [contact, referredContact, referredClient] = await Promise.all([
      lead.contactId ? prisma.contact.findFirst({ where: { id: lead.contactId, organizationId: ctx.organizationId }, select: { id: true } }) : null,
      lead.referredByContactId ? prisma.contact.findFirst({ where: { id: lead.referredByContactId, organizationId: ctx.organizationId }, select: { id: true } }) : null,
      lead.referredByClientId ? prisma.client.findFirst({ where: { id: lead.referredByClientId, organizationId: ctx.organizationId }, select: { id: true } }) : null,
    ]);
    if ((lead.contactId && !contact) || (lead.referredByContactId && !referredContact) || (lead.referredByClientId && !referredClient)) return invalid('Contacto o referente inexistente en esta organización');
    const pipelines = await prisma.pipeline.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { createdAt: 'asc' }, include: { stages: true } });
    const pipeline = pipelines.find(p => p.name === 'Noxy Digital') ?? pipelines[0];
    const stage = pipeline?.stages.find(s => s.name.trim().toLowerCase() === 'lead');
    if (!pipeline || !stage) return NextResponse.json({ error: 'Pipeline Lead inexistente' }, { status: 409 });
    const deal = await prisma.deal.create({ data: {
      title: lead.title, notes: lead.notes, contactId: lead.contactId, referredByContactId: lead.referredByContactId,
      referredByClientId: lead.referredByClientId, source: lead.source, organizationId: ctx.organizationId,
      pipelineId: pipeline.id, stageId: stage.id,
    } });
    let followupTasksCreated = 0;
    try { followupTasksCreated = await ensureLeadFollowups(deal.id, ctx.organizationId); }
    catch (error) { console.error('Bot lead followups:', error); }
    return NextResponse.json({ id: deal.id, followupTasksCreated }, { status: 201 });
  }

  if (action === 'task') {
    const parsed = taskInput.safeParse(body);
    if (!parsed.success) return invalid('Tarea inválida: revisa título y fecha');
    const input = parsed.data;
    const [deal, contact] = await Promise.all([
      input.dealId ? prisma.deal.findFirst({ where: { id: input.dealId, organizationId: ctx.organizationId }, select: { id: true } }) : null,
      input.contactId ? prisma.contact.findFirst({ where: { id: input.contactId, organizationId: ctx.organizationId }, select: { id: true } }) : null,
    ]);
    if ((input.dealId && !deal) || (input.contactId && !contact)) return invalid('Deal o contacto inexistente en esta organización');
    const task = await prisma.task.create({ data: {
      title: input.title, description: input.description, dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      dealId: input.dealId, contactId: input.contactId, organizationId: ctx.organizationId, assignedToId: ctx.userId,
    } });
    return NextResponse.json({ id: task.id }, { status: 201 });
  }

  const parsed = paymentReceivedInput.safeParse(body);
  if (!parsed.success) return invalid('ID de pago requerido');
  const id = parsed.data.id;
  const payment = await prisma.payment.findFirst({ where: { id, organizationId: ctx.organizationId }, select: { status: true } });
  const monthly = payment ? null : await prisma.clientPayment.findFirst({ where: { id, organizationId: ctx.organizationId }, select: { status: true } });
  const found = payment ?? monthly;
  if (!found) return NextResponse.json({ error: 'Pago inexistente' }, { status: 404 });
  if (found.status === 'RECIBIDO') return NextResponse.json({ id, status: 'RECIBIDO', alreadyReceived: true });
  if (found.status !== 'PENDIENTE') return NextResponse.json({ error: 'Solo un pago pendiente puede marcarse como recibido' }, { status: 409 });
  const where = { id, organizationId: ctx.organizationId, status: 'PENDIENTE' as const };
  const changed = payment
    ? await prisma.payment.updateMany({ where, data: { status: 'RECIBIDO', receivedAt: new Date() } })
    : await prisma.clientPayment.updateMany({ where, data: { status: 'RECIBIDO', receivedAt: new Date() } });
  if (changed.count !== 1) return NextResponse.json({ error: 'El pago cambió; vuelve a consultar' }, { status: 409 });
  return NextResponse.json({ id, status: 'RECIBIDO' });
}
