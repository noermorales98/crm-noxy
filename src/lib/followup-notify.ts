// Decide qué seguimientos vencidos se avisan y arma UN mensaje por dueño. Puro: sin base de datos.

export type FollowUpDeal = {
  id: string;
  title: string;
  followUpAt: Date | null;
  followUpNotifiedAt: Date | null;
  isArchived: boolean;
  contactName?: string | null;
};

/** Avisa si vence en la ventana, no está archivado y no se avisó ya por esta misma fecha de seguimiento. */
export function shouldNotifyFollowUp(deal: FollowUpDeal, now: Date, windowHours = 24): boolean {
  if (deal.isArchived || !deal.followUpAt) return false;
  const due = deal.followUpAt.getTime();
  if (due > now.getTime() || due < now.getTime() - windowHours * 3_600_000) return false;
  return !deal.followUpNotifiedAt || deal.followUpNotifiedAt.getTime() < due;
}

/** Un solo mensaje con hasta `max` seguimientos y «+N más». */
export function buildFollowUpMessage(deals: Pick<FollowUpDeal, "title" | "contactName">[], max = 5, organizationName?: string | null): string {
  const shown = deals.slice(0, max).map((deal) => `• ${deal.title}${deal.contactName ? ` — ${deal.contactName}` : ""}`);
  const more = deals.length > max ? `\n+${deals.length - max} más` : "";
  const noun = deals.length === 1 ? "seguimiento vencido" : "seguimientos vencidos";
  // Con varias sub-cuentas, el aviso dice de cuál es.
  const where = organizationName ? ` · ${organizationName}` : "";
  return `⏰ ${deals.length} ${noun} en Noxy CRM${where}\n${shown.join("\n")}${more}`;
}
