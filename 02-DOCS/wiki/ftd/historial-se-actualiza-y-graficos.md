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
- [x] Moneda (MXN/USD) escrita en la tabla y tooltips al pasar el cursor en los gráficos — Evidence: navegador: `$13,000 MXN` / `$350 USD`; tooltip «18 de noviembre 2026 | $13,000 | 1 venta» y «Ganados | 2 ventas | 100% de los cierres»; pruebas 6/6.
- [x] Recarga al volver a la pestaña sin parpadeo (esqueleto solo al cambiar filtros).
- [ ] Probar el «Cierre de <mes>» de un mes ya cerrado tras editar la moneda.

- [x] Cierre del período sigue al filtro: mes → cierre de ese mes; «Todo el año» → `?year=` suma de los meses (`sumMonthMetrics`, `loadYearMetrics`) — Evidence: navegador: NOV / AÑO / AGO distintos; prueba `sumMonthMetrics` en `month-close.test.ts`.
- [x] Perdidos por fecha de pérdida: columna nueva `Deal.lostAt` (`prisma/add_deal_lost_at.sql`, aplicada con `prisma db execute`); los perdidos anteriores quedan en NULL y no cuentan en ningún mes — Evidence: «Curso para Yola's» (perdido en abril) dejó de contar en noviembre.
- [x] Motivo obligatorio al perder (`LostReasonDialog` en detalle del deal y al arrastrar en el tablero; API 400 sin motivo): guarda `lostReason`, `lostAt` y una NOTA en la bitácora — Evidence: deal de prueba (borrado después): API sin motivo → 400; UI → diálogo, botón deshabilitado vacío, guardó motivo + lostAt + nota.
- [ ] Probar en navegador el arrastre al tablero hacia «Perdido» (solo probé el botón de etapa del detalle).

- [x] Cotizaciones ↔ historial: una sola fecha por venta (la del deal). Al vincular una cotización a un deal ganado sin `wonAt`, toma la fecha de la cotización (`quoteSaleDate`); si ya tiene, se respeta — Evidence: deal de prueba sin `wonAt` + cotización pagada → `wonAt` = `paidAt` exacto (datos de prueba borrados).
- [x] «Cobros recibidos» suma los pagos de cotizaciones (pago único, anticipo y resto, por su fecha) — `src/lib/quote-sales.ts` (5 pruebas). Meses cerrados recalculados una vez: ago-2026 $854.50 USD, oct-2026 $6,500 MXN.
- [x] Aviso «cotizaciones pagadas sin deal» en el historial (COT-0009 y COT-0010) y las cotizaciones de cada deal bajo su nombre (una fila por deal, nunca una por cotización).
- [x] Montos del cierre con su moneda escrita («$854.50 USD · $6,500 MXN»).
- [ ] Vincular COT-2026-0010 al deal «Libro de Leticia Arroyave» (valor $46.84 USD, fecha 6-ago-2026): el deal ya no existía al intentarlo (borrado desde fuera). Pendiente de decidir con Noeli.
- [x] Conectar cotización ↔ deal sin fricción: botón «Conectar con un deal» en la cotización (`QuoteDealDialog`): crear deal nuevo (título, pipeline+etapa; valor, moneda y contacto salen de la cotización; etapa ganada propuesta si ya está aceptada/pagada) o vincular uno existente (`/api/deals/search`, incluye archivados). `POST /api/quotes/[id]/deal`. No crea proyecto ni tareas base al nacer ganado.
- [x] Fechas distintas → se pregunta (`saleDateChoices`, `SaleDateChoice`): 409 con opciones y se repite con `saleDate`; también al vincular desde el deal (`DealQuotesPanel`). Sin conflicto no pregunta — Evidence: navegador: cotización pagada con aceptada 10-nov y pagada 20-nov → pregunta; elegida 20-nov → `wonAt` 20-nov; revincular ganado con 20-nov → 409 con 2 opciones, fecha inventada → 400, elegida 10-nov → `wonAt` 10-nov. Datos de prueba borrados.

- [x] Ventas ganadas «a mitad de proceso» especificadas en el cierre: tarjeta «N aún en proceso» + lista con título, monto y motivo («En etapa «Anticipo pagado»» o «Falta cobrar el saldo»). Se calcula en vivo (`loadInProgressSales`, `inProgressReason`), no entra en la foto del mes. El título del cierre sale de los datos mostrados — Evidence: navegador: ago 2 en proceso (Leticia ×2), nov 1 (Hugo, saldo), año 3; prueba `inProgressReason`.

## Evidence
Causa: el PATCH sí guardaba la moneda; el «Cierre del mes» sale de una foto congelada y el fetch del historial no se repetía al volver.

## Next
Pruebas: 638 pasan, 4 fallan igual que antes de estos cambios (incl. `details`: `text-[11px]` previo en DealDetailClient). Quedó corregido mi `text-[10px]` → `text-xs` (regla de 12 px).
Reiniciar `next dev` tras `prisma generate` (el servidor viejo no conoce `lostAt`).
Verificar en navegador (los deals ya mal guardados se corrigen al editarlos de nuevo o al abrir el historial).
