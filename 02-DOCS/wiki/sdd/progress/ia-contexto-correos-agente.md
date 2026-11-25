---
type: progress
title: Progreso — IA con contexto, borradores y agente
slug: ia-contexto-correos-agente
topic: sdd
---

# Progreso — ia-contexto-correos-agente

Spec aprobada por la persona; modo autopiloto por fases.

## Fase 1 — Contexto (hecha)
- [x] `src/lib/ai-prompt.ts` (`assembleSystemPrompt`): el registro abierto va primero, con reglas de referencia, y nunca se recorta; cede el resumen general. 8 pruebas.
- [x] `buildPageRecordContext`: cita (con correo y teléfono para escribirle), contacto, empresa, cliente, cotización, proyecto y tarea; deal con correo del contacto. Si falta el correo lo dice.
- [x] Pantallas que declaran contexto: contacto, cliente, proyecto, cotización; listas de tareas, pipeline y empresas. Preguntas sugeridas para los tipos nuevos.
- [x] AC1: reproducción real con la cita de ejemplo y el modelo predeterminado: nombra a la persona, resume lo acordado en las notas, deja `to` vacío y avisa que falta el correo (antes: «¿a cuál persona te refieres?»).
- [x] AC2: prueba automatizada con un resumen de 48 000 caracteres: el registro sigue completo.
- [~] AC3: contexto de contacto, empresa, cliente, cotización, proyecto y tarea construido y compilado; **sin probar contra datos reales** (solo se probó la cita).
- [ ] AC8 (aislamiento por organización): todas las consultas filtran por `organizationId`; sin prueba automatizada.

## Fase 2 — Borradores en el CRM (pendiente)
Requiere un valor nuevo en `EmailType` (migración SQL sobre la base de datos). **Esperando visto bueno para aplicarla.**

## Fase 3 — Envío desde borrador (pendiente)
## Fase 4 — Cadena de acciones con confirmación (pendiente)
