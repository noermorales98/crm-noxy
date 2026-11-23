// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { decryptSecret, encryptSecret, isEncryptedSecret } from "./secret-box.ts";

// Bóveda de clientes: la contraseña se guarda siempre cifrada; las notas, solo en las entradas de tipo «credential»
// (en una nota suelta o una red social son texto normal que se busca y se lee a simple vista).

export const VAULT_CIPHER_TYPE = "credential";

export type VaultSecrets = { type?: string | null; password?: string | null; notes?: string | null };

/** Si las notas de este tipo de entrada van cifradas. */
export function notesAreEncrypted(type: string | null | undefined): boolean {
  return (type || VAULT_CIPHER_TYPE) === VAULT_CIPHER_TYPE;
}

/** Cifra un valor si hay algo que cifrar; un valor ya cifrado no se vuelve a cifrar (idempotente). */
export function sealValue(plain: string | null | undefined, key: string): string | null {
  if (plain === null || plain === undefined || plain === "") return null;
  return isEncryptedSecret(plain) ? plain : encryptSecret(plain, key);
}

/**
 * Valor listo para mostrar. Un texto sin prefijo (fila antigua sin migrar) se devuelve tal cual;
 * una caja que no se puede abrir (clave rotada, dato dañado) devuelve `null`, nunca el texto cifrado.
 */
export function openValue(stored: string | null | undefined, key: string): { value: string | null; unreadable: boolean } {
  if (stored === null || stored === undefined || stored === "") return { value: null, unreadable: false };
  if (!isEncryptedSecret(stored)) return { value: stored, unreadable: false };
  const plain = decryptSecret(stored, key);
  return plain === null ? { value: null, unreadable: true } : { value: plain, unreadable: false };
}

/** Campos a escribir en la base: contraseña cifrada y, si el tipo es credencial, notas cifradas. */
export function sealVaultData<T extends VaultSecrets>(data: T, key: string): T {
  const out = { ...data };
  if ("password" in out) out.password = sealValue(out.password, key);
  if ("notes" in out) out.notes = notesAreEncrypted(out.type) ? sealValue(out.notes, key) : (out.notes ?? null);
  return out;
}

/** Entrada tal como la devuelve la API: texto legible o `null` con `unreadable: true`, jamás una caja cruda. */
export function openVaultEntry<T extends VaultSecrets>(entry: T, key: string): T & { unreadable: boolean } {
  const password = openValue(entry.password, key);
  const notes = openValue(entry.notes, key);
  return { ...entry, password: password.value, notes: notes.value, unreadable: password.unreadable || notes.unreadable };
}
