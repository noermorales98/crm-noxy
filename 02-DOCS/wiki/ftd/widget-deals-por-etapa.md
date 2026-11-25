---
author: Claude Code
branch: main
status: done
---

# Widget «Deals por etapa»: solo etapas con información, mínimo 5 filas

## Intent
Que el widget no liste etapas vacías de sobra y que nunca quede casi vacío.

## Scope
- `src/lib/dashboard-stages.ts` (`pickStageRows`, `MIN_STAGE_ROWS = 5`) y su uso en `src/lib/dashboardWidgets.tsx`.
- Fuera de alcance: los datos (`dealsByStage` sigue trayendo todas las etapas) y el orden entre pipelines.

## Checklist
- [x] Solo etapas con deals.
- [x] Si hay menos de 5, se completan con las siguientes etapas vacías, en orden, hasta 5.
- [x] Si el CRM tiene menos de 5 etapas, salen todas.

## Evidence
- `node --test src/lib/dashboard-stages.test.ts`: 5 pasan (incluye 5+ con deals, menos de 5, ninguno y CRM con pocas etapas).
- ESLint y `tsc` sin errores en lo tocado. Sin comprobar en pantalla.

## Next
- Interpretación asumida de «mínimo 5 si no hay info»: rellenar con etapas vacías. Confirmar con quien lo pidió.
