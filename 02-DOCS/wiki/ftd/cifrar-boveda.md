---
author: Noeli
branch: cifrar-boveda
status: done
---
# Cifrar la Bóveda (T7)

## Intent
`ClientVaultEntry.password` (y `notes` en las de tipo credencial) se guardaban en texto plano aunque la landing dice «Bóveda cifrada».

## Scope
`src/lib/vault-crypto.ts` (sobre `secret-box`, AES-256-GCM), `app/api/clients/[id]/vault/route.ts` (GET/POST/PATCH), `scripts/encrypt-vault.mjs` (migración), `.gitignore` (`/backups/`).

## Checklist
- [x] Cifrar al guardar y descifrar al leer — Evidence: 11 pruebas pasan (`vault-crypto.test.ts` + `secret-box.test.ts`): ida y vuelta, idempotencia, cambio de tipo, y la API nunca devuelve una caja cruda (clave rota → `null` + `unreadable`).
- [x] Otros lectores: la página `/boveda`, `VaultPanel` y `ContextContent` leen solo por esta API; no hay otro acceso a `clientVaultEntry`.
- [x] Script `--dry-run` por defecto, `--apply` con respaldo `0600` y comprobación cifrar→descifrar por fila — Evidence: simulacro contra la base real: 0 filas (nada que migrar).
- [x] Revisión SMTP/IMAP (solo informe, sin cambiar): `Company.smtpPass` e `imapPass` se guardan y usan **en texto plano** (`app/api/emails/send`, `quotes/[id]/send`, `public/forms/[id]/submit`, `public/appointment-types/[id]/book`, ajustes en `app/emails/page.tsx`). Tarea aparte propuesta: mismo tratamiento con `secret-box` + script de migración.
- [ ] Probar en navegador crear/editar una credencial en `/boveda`.

## Caveats
- La clave sale de `AUTH_SECRET`: si se rota, las credenciales dejan de abrirse.
- La landing dice «Credenciales cifradas»; para correo (SMTP/IMAP) todavía no es cierto.
