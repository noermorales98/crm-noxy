---
type: progress
title: Avance — Granola en las citas
slug: granola-citas
spec: 02-DOCS/wiki/sdd/specs/granola-citas.md
plan: 02-DOCS/wiki/sdd/plans/granola-citas.md
timestamp: 2026-11-17T00:00:00Z
topic: sdd
---

# Avance — Granola en las citas

Modo: autopiloto. Riesgo (`rsc risk`): **tier 2** (migración de esquema). Revisión: panel de tres refutadores + aprobación humana para integrar.

## Estado por tarea
| # | Tarea | Estado | Evidencia |
|---|-------|--------|-----------|
| 1 | Esquema Prisma + SQL up/down | hecho | `prisma validate` OK; SQL en `prisma/sql/granola.{up,down}.sql` (sin ejecutar en la BD) |
| 2 | Lectura de resumen, XML MCP y REST | hecho | `granola-parse.test.ts` 9 pruebas |
| 3 | Emparejamiento nota↔cita y mezcla de pasos | hecho | `granola-match.test.ts` 7 pruebas |
| 4 | Fuente REST | hecho | `granola-client.test.ts` 7 pruebas |
| 5 | Proveedor OAuth y fuente MCP | hecho | `granola-mcp.test.ts` 4 pruebas (OAuth real no probado) |
| 6 | Motor de sync, notas manuales, Notion | hecho | compila; sin prueba con BD |
| 7 | Rutas y permisos | hecho | build OK; `permissions.test.ts` +1 |
| 8 | UI Ajustes y diálogo de la cita | hecho | build OK; sin verificación visual (requiere BD migrada y sesión) |
| 9 | Verificación | parcial | 357/364 pruebas; las 7 fallos ya fallaban sin estos cambios |

## Verificación observada
- `npm test`: 364 pruebas, 357 pasan, 7 fallan. Con los cambios en archivos existentes apartados fallan las mismas 7 (navegación, formularios públicos, favicon, color de acción, `DealDetailClient`). No son de esta función.
- `tsc --noEmit`: 20 errores, todos en pruebas anteriores; ninguno en archivos de Granola.
- `eslint` sobre los archivos nuevos: limpio. `npm run build`: correcto, con las 9 rutas nuevas.

## Decision queue
- [blocking] Q1 — Aprobar la integración: riesgo tier 2 (esquema y credenciales); un humano debe aprobar antes de integrar y ejecutar `prisma/sql/granola.up.sql` en la BD, evidencia: `rsc risk` tier 2, tarea 1
- [blocking] Q2 — Probar de punta a punta contra Granola real (clave API y OAuth por MCP) con la BD migrada; las pruebas solo usan datos sintéticos y fuentes falsas, evidencia: tareas 4 y 5
- [review-after] Q3 — La spec se ampló dos veces tras aprobarse en autopiloto (MCP; notas manuales y Notion), registrado en `## Revisions` de la spec, tarea spec
- [review-after] Q4 — Los pasos se detectan del resumen por encabezados y casillas porque ninguna vía de Granola trae un campo de acciones, `granola-parse.ts`, tarea 2
- [review-after] Q5 — El MCP no documenta parámetros ni formato; se usaron los del esquema real de las herramientas y una respuesta real, `granola-mcp.ts`, tarea 5
- [review-after] Q6 — Notion se integra por importación de una página por enlace, no por sincronización de una base, tarea 6
- [review-after] Q7 — El modelo conserva el nombre `GranolaNote` aunque guarda también notas manuales y de Notion (campo `source`), `prisma/schema.prisma`, tarea 1
- [review-after] Q8 — El cron `/api/cron/granola` debe darse de alta en cron-job.org (cada 30 min), `CRON.md`, tarea 7
- [review-after] Q9 — Referencia visual de la sección «Reunión» sin aprobar por el dueño; revisar la pantalla real, tarea 8
