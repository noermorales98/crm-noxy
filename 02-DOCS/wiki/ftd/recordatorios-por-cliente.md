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
- [ ] 1. Esquema + SQL up/down (sin aplicar a la BD)
- [ ] 2. Cron e herencia al crear piezas, con pruebas
- [ ] 3. API de lotes + pantalla Recordatorios
- [ ] 4. Tool MCP `set_content_reminders`
- [ ] 5. Digest: contenido + «Activar mi resumen» + aviso único de follow-up
- [ ] 6. Cierre mensual y archivado dentro de digest (T4, aparte)

## Next
Paso 1 hecho al aplicar `prisma/sql/content-reminders-client.up.sql` (o `db:push`) en la BD: lo hace Noeli.
