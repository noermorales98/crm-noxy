/**
 * Vínculos de una cita con un lead (deal) y un contacto.
 * `undefined` = no tocar; `null` = desvincular; texto = vincular a ese registro.
 */
export type LinkChange = string | null | undefined;

export function readLinkChange(body: Record<string, unknown>, key: "dealId" | "contactId"): LinkChange {
  if (!(key in body)) return undefined;
  const value = body[key];
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : undefined;
}

/**
 * Al vincular una cita a un lead, la cita adopta el contacto del lead solo si todavía no tenía uno
 * y la petición no trae un contacto propio; nunca pisa un contacto que ya tenía.
 */
export function contactAfterDealLink(params: {
  requestedContact: LinkChange;
  currentContactId: string | null;
  dealContactId: string | null;
}): LinkChange {
  if (params.requestedContact !== undefined) return params.requestedContact;
  if (!params.currentContactId && params.dealContactId) return params.dealContactId;
  return undefined;
}
