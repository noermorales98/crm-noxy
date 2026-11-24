---
author: Noeli
branch: main
status: in-progress
---
# Historial de ventas: se actualiza al editar un deal + gráficos

## Intent
Corregí un deal ganado (USD → MXN) y `/pipeline/historial` seguía mostrando lo anterior. Debe reflejar el cambio, y tener gráficos.

## Scope
- `src/lib/month-close-service.ts`: `refreshSnapshotForDeal` recalcula la foto mensual (`MonthlySnapshot`) del mes del deal si ya existía; conserva `openAtClose`.
- `app/api/deals/route.ts` (PATCH): lo llama tras editar valor/moneda de un deal ganado.
- `app/pipeline/historial/page.tsx`: fetch con `cache: "no-store"` y recarga al volver a la pestaña/pantalla (`visibilitychange`, `pageshow`).
- `src/lib/history-charts.ts` + `src/components/pipeline/HistoryCharts.tsx`: gráficos de ganado MXN, ganado USD (por mes o por día) y ganados vs. perdidos.

## Checklist
- [x] Cálculo de gráficos con pruebas — Evidence: `node --test src/lib/history-charts.test.ts` 4/4.
- [x] Tipos y lint de lo tocado — Evidence: `tsc` sin errores en esos archivos; `eslint` limpio.
- [x] Probar en navegador: editar la moneda de un ganado archivado y volver al historial — Evidence: PATCH `{value:13000,currency:"MXN"}` → 200; historial: USD $350 (1) y MXN $13,000 (1); gráficos visibles.
- [ ] Probar el «Cierre de <mes>» de un mes ya cerrado tras editar la moneda.

## Evidence
Causa: el PATCH sí guardaba la moneda; el «Cierre del mes» sale de una foto congelada y el fetch del historial no se repetía al volver.

## Next
Verificar en navegador (los deals ya mal guardados se corrigen al editarlos de nuevo o al abrir el historial).
