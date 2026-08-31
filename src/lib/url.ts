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
