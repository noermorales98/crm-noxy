---
author: Noeli
branch: main
status: in-progress
---
# Isotipo de Noxy como logo de cotizaciones, con color editable

## Intent
En Configuración de cotizaciones el logo era solo una URL. Ahora se puede elegir entre logo personalizado (URL, como antes) o el isotipo de Noxy, con color editable (solo el isotipo por defecto, no los logos propios).

## Scope
- Dentro: selector de tipo de logo, selector de color con hex y «Restablecer color»; el isotipo se ve en la vista pública y en el PDF.
- Decisión: `logoUrl` es VARCHAR(191) en MySQL, así que se guarda un marcador `noxy-isotipo:#RRGGBB` (sin migración) y se resuelve a imagen donde se usa.
- Fuera: color en el logo personalizado, logo en el correo.

## Checklist
- [x] `noxy-isotipo.ts`: marcador, lectura, validación de color — prueba: 4 tests.
- [x] Configuración: selector + color + vista previa — prueba: tsc + build.
- [x] Vista pública (vía `resolveQuoteSender`) y PDF (SVG rasterizado a PNG) — prueba: tsc + build.
- [ ] Verificación en navegador y PDF real.

## Evidence
- `node --test` quote-email + noxy-isotipo: 7 pass, 0 fail. `npm run build`: compilado. tsc sin errores nuevos.
- NO ejecutado: prueba visual en navegador / descarga del PDF con el isotipo.

## Next
Probar visualmente la configuración, la vista pública y el PDF.
