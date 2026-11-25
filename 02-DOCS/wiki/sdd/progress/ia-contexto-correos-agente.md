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

## Fase 2 — Borradores en el CRM (hecha)
- [x] `EmailType.DRAFT` en el esquema y SQL aditivo `prisma/sql/email-drafts.up.sql` (+ `.down.sql`, que borra los borradores antes de quitar el valor). **Aplicado a la base el 2026-11-25**: `enum('RECEIVED','SENT','DRAFT')`, 24 filas intactas (15 recibidos, 9 enviados).
- [x] `src/lib/email-drafts.ts` (`textToHtml`, `normalizeDraft`, `draftReadyToSend`) con 5 pruebas; verde tras ver rojo.
- [x] API: `POST /api/emails/drafts` (empresa de la organización), `PATCH /api/emails/[id]` edita solo borradores y conserva lo que no se envía, `GET /api/emails?folder=drafts`; archivados y spam excluyen borradores.
- [x] `/emails`: carpeta «Borradores» (sidebar y página), «Guardar borrador» en el compositor, «Editar y enviar» en el detalle.
- [x] IA: la acción `draft_email` ahora **guarda** el borrador (con selector de empresa) en vez de solo abrir el compositor; el prompt le dice que no envía nada.
- [x] Prueba real contra la base: un borrador no aparece en Entrada, Enviados, no leídos ni en el cron de programados; otra organización no lo ve; se borró el de prueba.
- [ ] Sin verificar en navegador (la sesión de navegador está detenida).

## Fase 3 — Envío desde borrador (en curso)
- [x] «Editar y enviar» abre el compositor con el borrador; al pulsar **Enviar** (la confirmación) sale por `/api/emails/send` y el servidor borra ese borrador (solo de la misma organización y tipo borrador).
- [ ] Pendiente: que la IA pueda proponer «enviar este borrador» como acción con confirmación (fase 4).

## Fase 4 — Cadena de acciones con confirmación (hecha)
- [x] `src/lib/action-safety.ts` (`isSensitiveAction`, `isAutoRunnable`, `AUTO_RUN_TYPES`) con 4 pruebas: solo `draft_email` y `create_task` corren solas (y con lo mínimo); enviar, borrar y editar un deal a «perdida» nunca (AC7).
- [x] `ActionCard`: las acciones automáticas se ejecutan al aparecer (una sola vez; se marcan hechas de forma permanente); sin empresa elegida, el borrador queda como tarjeta manual.
- [x] Nueva acción `send_draft` (con confirmación): lee el borrador actual, comprueba que esté completo y lo envía por `/api/emails/send`, que lo borra.
- [x] `POST /api/emails/drafts` es idempotente (mismo destinatario, asunto y texto no duplica).
- [x] Prompt: la IA puede encadenar varios bloques `action`; no propone enviar en el mismo mensaje en que redacta. Contexto de `/emails` lista borradores (con id) y empresas.
- [x] AC6 con el modelo real y la cita de ejemplo: una sola petición produjo `draft_email` + `create_task`, sin acciones de envío.
- [ ] Sin verificar en navegador que la tarjeta se auto-ejecuta (sesión de navegador detenida).
