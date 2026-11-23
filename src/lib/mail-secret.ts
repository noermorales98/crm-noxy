// Contraseñas SMTP/IMAP de las empresas: se guardan cifradas (AES-256-GCM, la clave sale de AUTH_SECRET).
// Lo ya guardado en texto plano se sigue leyendo hasta que corra scripts/encrypt-mail-secrets.mjs.
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { appSecretKey } from "./secret-box.ts";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { openValue, sealValue } from "./vault-crypto.ts";

/** Valor listo para guardar en la base (cifrado; un valor ya cifrado no se vuelve a cifrar). */
export function sealMailSecret(plain: string | null | undefined, key: string = appSecretKey()): string | null {
  return sealValue(plain, key);
}

/**
 * Contraseña lista para usar. Texto plano antiguo → tal cual; caja cifrada → descifrada;
 * caja que no se puede abrir (clave rotada, dato dañado) → `null`, nunca el texto cifrado.
 */
export function openMailSecret(stored: string | null | undefined, key: string = appSecretKey()): string | null {
  return openValue(stored, key).value;
}
