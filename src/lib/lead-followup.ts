export const FOLLOWUP_OFFSETS = [1, 3, 7] as const;
export function followupTasks(deal: { id: string; title: string; createdAt: Date; contactId: string | null }) {
  return FOLLOWUP_OFFSETS.map(days => ({
    title: `Seguimiento ${days}d: ${deal.title}`,
    description: `WhatsApp sugerido (revisar y copiar): Hola, te escribo de Noxy para dar seguimiento a ${deal.title}. ¿Te gustaría que conversemos?`,
    dueDate: new Date(deal.createdAt.getTime() + days * 86400000),
    dealId: deal.id, contactId: deal.contactId,
  }));
}
export function shouldCloseSilentLead(deal: { createdAt: Date; lastActivityAt?: Date | null; stageName: string }, now = new Date()) {
  return deal.stageName.toLowerCase() === 'lead' &&
    now.getTime() - deal.createdAt.getTime() >= 14 * 86400000 && !deal.lastActivityAt;
}
