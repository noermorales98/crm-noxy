---
type: ftd
title: Widgets del inicio — vista previa, detalle por clic y widgets nuevos
description: El selector de widgets previsualiza con datos reales, las filas abren su detalle y hay 10 widgets nuevos del cierre del mes, perdidos y cotizaciones.
tags: [ftd, dashboard, widgets]
timestamp: 2026-11-24T00:00:00Z
topic: ftd
---

# Widgets del inicio

## Intención
Que al agregar widgets se vean antes, que los eventos y filas abran más detalle, y que los widgets usen lo nuevo del historial (cierre del mes, motivo de pérdida, cotizaciones, ventas a mitad de proceso).

## Hecho (con evidencia)
- [x] **Vista previa**: tocar un widget en «Agregar al dashboard» lo muestra con datos reales; el «+» agrega directo. Datos pedidos a `GET /api/dashboard-data?keys=…` (sesión + permiso `crm`, solo claves de `DATA_FETCHERS`, máx. 12). Verificado en navegador: «Cierre del mes» se previsualizó y se agregó con datos sin recargar.
- [x] **Bug corregido**: un widget agregado desde el selector salía vacío hasta recargar (sus datos no se habían pedido). Ahora `DashboardCustomizer` guarda los datos pedidos.
- [x] **Búsqueda** en el selector.
- [x] **Detalle por clic** (`DetailDialog.tsx`): citas, eventos de Google Calendar (con descripción y enlace), piezas de contenido, tareas, leads, campañas, proyectos, pagos, follow-ups, actividad, pagos de clientes, cotizaciones y deals perdidos. Verificado: clic en «Reunión Miércoles» abre cuándo/descripción/enlaces; Escape cierra.
- [x] **Widgets nuevos (10)**: ventas ganadas del mes, perdidos del mes, cierre del mes, ventas a mitad de proceso, perdidos y su motivo, cotizaciones pagadas sin deal (KPI y lista), saldos por cobrar, cotizaciones abiertas (lista).
- [x] **Widgets mejorados**: tasa de cierre y cobros del mes salen del cierre real (incluye cobros de cotizaciones); pipeline activo separa MXN y USD (antes los sumaba: $35,500 MXN + $950 USD).
- [x] Pruebas: 653 pasan; `tsc` sin errores fuera de pruebas.

## Siguiente
- [x] «Cierre del mes» agregado a `DEFAULT_WIDGETS` (solo afecta a quien aún no personalizó su inicio).
