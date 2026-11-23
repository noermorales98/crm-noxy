// Destinatario de los avisos de una organización. Sin dependencias.

export type OwnerCandidate = { id: string; createdAt: Date; user?: { callMeBot?: { phone?: string | null; apiKey?: string | null } | null } | null };

/**
 * A quién van la tarea y los avisos de una organización: el OWNER más antiguo que tenga WhatsApp (CallMeBot) configurado;
 * si ninguno lo tiene, el OWNER más antiguo. Determinista: con varios OWNER nunca depende del orden que devuelva la base.
 */
export function pickNotifyOwner<T extends OwnerCandidate>(owners: T[]): T | null {
  const sorted = [...owners].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  return sorted.find((o) => o.user?.callMeBot?.phone && o.user.callMeBot.apiKey) ?? sorted[0] ?? null;
}
