// Panel de agencia («Clientes»): una tarjeta por sub-cuenta. Funciones puras, sin base de datos.
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { hasPermission, normalizePermissions, isRoleName, type RoleName } from "./permissions.ts";

export type Money = Record<string, number>;

export type AgencyMembership = { organizationId: string; organizationName: string; role: string; permissions: unknown };

/** Organizaciones que entran al panel: aquellas donde esta persona es OWNER o tiene el permiso «agency» asignado. */
export function agencyMemberships<T extends AgencyMembership>(memberships: T[]): T[] {
  return memberships.filter((m) => {
    const role: RoleName | null = isRoleName(m.role) ? m.role : null;
    return hasPermission(role, normalizePermissions(m.permissions, role), "agency");
  });
}

export type AgencyClose = { month: string; wonCount: number; won: Money; closingRate: number | null; paymentsReceived: Money };

export type AgencyCard = {
  organizationId: string;
  name: string;
  current: boolean;
  openDeals: number;
  wonThisMonth: { count: number; byCurrency: Money };
  overdueTasks: number;
  pendingPayments: number;
  lastClose: AgencyClose | null;
  /** Lo que pide atención: tareas vencidas + cobros pendientes. Sirve para ordenar. */
  attention: number;
};

export function buildAgencyCard(input: {
  organizationId: string;
  name: string;
  currentOrganizationId: string | null | undefined;
  openDeals: number;
  wonThisMonth: { count: number; byCurrency: Money };
  overdueTasks: number;
  pendingPayments: number;
  snapshot: { year: number; month: number; metrics: unknown } | null;
}): AgencyCard {
  return {
    organizationId: input.organizationId,
    name: input.name,
    current: input.organizationId === input.currentOrganizationId,
    openDeals: input.openDeals,
    wonThisMonth: input.wonThisMonth,
    overdueTasks: input.overdueTasks,
    pendingPayments: input.pendingPayments,
    lastClose: readClose(input.snapshot),
    attention: input.overdueTasks + input.pendingPayments,
  };
}

/** Lee la foto mensual (JSON guardado) sin fiarse de su forma: si algo no cuadra, no hay cierre que mostrar. */
export function readClose(snapshot: { year: number; month: number; metrics: unknown } | null): AgencyClose | null {
  if (!snapshot || !snapshot.metrics || typeof snapshot.metrics !== "object") return null;
  const m = snapshot.metrics as Record<string, any>;
  const money = (value: unknown): Money =>
    value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, v]) => typeof v === "number")) as Money : {};
  return {
    month: `${snapshot.year}-${String(snapshot.month).padStart(2, "0")}`,
    wonCount: typeof m.won?.count === "number" ? m.won.count : 0,
    won: money(m.won?.byCurrency),
    closingRate: typeof m.closingRate === "number" ? m.closingRate : null,
    paymentsReceived: money(m.paymentsReceived),
  };
}

/** Lo que pide más atención primero; a igualdad, la cuenta activa y luego por nombre. */
export function sortAgencyCards(cards: AgencyCard[]): AgencyCard[] {
  return [...cards].sort((a, b) => b.attention - a.attention || Number(b.current) - Number(a.current) || a.name.localeCompare(b.name, "es"));
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return MONTHS[month - 1] ? `${MONTHS[month - 1]} ${year}` : key;
}
