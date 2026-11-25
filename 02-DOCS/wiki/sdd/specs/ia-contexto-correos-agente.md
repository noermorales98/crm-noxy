---
type: spec
title: IA con contexto real, borradores de correo y acciones como agente
slug: ia-contexto-correos-agente
status: draft — pendiente de aprobación
branch: main
timestamp: 2026-11-25T00:00:00Z
topic: sdd
---

# Spec — IA con contexto real, borradores de correo y acciones como agente

## Problem & why
En `/appointments/:id`, «Preguntar a la IA» → «Redacta un correo de seguimiento para esta persona» respondió que no sabía a quién se refería y que la cita «no aparece». Reproducido con la cita real y el modelo predeterminado. Causas halladas:
1. El contenido del registro abierto va **al final** del prompt, detrás del resumen general del CRM (~11 000 de ~21 000 caracteres), y un recorte a 16 000 caracteres lo puede cortar cuando el CRM crece.
2. Nada le dice al modelo que «esta persona / esta cita / aquí» significa ese registro; el aviso de página solo lleva el título.
3. Solo cita, doc, deal y marca/pieza de contenido llevan contenido real. Contacto, empresa, cliente, cotización, tarea, proyecto, lista de contactos, emails y el tablero del pipeline no lo llevan.
4. El correo no se puede dejar en borrador: `draft_email` solo abre un compositor y la tabla `Email` solo tiene `RECEIVED` y `SENT`.
5. La IA propone **una** acción por mensaje; no encadena pasos.

## Cost of not building it
La IA responde «¿a quién te refieres?» justo donde la persona ya está parada, y cada correo se redacta y se guarda a mano. Pierde la razón de ser del botón.

## The cheapest alternative
Pegar a mano en el chat el contenido de la cita antes de pedir el correo. Funciona, pero es exactamente lo que el botón debía evitar.

## Goals
**A. Contexto (la causa raíz).**
- El registro que la persona tiene abierto va **primero** en lo que recibe la IA, con una instrucción explícita: «esta cita / esta persona / aquí / este deal» = ese registro. Nunca se recorta; se recorta el resumen general.
- Incluye los datos para escribirle a la persona: nombre, correo, teléfono, contacto vinculado, deal y notas. Si falta un dato necesario (p. ej. el correo), la IA lo dice y lo pregunta.
- Mismo comportamiento en **todas** las pantallas con registro: cita, doc, deal, marca, pieza, **contacto, empresa, cliente, cotización, tarea y proyecto**. Las listas (contactos, emails, pipeline) declaran qué lista ven y su conteo.

**B. Borradores de correo en el CRM.**
- Nuevo tipo de correo «borrador» en la bandeja de `/emails`: se ve, se edita, se envía o se borra desde ahí.
- La IA puede dejar un correo redactado como borrador (para, asunto, cuerpo, empresa remitente) sin enviarlo.

**C. Envío de correos.**
- Desde un borrador o desde el chat, la persona confirma y el correo sale desde la empresa con SMTP configurado (`/api/emails/send`).

**D. Acciones como agente (cadena con confirmación).**
- La IA puede encadenar varios pasos en una respuesta (leer la cita, redactar, guardar el borrador, crear la tarea de seguimiento).
- Ejecuta sola lo interno y reversible (guardar un borrador, crear una tarea o nota).
- **Pide confirmación explícita antes de** enviar un correo, enviar una cotización, borrar algo o cambiar una etapa a perdida.

## Non-goals / out of scope
- Ejecución totalmente automática de envíos o borrados.
- Guardar el borrador también en el buzón real (Gmail/IMAP).
- Responder correos recibidos o seguir hilos; adjuntos creados por la IA.
- Cambiar de modelo, de proveedor o la lógica de failover de IA.
- Contexto de la bóveda de credenciales (sigue excluida).
- Programar envíos futuros desde el chat (existe `scheduledAt`, no se toca).

## The four questions
1. **¿Qué puede hacer la persona?** Pedir desde cualquier pantalla con registro «redacta un correo para esta persona» y obtener un correo con sus datos reales; guardarlo como borrador; editarlo y enviarlo; pedir varios pasos en un mensaje.
2. **¿Qué resultado obtiene?** Un borrador visible en `/emails` (tipo borrador) y, si lo pidió, tareas o notas creadas; el envío solo ocurre tras su confirmación.
3. **¿Qué debe respetar?** Datos solo de la organización activa; la bóveda fuera; ningún correo sale sin confirmación; el correo del destinatario nunca se inventa; el recorte del contexto nunca quita el registro abierto; permisos actuales (`assistant`, correo configurado).
4. **¿Cómo se prueba a sí misma?** Pruebas del armado del prompt (el registro va primero y nunca se recorta; un CRM enorme no lo desplaza); prueba de que cada tipo de pantalla produce su bloque de contexto; prueba del tipo borrador (crear, listar, enviar, borrar); reproducción real: la misma pregunta que falló ahora nombra a la persona y usa las notas.

## Acceptance criteria
- AC1. Con la cita de ejemplo, «Redacta un correo de seguimiento para esta persona» produce un correo que nombra a la persona y cita lo acordado en las notas, sin pedir aclaración. Si falta el correo del destinatario, la IA lo dice.
- AC2. Con un CRM cuyo resumen excede 16 000 caracteres, el registro abierto sigue completo en el prompt (prueba automatizada).
- AC3. Contacto, empresa, cliente, cotización, tarea y proyecto abiertos entregan su contenido real al asistente; las listas entregan qué lista y cuántos elementos.
- AC4. La IA puede dejar un borrador; aparece en `/emails` como borrador y no se envía.
- AC5. Desde el borrador se edita, se envía (tras confirmar) y se borra; un envío exitoso lo convierte en enviado.
- AC6. En una sola petición la IA encadena al menos «guardar borrador» y «crear tarea de seguimiento»; ninguna de las dos pide confirmación.
- AC7. Enviar un correo, enviar una cotización, borrar o mover a «perdida» siempre muestran confirmación antes de ejecutarse.
- AC8. Datos de otra organización nunca aparecen en el contexto (prueba de aislamiento).

## Assumptions (por confirmar en `clarify`)
- «Borrador» se guarda como nuevo valor del enum `EmailType` y requiere una migración SQL en `prisma/` (el proyecto aplica SQL a mano, ver `prisma/*.sql`).
- El remitente del borrador es una empresa con SMTP configurado; si hay varias, la IA propone la de la cita/deal o pregunta.
- La cadena de pasos reutiliza las tarjetas de acción existentes (`ActionCard`): las internas se ejecutan al proponerse y las sensibles esperan confirmación.
