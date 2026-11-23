// Empresa → sub-cuenta: reglas puras de qué se copia y cómo se rehacen las referencias. Sin base de datos.
// Se COPIA; el original no se toca (solo se marca Company.migratedToOrgId).

export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

type Id = string;
export type SrcStage = { id: Id; name: string; order: number; color: string; isWon: boolean; isLost: boolean };
export type SrcPipeline = { id: Id; name: string; createdAt: Date; stages: SrcStage[] };
export type DstPipeline = { id: Id; name: string; stages: { id: Id; name: string }[] };

export type PipelinePlan = {
  sourceId: Id;
  name: string;
  /** Pipeline que ya existe en la sub-cuenta con el mismo nombre, o null si hay que crearlo. */
  targetId: Id | null;
  stages: { sourceId: Id; name: string; order: number; color: string; isWon: boolean; isLost: boolean; targetId: Id | null }[];
};

/** Para cada pipeline usado por los deals: casa por nombre con los de la sub-cuenta o marca qué crear (pipelines y etapas), sin perder ninguna etapa. */
export function planPipelines(used: SrcPipeline[], existing: DstPipeline[]): PipelinePlan[] {
  return used.map((src) => {
    const dst = existing.find((p) => norm(p.name) === norm(src.name)) ?? null;
    return {
      sourceId: src.id,
      name: src.name,
      targetId: dst?.id ?? null,
      stages: [...src.stages]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ sourceId: s.id, name: s.name, order: s.order, color: s.color, isWon: s.isWon, isLost: s.isLost, targetId: dst?.stages.find((x) => norm(x.name) === norm(s.name))?.id ?? null })),
    };
  });
}

/** Contactos a copiar: los de la empresa y los de sus deals (aunque tengan otra empresa), sin duplicar. */
export function contactIdsToCopy(companyContactIds: Id[], dealContactIds: (Id | null)[]): Id[] {
  return [...new Set([...companyContactIds, ...dealContactIds.filter((x): x is Id => !!x)])];
}

type Ctx = { organizationId: Id; companyId: Id };

export function contactCopyData(c: { firstName: string; lastName: string | null; email: string | null; phone: string | null; source: string | null; sourceFormId: Id | null; sourceVariantId: Id | null }, ctx: Ctx & { formMap: Map<Id, Id>; variantMap: Map<Id, Id> }) {
  return {
    firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, source: c.source,
    organizationId: ctx.organizationId, companyId: ctx.companyId,
    sourceFormId: c.sourceFormId ? ctx.formMap.get(c.sourceFormId) ?? null : null,
    sourceVariantId: c.sourceVariantId ? ctx.variantMap.get(c.sourceVariantId) ?? null : null,
  };
}

/**
 * Deal copiado. Se dejan fuera a propósito: `bookingToken` (único, se genera uno nuevo), `notionPageId` (la página es del original),
 * `followUpAt`/`followUpNotifiedAt` (el original seguiría avisando y habría avisos dobles) y `referredByClientId` (cliente de otra org).
 */
export function dealCopyData(
  d: { title: string; value: number | null; currency: string; source: string | null; lostReason: string | null; probability: number; notes: string | null; icon: string | null; allowedBookingTypes: string | null; isArchived: boolean; archivedAt: Date | null; wonAt: Date | null; createdAt: Date; contactId: Id | null; referredByContactId: Id | null },
  ctx: Ctx & { stageId: Id; pipelineId: Id; contactMap: Map<Id, Id> },
) {
  return {
    title: d.title, value: d.value, currency: d.currency, source: d.source, lostReason: d.lostReason, probability: d.probability, notes: d.notes, icon: d.icon,
    // Los tipos de cita permitidos son ids de la org original: no valen en la sub-cuenta.
    allowedBookingTypes: null as string | null,
    isArchived: d.isArchived, archivedAt: d.archivedAt, wonAt: d.wonAt, createdAt: d.createdAt,
    organizationId: ctx.organizationId, companyId: ctx.companyId, stageId: ctx.stageId, pipelineId: ctx.pipelineId,
    contactId: d.contactId ? ctx.contactMap.get(d.contactId) ?? null : null,
    referredByContactId: d.referredByContactId ? ctx.contactMap.get(d.referredByContactId) ?? null : null,
  };
}

/**
 * Formulario copiado. Se dejan fuera: `apiToken` y la configuración de API (un token no se duplica entre organizaciones; la API nace apagada),
 * `welcomeEmailId`, `projectId` y `appointmentTypeId` (pertenecen a la org original) y los destinatarios de WhatsApp (los avisos se deciden por sub-cuenta).
 */
export function formCopyData(
  f: { name: string; description: string | null; isActive: boolean; successAction: string; successMessage: string | null; redirectUrl: string | null; accentColor: string | null; backgroundColor: string | null; showNoxyBrand: boolean; apiAuthRequired: boolean },
  ctx: Ctx,
) {
  return {
    name: f.name, description: f.description, isActive: f.isActive, successAction: f.successAction, successMessage: f.successMessage, redirectUrl: f.redirectUrl,
    accentColor: f.accentColor, backgroundColor: f.backgroundColor, showNoxyBrand: f.showNoxyBrand,
    apiEnabled: false, apiAuthRequired: true, apiToken: null as string | null,
    organizationId: ctx.organizationId, companyId: ctx.companyId,
    welcomeEmailId: null as string | null, projectId: null as string | null, appointmentTypeId: null as string | null,
  };
}
