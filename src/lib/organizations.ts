// @ts-expect-error: node --test carga el .ts directo
import { isRoleName, normalizePermissions, type ModulePermissions, type RoleName } from "./permissions.ts";
// @ts-expect-error: node --test carga el .ts directo
import { EDITORIAL_PIPELINE_NAME, EDITORIAL_STAGES, SALES_STAGES, type DesiredStage } from "./pipeline-setup.ts";

// Sub-cuentas: cada cliente es una Organization y el usuario es miembro de todas. Funciones puras (sin base de datos).

export const SALES_PIPELINE_NAME = "Ventas";
export const DEFAULT_TIMEZONE = "America/Cancun";
export const MAX_ORG_NAME = 120;

/** Pipelines que lleva una organización nueva, con sus etapas. */
export const DEFAULT_PIPELINES: { name: string; stages: DesiredStage[] }[] = [
  { name: SALES_PIPELINE_NAME, stages: SALES_STAGES },
  { name: EDITORIAL_PIPELINE_NAME, stages: EDITORIAL_STAGES },
];

export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export type OrganizationInput = { name: string; timezone: string };

export function parseOrganizationInput(body: unknown): { ok: true; value: OrganizationInput } | { ok: false; error: string } {
  const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : "";
  if (!name) return { ok: false, error: "El nombre es obligatorio" };
  if (name.length > MAX_ORG_NAME) return { ok: false, error: `El nombre admite hasta ${MAX_ORG_NAME} caracteres` };
  const timezone = raw.timezone === undefined || raw.timezone === "" ? DEFAULT_TIMEZONE : raw.timezone;
  if (!isValidTimezone(timezone)) return { ok: false, error: "Zona horaria no válida" };
  return { ok: true, value: { name, timezone } };
}

export type MembershipLike = {
  id: string;
  organizationId: string;
  role: string;
  permissions: unknown;
  createdAt: Date;
};

/** Org con la que se entra al iniciar sesión: la membresía más antigua (desempate por id), nunca «la primera que devuelva la base». */
export function pickInitialMembership<T extends MembershipLike>(memberships: T[]): T | null {
  if (!memberships.length) return null;
  return [...memberships].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))[0];
}

export type SessionClaims = { currentOrganizationId: string; role: RoleName | null; permissions: ModulePermissions };

/** Lo que la sesión debe llevar para una membresía: org, rol y permisos de ESA org (nunca los de la anterior). */
export function sessionClaimsFor(m: MembershipLike): SessionClaims {
  const role = isRoleName(m.role) ? m.role : null;
  return { currentOrganizationId: m.organizationId, role, permissions: normalizePermissions(m.permissions, role) };
}

/** Destino pedido por el cliente → claims, solo si hay membresía en ese destino; si no, null. */
export function resolveSwitch(memberships: MembershipLike[], requestedOrganizationId: unknown): SessionClaims | null {
  if (typeof requestedOrganizationId !== "string" || !requestedOrganizationId) return null;
  const m = memberships.find((x) => x.organizationId === requestedOrganizationId);
  return m ? sessionClaimsFor(m) : null;
}
