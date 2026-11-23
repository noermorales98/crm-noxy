---
author: Noeli
branch: main
status: done
---
# Archivados fuera de las consultas (T3)

## Intent
Que un deal archivado no aparezca en búsqueda, dashboard, asistente IA, métricas ni MCP.

## Scope
`src/lib/deal-filters.ts` (`ACTIVE_DEALS`, `dealArchiveFilter`, `wantsArchived`) aplicado en: búsqueda global, `kb/search-entities`, `ai-context`, `dashboardData` (pipelineValue, dealStats, followUps, recientes, por etapa), `sales/metrics` y `mcp/sales-metrics`, `/api/pipelines` (tablero), MCP `search_crm` (nuevo `includeArchived`), `get_contact`, `get_company`, protocolo MCP.

## Checklist
- [x] Helper único + 3 pruebas — Evidence: `npm test` 470 pasan, 7 fallos previos sin relación.
- [x] Consultas de lectura filtradas — Evidence: `tsc` sin errores en app/ y src/ (excluyendo tests).
- [x] `?includeArchived=1` en búsqueda global y `includeArchived` en `search_crm`.
- [ ] Probar en navegador la búsqueda y el tablero.

## Dejadas a propósito (siguen viendo archivados)
- `/api/deals/archived` y `/pipeline/historial`: son el historial.
- `month-close-service` (conteos de creados/perdidos del mes): la foto mensual cuenta lo histórico.
- `notion-sync`: sincroniza todo, incluido lo archivado.
- Búsquedas por id (`deals/[id]`, `get_deal`, pagos, citas, cotizaciones): quien tiene el enlace debe poder abrirlo.
- Perfil de cliente (`pipeline/clientes/[id]`) y detalle de contacto: muestran historial con la etiqueta «archivado».
- `list_deals` del MCP ya tenía `includeArchived`.

## Next
T5 (sidebar), T6 (MCP), T7 (cifrar Bóveda).
