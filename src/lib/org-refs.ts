// Multi-cuenta: un id que llega en el cuerpo de una petición (contactId, companyId, dealId…) solo vale si ese registro
// es de la organización activa. Sin esto, una sub-cuenta podría enlazar —y leer en la respuesta— datos de otra.

/** Campo del cuerpo → modelo de Prisma donde vive. */
export const ORG_REF_MODELS = {
  contactId: "contact",
  companyId: "company",
  emailAccountCompanyId: "company",
  senderCompanyId: "company",
  dealId: "deal",
  projectId: "project",
  clientId: "client",
  appointmentId: "appointment",
  formId: "form",
  appointmentTypeId: "appointmentType",
  welcomeEmailId: "emailCampaign",
  pipelineId: "pipeline",
  scheduleId: "availabilitySchedule",
} as const;

export type OrgRefField = keyof typeof ORG_REF_MODELS;

/** Lo mínimo que se necesita de Prisma: `db[modelo].count({ where })`. */
export type OrgRefsDb = Record<string, { count(args: { where: { id: string; organizationId: string } }): Promise<number> }>;

/**
 * Comprueba que cada id presente (no vacío) pertenece a `organizationId`.
 * Devuelve el mensaje de error del primer campo ajeno, o `null` si todo es de la organización.
 * Los ids vacíos o null se ignoran: significan «sin vínculo».
 */
export async function assertOrgRefs(db: OrgRefsDb, organizationId: string, refs: Partial<Record<OrgRefField, unknown>>): Promise<string | null> {
  for (const [field, raw] of Object.entries(refs) as [OrgRefField, unknown][]) {
    if (raw === undefined || raw === null || raw === "") continue;
    if (typeof raw !== "string") return `${field} no es válido`;
    const model = ORG_REF_MODELS[field];
    if (!model) throw new Error(`Campo sin modelo conocido: ${field}`);
    const found = await db[model].count({ where: { id: raw, organizationId } });
    if (!found) return `${field} no existe en esta organización`;
  }
  return null;
}
