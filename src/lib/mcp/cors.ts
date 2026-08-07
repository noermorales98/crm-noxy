// CORS permisivo para los endpoints OAuth y de metadata: son públicos por
// diseño (los clientes MCP los llaman desde cualquier origen) y no llevan
// credenciales de sesión.
export const OAUTH_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

export function corsOptions() {
  return new Response(null, { status: 204, headers: OAUTH_CORS });
}
