---
author: Noeli
branch: main
status: in-progress
---

# Valor del lead calculado desde cotizaciones

## Intent
Un lead sin valor capturado no debe contar como $0 si ya tiene cotizaciones aceptadas, con pago parcial o pagadas.

## Scope
- `effectiveDealValue` en `src/lib/deal-sales.ts`: el valor manual (> 0) manda; si está vacío o en 0, suma cotizaciones ACEPTADA / PARCIAL / PAGADA en la moneda del lead (sin mezclar monedas).
- Se usa en la ficha del lead (etiqueta «De cotizaciones»), en `summarizeWonSales` y en las ventas recientes (`won-sales.ts`).
- Fuera de alcance: tarjetas y totales del tablero del pipeline, MCP (`list_deals`), barra de cobro.

## Checklist
- [x] Función pura + 6 tests nuevos — prueba: `node --test src/lib/deal-sales.test.ts` (10 pasan).
- [x] Resumen de ventas y recientes usan el valor efectivo — prueba: test de `summarizeWonSales`.
- [x] Ficha del lead muestra el valor calculado y se actualiza al vincular/desvincular cotizaciones — prueba: `tsc` sin errores.
- [ ] Verificar en la app con un lead real — sin verificar.

## Evidence
- `node --test src/lib/deal-sales.test.ts src/lib/appointment-links.test.ts`: 15 pass, 0 fail.
- `npx tsc --noEmit`: sin errores fuera de `*.test.ts` previos.

## Next
Probar en el navegador; decidir si el tablero del pipeline y el MCP también usan el valor efectivo.
