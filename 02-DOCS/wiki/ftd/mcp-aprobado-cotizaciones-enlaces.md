---
author: Noeli
branch: main
status: done
---
# MCP: «aprobado», editar cotizaciones, enlaces y correos (T6)

## Intent
Poder poner el estado «aprobado» en el calendario de contenido, editar cotizaciones y agregar el correo del cliente desde el MCP, y recibir el enlace de lo creado.

## Checklist
- [x] Estado «aprobado» entre «editado» y «subido» (etiqueta, color, filtros, enum del MCP; cuenta como «lista para subir»; no fija `uploadedAt`) — Evidence: `content-publish.test.ts` (4 pruebas). `publishStatus` es texto, sin cambio de base.
- [x] `update_quote` (BORRADOR o ENVIADA; recalcula totales; evento EDITADA con actor «mcp»; en ENVIADA exige `approvalToken`) — Evidence: `quote-input.test.ts` (4). El flujo contra la base no se ejecutó.
- [x] Enlaces: `publicUrls` en `src/lib/url.ts`; `publicUrl` + `crmUrl` en `create_quote_for_deal`, `get_quote`, `list_quotes`/`update_quote`; `crmUrl` en `create_deal`, `get_deal`, `create_content_item`, `get_content_item` (lleva a la página del cliente de contenido) — Evidence: `url.test.ts`. Si falta NEXT_PUBLIC_BASE_URL en producción, los enlaces salen `null` en vez de romper la herramienta.
- [x] Correo: `update_contact` ya aceptaba `email` validado; `update_quote` acepta `clientEmail` (null para quitarlo).
- [ ] Probar `update_quote` desde Claude con una cotización real.

## Decisiones
- Editar una cotización ENVIADA exige aprobación humana porque el cliente ya la vio; en BORRADOR no.
- El token público de la cotización no sale suelto: solo dentro de `publicUrl`.

## Evidence
`npm test`: 514 pasan, 5 fallan (los mismos de diseño/favicon, previos). `tsc` limpio en app/ y src/.
