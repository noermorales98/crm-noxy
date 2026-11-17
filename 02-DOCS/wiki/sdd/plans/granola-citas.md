---
type: plan
title: Plan — Granola en las citas
slug: granola-citas
spec: 02-DOCS/wiki/sdd/specs/granola-citas.md
status: in-progress
timestamp: 2026-11-17T00:00:00Z
topic: sdd
---

# Plan — Granola en las citas

## Arquitectura (estructura, no sintaxis)
Un motor de sincronización único alimentado por una **fuente** intercambiable:
- **Fuente REST** (clave API): lista notas, pide el detalle solo de las cambiadas, respeta 5 peticiones/s.
- **Fuente MCP** (OAuth con registro dinámico): usa las herramientas de lectura del servidor MCP y lee su XML.
Ambas devuelven la misma nota normalizada; de ahí en adelante todo es idéntico (emparejar, guardar, pasos, tareas).

## Datos
- `GranolaConfig` (1 por organización): modo, credenciales cifradas, estado, última sincronización.
- `GranolaNote`: sesión guardada, ligada a una cita (nullable) con origen AUTO/MANUAL.
- `GranolaActionItem`: paso detectado, con vínculo opcional a la `Task` creada.
- SQL aditivo y reversible en `prisma/sql/granola.{up,down}.sql`. No se ejecuta contra la BD sin orden del dueño.

## Decisiones de diseño
- Cifrado con `secret-box` existente (AES-256-GCM, clave de AUTH_SECRET), igual que Notion.
- Pasos: extraídos del resumen por encabezados y casillas; una sola vez por paso convertido.
- Las notas no cambiadas (misma `updated_at`) no se vuelven a pedir: sincronizar es barato e idempotente.
- Vínculo MANUAL nunca lo toca la sincronización.
- Escritura de config y conexión MCP: solo OWNER/ADMIN. Sincronizar y ver: módulo crm.

## Tareas
| # | Tarea | Criterio | Riesgo | Verificación |
|---|-------|----------|--------|--------------|
| 1 | Esquema Prisma + SQL up/down | todos | 2 (esquema) | `prisma validate` |
| 2 | Lectura del resumen: pasos y XML del MCP | pasos, MCP | 1 | pruebas con datos sintéticos |
| 3 | Emparejamiento nota↔cita | auto/ambigua/ninguna | 1 | pruebas |
| 4 | Fuente REST con ritmo y errores | clave inválida, idempotencia | 1 | pruebas con `fetch` falso |
| 5 | Proveedor OAuth y fuente MCP | conectar, cancelar, revocar | 2 (auth) | pruebas con almacén en memoria |
| 6 | Motor de sync + mezcla de pasos | idempotencia, vínculo manual | 1 | pruebas de la mezcla |
| 7 | Rutas: config, MCP, sync, notas, pasos→tarea, cron | aislamiento, sin secretos | 2 (auth/secretos) | pruebas de permisos |
| 8 | UI: Ajustes, cita, sin asignar | resultado esperado | 1 | build + captura |
| 9 | Verificación y cierre | todos | — | tests, tsc, build |

## Análisis cruzado (spec ↔ plan ↔ tareas)
- Cada criterio de aceptación tiene tarea y verificación. Sin huecos.
- Sin contradicciones con la constitución (aislamiento, secretos, SQL reversible, sin dependencias nuevas).
- Desvío vigilado: el MCP no documenta parámetros; se usaron los del esquema real de las herramientas y una respuesta real. Queda como `review-after`.
- Los tests de rutas con BD real no se pueden correr sin base de pruebas: se cubre con funciones puras y se declara.
