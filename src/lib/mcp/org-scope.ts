// Qué organización usa una conexión del MCP. Puro: sin base de datos.
// El MCP nace atado a una organización base (MCP_ORGANIZATION_ID). Con sub-cuentas, una conexión puede apuntar a otra
// con `?org=<id>`, pero solo a las que pertenecen al dueño de la base: nunca a una organización ajena.

export type McpOrgChoice = { ok: true; organizationId: string } | { ok: false; error: string };

export function pickMcpOrganization(baseOrganizationId: string, requested: string | null | undefined, allowedIds: readonly string[]): McpOrgChoice {
  if (!requested || requested === baseOrganizationId) return { ok: true, organizationId: baseOrganizationId };
  if (allowedIds.includes(requested)) return { ok: true, organizationId: requested };
  return { ok: false, error: "Organización no disponible para este conector" };
}

/** Enlace del conector de una organización: el de la base no lleva parámetro. */
export function connectorUrl(origin: string, baseOrganizationId: string, organizationId: string): string {
  const root = origin.replace(/\/+$/, "");
  return organizationId === baseOrganizationId ? `${root}/mcp` : `${root}/mcp?org=${encodeURIComponent(organizationId)}`;
}
