import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { EMPTY_THEME_BOOT, resolveActiveThemeId, type ThemeBoot } from "@/src/lib/org-brand";

type BootOrg = { id: string; name: string; brandColor: string | null; brandIcon: string | null; themeId: string | null };

/** La empresa con su identidad; si las columnas de identidad aún no existen en la base, solo nombre (sin romper la pantalla). */
async function loadOrg(orgId: string): Promise<BootOrg | null> {
  try {
    return await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true, brandColor: true, brandIcon: true, themeId: true } });
  } catch {
    const basic = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true } }).catch(() => null);
    return basic ? { ...basic, brandColor: null, brandIcon: null, themeId: null } : null;
  }
}

/**
 * Tema y empresa actuales, resueltos en el servidor para que el primer HTML ya lleve el tema correcto
 * (antes salía con el tema por defecto y saltaba al personal cuando llegaba la sesión).
 * Nunca lanza: ante cualquier fallo devuelve el tema de Noxy y la pantalla carga igual.
 */
export async function loadThemeBoot(): Promise<{ boot: ThemeBoot; session: Session | null }> {
  let session: Session | null = null;
  try {
    session = (await auth()) as Session | null;
    const userId = session?.user?.id;
    if (!userId) return { boot: EMPTY_THEME_BOOT, session };

    const orgId = (session as { currentOrganizationId?: string | null } | null)?.currentOrganizationId ?? null;
    const [user, org] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { crmTheme: true } }).catch(() => null),
      orgId ? loadOrg(orgId) : Promise.resolve(null),
    ]);
    const { themeId, lockedByOrg } = resolveActiveThemeId(org?.themeId, user?.crmTheme);
    return {
      boot: { themeId, lockedByOrg, org: org ? { id: org.id, name: org.name, brandColor: org.brandColor, brandIcon: org.brandIcon } : null },
      session,
    };
  } catch (error) {
    console.error("[theme-boot]", error);
    return { boot: EMPTY_THEME_BOOT, session };
  }
}
