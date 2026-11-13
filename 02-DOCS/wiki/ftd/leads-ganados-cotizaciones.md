---
author: Noeli
branch: main
status: in-progress
---

# Leads ganados, cotizaciones ligadas al lead y rediseño del lead

## Intent
Que los leads ganados cuenten como ventas en resúmenes y MCP, que una cotización pueda crearse desde un lead o vincularse a uno existente, y mejorar la UX/UI del lead (`/pipeline/:id`), los interruptores de formularios y la barra de `/kb/:id`.

## Scope
- Ronda 1 (datos): `Quote.dealId` opcional (un lead, varias cotizaciones). Crear desde el lead abre `/cotizaciones/nueva?dealId=…` con cliente, moneda y un concepto con el valor. Vincular/desvincular con `PATCH /api/quotes/:id`.
- Ventas = leads en etapa ganada; «este mes» por `updatedAt`, igual que Inicio. Resumen (`digest`), `/api/sales/metrics` y `get_sales_metrics` incluyen `wonSales`.
- MCP: `list_quotes` (dealId/unlinked), `link_quote_to_deal`, `create_quote_for_deal`, `get_deal` con cotizaciones, `list_deals` con `status`.
- Ronda 2 (diseño): cabecera del lead en tres bandas, datos sin duplicar, pestañas; `Switch`/`CheckRow` en formularios; barra de `/kb/:id` con una sola escala (32 px) y radios concéntricos.
- Fuera de alcance: conversión entre monedas, fecha real de cierre (no hay `wonAt`), Notion.

## Checklist
- [x] Lógica pura probada (`deal-sales.ts`, 5 pruebas)
- [x] API de cotizaciones con `dealId`, pestaña «Cotizaciones» en el lead, vínculo en la cotización
- [x] Ventas ganadas en resumen, métricas y MCP
- [x] Interruptores de formularios y barra del `/kb`
- [x] Cabecera y pestañas del lead rediseñadas
- [x] tsc 20 (igual), tests 241/245 (4 de siempre), build OK
- [ ] **Columna `Quote.dealId` aplicada en la BD** (`prisma/add_quote_deal.sql`): pendiente de autorización
- [ ] Revisado a ojo en pantalla (el navegador del panel no tiene sesión)

## Next
Aplicar el SQL, desplegar, revisar visualmente lead, formularios y `/kb`, y reconectar el conector de Claude.
