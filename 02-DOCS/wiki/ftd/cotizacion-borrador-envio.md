---
author: Noeli
branch: main
status: in-progress
---
# Borrador de correo al enviar una cotización

## Intent
Hoy «Enviar al cliente» manda el correo al instante. Antes de enviar, el usuario ve el borrador, edita asunto y mensaje, ve la vista previa y adjunta archivos.

## Scope
- Dentro: diálogo de borrador (asunto, mensaje editable, vista previa en vivo, adjuntos); `GET /api/quotes/[id]/send` devuelve el borrador; `POST` acepta asunto, mensaje y archivos (multipart); el HTML del correo se genera en `src/lib/quote-email.ts`.
- Fuera: guardar borradores en BD, plantillas, adjuntos persistentes (se mandan por correo y no se guardan).
- Límites: 5 archivos, 10 MB cada uno, 20 MB en total.

## Checklist
- [x] `quote-email.ts` genera el HTML y escapa el texto — prueba: test unitario.
- [x] Ruta `send`: GET borrador, POST con asunto/mensaje/adjuntos y validación de límites — prueba: tsc + test.
- [x] `sendQuoteEmail` acepta adjuntos — prueba: tsc.
- [x] Diálogo `QuoteSendDialog` y conexión en la página de la cotización — prueba: tsc + lint.
- [ ] Verificación en el navegador — prueba: abrir diálogo, editar, previsualizar, enviar.

## Evidence
- `node --test src/lib/quote-email.test.ts`: 3 pass, 0 fail.
- `tsc --noEmit`: sin errores en los archivos tocados (los que quedan son de `.test.ts` previos). `npm run build`: OK.
- eslint: solo `no-explicit-any` ya existentes en el patrón `session as any` y en la página.
- `rsc risk`: tier 2, pero por `.claude/rsc-bootstrap.mjs` (cambio previo, no de esta función); los archivos de esta función son clase `default`. Reviewer no ejecutado.
- NO ejecutado: prueba en navegador (diálogo, vista previa, envío real con adjunto).

## Next
Probar en el navegador el envío con adjunto y cerrar.
