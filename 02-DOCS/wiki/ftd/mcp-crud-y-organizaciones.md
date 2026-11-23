---
author: Noeli
branch: main
status: done
---
# MCP: CRUD completo e integración de sub-cuentas

## Hallazgo
Revisión de las 58 herramientas que había: (1) el MCP estaba atado a **una sola organización** (`MCP_ORGANIZATION_ID`), así que no veía ni tocaba Dreams, Eilen, J&H ni las sub-cuentas nuevas, ni los contactos y formularios que se movieron; (2) varias entidades no se podían borrar ni crear: contactos, empresas, deals, tareas, cotizaciones, pipelines/etapas (categorías), formularios, proyectos, clientes recurrentes, citas, Docs, clientes de contenido y notificaciones.

## Qué hay ahora (98 herramientas)
- **Organizaciones (nuevo):** `list_organizations` (con enlace de conector por cliente), `get_organization`, `create_organization` (sub-cuenta con sus pipelines y plantillas), `update_organization` (nombre, zona, auto-archivo, color, icono, tema), `get_agency_overview` (panel de agencia). No existe borrar una organización a propósito: arrastraría todos sus datos.
- **Una conexión = una organización.** La base es `MCP_ORGANIZATION_ID`; para trabajar en una sub-cuenta se usa el conector `https://noxthy.co/mcp?org=<id>` (lo devuelve `list_organizations`). Solo vale para las organizaciones donde el dueño de la base también es OWNER; otra da 403. El token OAuth sigue ligado a la base.
- **Borrar (con `approvalToken`, como `delete_content_item`):** `delete_contact`, `delete_company`, `delete_deal`, `delete_task`, `delete_quote`, `delete_pipeline`, `delete_stage`, `delete_form`, `delete_project`, `delete_client`, `delete_appointment`, `delete_kb_page`, `delete_content_client`. Se niegan cuando dejarían huérfanos (contacto o empresa con deals/cotizaciones, pipeline o etapa con deals, cotización PAGADA, único pipeline).
- **Crear/editar nuevos:** `create_/update_pipeline` (categorías del `/pipeline`), `create_/update_stage`, `get_/create_/update_form` (con enlace público), `create_/update_project`, `create_/update_client` (suscripciones), `get_/create_/update_appointment` (sin enviar avisos; detecta choques), `create_/update_kb_page`, `create_/update_content_client`, `get_task`, `archive_deal`, `mark_notification_read`, `delete_notification`.
- **Ya estaban y siguen:** `update_quote`, estado «aprobado», `set_content_reminders`, `get_sales_metrics` con `month`, `includeArchived` en búsquedas, enlaces `publicUrl`/`crmUrl`.

## Verificación
- `McpServer` real con todo registrado: 98 herramientas, sin nombres repetidos, esquemas válidos.
- `npm test`: `tool-coverage.test.ts` (cada entidad con crear/ver/editar/borrar; todo borrado con aprobación; sin borrar organizaciones) y `org-scope.test.ts`. `tsc` limpio.
- **No ejecutado:** ninguna herramienta contra la base real ni desde Claude (las de borrado y creación escriben en producción); el flujo `?org=` y el 403 con una organización ajena.

## Fuera de alcance (a propósito)
Enviar correos o WhatsApp, borrar organizaciones, gestionar miembros del equipo, y crear/editar tipos de cita y campañas (solo lectura).

## Para usar una sub-cuenta
En Claude: añade otro conector con la URL `…/mcp?org=<id de la sub-cuenta>` (misma autenticación), o pide `list_organizations` en el conector base y copia el `connectorUrl`.
