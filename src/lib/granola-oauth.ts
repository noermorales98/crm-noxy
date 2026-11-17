import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Qué hacer con la vuelta de Granola al CRM:
 * - `invalid`: no trae un `state` que coincida con el que guardamos (o no guardamos ninguno). No se toca nada,
 *   para que una petición ajena no pueda cancelar una conexión en curso.
 * - `denied`: el `state` es correcto pero Granola devolvió un error o no trajo código (cancelada): se limpia lo pendiente.
 * - `ok`: `state` correcto y con código: se puede intercambiar por tokens.
 */
export function checkMcpCallback(input: {
  storedState: string | null | undefined;
  state: string | null;
  code: string | null;
  error: string | null;
}): "ok" | "invalid" | "denied" {
  if (!input.storedState || !input.state || !safeEqual(input.storedState, input.state)) return "invalid";
  if (input.error || !input.code) return "denied";
  return "ok";
}
