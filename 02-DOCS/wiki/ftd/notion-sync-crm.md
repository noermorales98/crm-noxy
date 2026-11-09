---
author: Noeli
branch: main
status: in-progress
---

# Sincronización CRM → Notion (deals y documentos del /kb)

## Intent
Usar la conexión de Notion guardada en Ajustes › Integraciones desde el propio CRM: enviar deals y documentos del `/kb` a Notion a mano, en bloque o automáticamente.

## Scope
- Dos bases: leads (deals) y documentos (`/kb`), configurables en Ajustes. Sentido único CRM → Notion.
- Manual: botón «Enviar a Notion» en cada deal y en cada documento. En bloque: «Sincronizar todo» por base, en lotes de 10.
- Automático: interruptor por base. Deals al crear/editar; documentos al guardar, con límite de 1 por minuto y cron de respaldo `/api/cron/notion-sync`.
- Fuera de alcance: Notion → CRM, carpetas del `/kb`, tablas e imágenes del Markdown.

## Checklist
- [x] Columnas nuevas (`NotionConfig.docsDatabaseId/autoSync*`, `KbPage.notionPageId`) — SQL aplicado
- [ ] `KbPage.notionSyncedAt` — `prisma/add_notion_sync.sql` (última línea) **pendiente de aplicar en la BD**
- [x] Markdown → bloques de Notion (`src/lib/notion-blocks.ts`, 3 pruebas)
- [x] Servicio `src/lib/notion-sync.ts` + `/api/notion/sync`
- [x] UI en Ajustes, deal y documento
- [ ] Probado contra Notion real

## Evidence
- Pruebas y tipos: ver la sesión (node --test, tsc, build).

## Next
Aplicar la columna pendiente, desplegar, crear la base de documentos en Notion (propiedades `Name` y `CRM Doc ID`) y programar el cron.
