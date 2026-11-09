import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// Cifrado de credenciales guardadas en la base (AES-256-GCM). Formato: «v1:<nonce>:<etiqueta>:<datos>» en base64url.
// La clave sale de AUTH_SECRET: si se rota, las credenciales guardadas dejan de poder leerse y hay que volver a capturarlas.

const PREFIX = "v1";
const SALT = "noxy.secret-box.v1";

function deriveKey(secret: string): Buffer {
  if (!secret) throw new Error("Falta la clave de cifrado (AUTH_SECRET).");
  return scryptSync(secret, SALT, 32);
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(`${PREFIX}:`) && value.split(":").length === 4;
}

export function encryptSecret(plain: string, secret: string): string {
  const key = deriveKey(secret);
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, nonce.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(":");
}

/** Texto original, o `null` si la caja está dañada o la clave no corresponde. */
export function decryptSecret(box: string, secret: string): string | null {
  if (!isEncryptedSecret(box)) return null;
  try {
    const [, nonce, tag, data] = box.split(":");
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), Buffer.from(nonce, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Clave de la aplicación (AUTH_SECRET); lanza si no está configurada. */
export function appSecretKey(): string {
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) throw new Error("AUTH_SECRET no está configurado.");
  return secret;
}
