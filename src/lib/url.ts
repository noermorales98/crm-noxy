/**
 * Resuelve la URL pública base de la app.
 *
 * Orden de prioridad:
 * 1. NEXT_PUBLIC_BASE_URL (configuración explícita, p. ej. https://crm-noxy.vercel.app)
 * 2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL (las provee Vercel automáticamente)
 * 3. http://localhost:3000 solo en desarrollo local
 *
 * En producción sin configuración lanza un error claro en lugar de generar
 * silenciosamente enlaces a localhost (que rompen el redirect post-pago de Stripe).
 */
export function getPublicBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";

  throw new Error(
    "URL pública no configurada: define NEXT_PUBLIC_BASE_URL con el dominio de producción " +
      "(p. ej. https://crm-noxy.vercel.app) en las variables de entorno."
  );
}

/**
 * Enlaces que devuelve el MCP: `publicUrl` es lo que ve el cliente y `crmUrl` abre el registro en el CRM.
 * `base` se puede pasar a mano (pruebas); por defecto sale del entorno.
 */
export function publicUrls(base: string = getPublicBaseUrl()) {
  const root = base.replace(/\/+$/, "");
  return {
    quotePublic: (publicToken: string) => `${root}/cotizar/${publicToken}`,
    quoteCrm: (folio: string) => `${root}/cotizaciones/${encodeURIComponent(folio)}`,
    dealCrm: (id: string) => `${root}/pipeline/${id}`,
    contentClientCrm: (clientId: string) => `${root}/contenido/${clientId}`,
    formPublic: (formId: string) => `${root}/form/${formId}`,
    projectCrm: (id: string) => `${root}/projects/${id}`,
    kbPageCrm: (id: string) => `${root}/kb/${id}`,
  };
}

/** Igual que `publicUrls`, pero devuelve `null` si la URL base no está configurada en vez de lanzar (para no romper una herramienta). */
export function tryPublicUrls(): ReturnType<typeof publicUrls> | null {
  try {
    return publicUrls();
  } catch {
    return null;
  }
}
