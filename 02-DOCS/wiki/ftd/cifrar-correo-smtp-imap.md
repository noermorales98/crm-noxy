---
author: Noeli
branch: main
status: in-progress
---
# Cifrar contraseñas SMTP/IMAP de las empresas

## Intent
`Company.smtpPass` e `imapPass` estaban en texto plano. Se cifran como la Bóveda (AES-256-GCM, clave = `AUTH_SECRET`).

## Scope
`src/lib/mail-secret.ts` (`sealMailSecret` / `openMailSecret`; tolera texto plano antiguo), rutas `companies/[id]/smtp` e `imap` (cifran al guardar), `smtp/test`, y todos los lectores: `emails/send`, `cron/send-scheduled`, `cron/fetch-emails`, `cron/appointment-reminders`, `process-campaign-emails`, `quotes.ts`, `public/forms/[id]/submit`, `public/book/[token]/submit`, `public/appointment-types/[id]/book`. Script `scripts/encrypt-mail-secrets.mjs` (simulacro por defecto, `--apply` con respaldo).

## Checklist
- [x] Módulo + 5 pruebas (ida y vuelta, idempotente, texto plano antiguo, clave errónea → null) — Evidence: `mail-secret.test.ts`.
- [x] Todos los sitios que usaban la contraseña pasan por `openMailSecret`; los que guardan, por `sealMailSecret`; la API nunca devuelve la contraseña — Evidence: `tsc` limpio; búsqueda sin usos sueltos.
- [x] Simulacro en la base real — Evidence: 2 empresas con texto plano (Noxy Digital, Eilen Centro Terapéutico), 0 cifradas.
- [ ] Desplegar el código, y **solo entonces** correr `--apply`.
- [ ] Probar «Probar conexión SMTP» y un envío real tras migrar.

## Riesgo
Si se migra antes de desplegar, el código viejo usaría el texto cifrado como contraseña y fallaría el envío/recepción hasta desplegar. Si se rota `AUTH_SECRET`, hay que volver a capturar estas contraseñas.
