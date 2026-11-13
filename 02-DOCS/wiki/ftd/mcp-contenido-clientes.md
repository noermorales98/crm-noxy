---
author: Noeli
branch: main
status: in-progress
---

# MCP: contenido (clientes y calendario), clientes y leads

## Intent
Que Claude, por el MCP del CRM, vea los clientes de gestión de contenido, lea y edite el calendario de contenido (CRUD) y acceda a clientes de facturación y a leads.

## Scope
- Nuevas (src/lib/mcp/content-tools.ts): `list_content_clients`, `get_content_client`, `list_content_items`, `get_content_item`, `create_content_item`, `update_content_item`, `delete_content_item`.
- `delete_content_item` exige aprobación humana (`/mcp/approve`); crear y editar son directos, como el resto del CRM.
- Ampliadas (tools.ts): `get_client` (sin bóveda), `search` en `list_clients`, `search`/`includeArchived` en `list_deals`.
- Sin exponer `publicToken` ni claves de WhatsApp de los clientes de contenido.
- Fuera de alcance: crear/editar/borrar clientes de contenido, recordatorios por WhatsApp desde el MCP.

## Checklist
- [x] Reglas de entrada del calendario (`content-input.ts`, 4 pruebas)
- [x] 7 tools de contenido registradas en `app/api/[transport]/route.ts`
- [x] `get_client` y búsqueda en clientes y leads
- [x] tsc 20 (igual que antes), build OK, consultas verificadas en solo lectura contra la BD
- [ ] Probado desde Claude tras desplegar

## Next
Subir, desplegar y volver a conectar el conector en Claude para que cargue las herramientas nuevas.
