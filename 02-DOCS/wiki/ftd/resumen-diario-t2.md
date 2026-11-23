---
author: Noeli
branch: main
status: in-progress
---
# Resumen diario confiable (T2)

## Intent
Que el resumen de WhatsApp llegue aunque la IA falle, avise cuando falla y muestre cuándo toca el próximo.

## Scope
`src/lib/digest-schedule.ts` (lógica pura), `src/lib/digest.ts`, `app/api/cron/digest/route.ts`, `app/api/settings/digest/*`, `app/settings/digest/page.tsx`, `scripts/digest-diagnostico.cjs`, enum `DIGEST_ERROR`.

## Checklist
- [x] Diagnóstico de solo lectura — Evidence: 1 DigestSchedule activo, WhatsApp configurado, último envío 2026-11-13.
- [x] Respaldo sin IA si el modelo falla — Evidence: `fallbackDigestMessage` + test (5 pruebas en `digest-schedule.test.ts`).
- [x] Errores del cron no se tragan: JSON con `errors`/`fallbacks` y aviso en campanita (1 cada 6 h) — Evidence: tipos compilan; no probado contra la base.
- [x] Configuración muestra estado y próximo envío; «Enviar prueba» ya existía — Evidence: `nextDigestRun` probado; UI sin probar en navegador.
- [ ] Aplicar `prisma/sql/digest-error.up.sql` a la base (el aviso en campanita falla en silencio hasta entonces; el resto funciona).

## Next
Aplicar el SQL con aprobación de Noeli; probar `/settings/digest` en navegador.
