---
author: Noeli
branch: mcp-notion-hub
status: done
merged: 2026-11-09
merged_by: Noeli
---
# Hub MCP del CRM

## Intent

El CRM ya es el servidor MCP. Esta pasada le añade recursos, prompts, tools de Notion bajo demanda y una confirmación humana antes de las escrituras críticas.

## Scope

Dentro: token HMAC de un uso, página `/mcp/approve`, tools de Notion, `Deal.notionPageId`, resources `crm://deals` y `crm://contacts`, dos prompts, y el nombre del cliente OAuth en el contexto de la petición.

Fuera: webhooks, Redis, SSE legado, WebSockets, API OpenAPI y function calling de xAI.

## Checklist

- [x] Token de aprobación: un token alterado, caducado o repetido no pasa (`node --test src/lib/mcp/approval.test.ts`).
- [x] Mapeo a Notion: el deal sale con las propiedades fijas (`node --test src/lib/mcp/notion-map.test.ts`).
- [ ] `update_deal` pide confirmación solo si la etapa nueva es ganada o perdida. El código está en el handler. No se ejecutó contra un deal real.
- [x] La columna `notionPageId` queda en el esquema y en la tabla `Deal`.
- [ ] Resources, prompts y el nombre del cliente quedan registrados en `/mcp`. Están en el handler. No se invocó un cliente MCP.

## Evidence

`node --test src/lib/mcp/approval.test.ts src/lib/mcp/notion-map.test.ts` — 3 tests, 0 fallos (2026-11-07).

`prisma db execute`: `ALTER TABLE Deal ADD COLUMN notionPageId VARCHAR(191) NULL` — Script executed successfully. No se hizo `db push` del esquema entero: el diff también cambiaba el default de `DigestSchedule.aiModelId`.

`npx eslint` sobre los archivos tocados — sin avisos. `tsc` no reportó errores en esos archivos.

## Revisión (2026-11-09)

- Hallazgo corregido: `/mcp/approve` era público (el middleware excluye `/mcp`), así que quien tuviera el enlace —incluida la IA— podía obtener el `approvalToken`. Ahora la página y la acción exigen sesión del CRM (`src/lib/mcp/approve-auth.test.ts`).
- Límite conocido: el control de un solo uso del token vive en memoria de cada instancia; en otra instancia el token vale hasta caducar (10 min).

## Next
Fusionado en main el 2026-11-09 (5d887ed).
- 2026-11-09: credenciales de Notion (token cifrado + base de leads) se guardan en la BD (modelo NotionConfig, Ajustes › Integraciones); notion.ts las lee con respaldo a NOTION_TOKEN/NOTION_LEADS_DATABASE_ID.
