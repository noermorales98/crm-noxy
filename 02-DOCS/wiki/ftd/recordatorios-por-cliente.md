---
author: Noeli
branch: recordatorios-por-cliente
status: in-progress
---

# Recordatorios por cliente, por lotes, y resumen opt-in

## Intent
Dejar de activar los avisos del calendario pieza por pieza: un interruptor por cliente, activación por lotes y resumen diario con el calendario de contenido, reciclando los cron-jobs que ya existen.

## Scope
- `ContentClient.remindersEnabled` (default true). Piezas nuevas lo heredan; el cron lo respeta; encenderlo activa las piezas futuras sin avisar.
- `/contenido/recordatorios`: interruptor por cliente, «Activar/Desactivar todos», selección, horario común. API `POST /api/content/reminders/bulk`; tool MCP `set_content_reminders`.
- `digest`: sección «Contenido»; botón «Activar mi resumen» en Configuración (no se crea horario solo).
- Sin crons nuevos: followups, digest y content-reminders absorben lo que falta.
- Fuera de alcance: multi-cuenta, aviso al dueño por el canal del cliente, cierre mensual (T4, después).

## Checklist
- [x] 1. Esquema + SQL up/down (`content-reminders-client`, `followup-notified`; sin aplicar a la BD)
- [x] 2. Cron y herencia al crear piezas, con pruebas (8 pasan)
- [x] 3. API de lotes + pantalla Recordatorios (tipos y lint OK; sin probar en navegador: falta BD)
- [x] 4. Tool MCP `set_content_reminders` (con aprobación humana)
- [x] 5. Digest con sección Contenido, «Activar mi resumen» (Configuración → Resumen) y aviso único de follow-up agrupado (8 pruebas)
- [ ] 6. Cierre mensual y archivado dentro de digest (T4, aparte)

## Next
1. Aplicar en la BD **antes** de desplegar: `prisma/sql/content-reminders-client.up.sql` y `prisma/sql/followup-notified.up.sql` (o `db:push`). Sin las columnas, las consultas nuevas fallan.
2. Probar en el navegador `/contenido/recordatorios` y `/settings/digest`.
3. Paso 6 (cierre mensual) queda para una tarea aparte.

## Evidencia
`npm test`: las mismas 7 pruebas que ya fallaban en `main` (contratos de diseño, navegación, favicon); ninguna nueva. `tsc`: sin errores en los archivos tocados.
