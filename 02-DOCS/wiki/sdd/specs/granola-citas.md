---
type: spec
title: Granola en las citas — resúmenes, notas y pasos
slug: granola-citas
status: draft
branch: main
timestamp: 2026-11-17T00:00:00Z
topic: sdd
---

# Spec — Granola en las citas

## Problem & why
Las reuniones se graban y resumen en Granola, pero esa información no llega al CRM. Quien abre una cita no ve qué se habló, qué se acordó ni qué sigue, y los pasos acordados se pierden o se reescriben a mano como tareas.

## Cost of not building it
Cada reunión exige copiar resumen y pasos de Granola al CRM a mano, o no se copian y el seguimiento del lead depende de la memoria del operador. Costo estimado: minutos por cita y seguimientos que se pierden.

## The cheapest alternative
Pegar manualmente el enlace de la nota de Granola en el campo de notas de la cita. Cuesta un clic, pero el contenido sigue fuera del CRM, no es buscable y los pasos no se vuelven tareas.

## Goals
- El CRM trae las sesiones de Granola de la organización y las guarda dentro de la cita correspondiente.
- Desde una cita se ven resumen, notas, pasos y tareas de la reunión.
- Los pasos se pueden convertir en tareas del CRM con un clic.

## Non-goals / out of scope
- Crear tareas automáticamente sin aprobación.
- Enviar mensajes o correos a clientes con el contenido de la reunión.
- Escribir de vuelta en Granola (editar notas, títulos, carpetas).
- Guardar la transcripción completa palabra por palabra (solo resumen, notas y pasos).
- Crear citas nuevas a partir de sesiones sin cita.
- Conexión por OAuth; solo clave API.
- Conectar varias cuentas de Granola por organización.

## Users & context
Operadores de Noxy (Cancún) que hacen llamadas con leads y clientes, graban con Granola y trabajan el seguimiento desde el CRM.

## What the user can do
- Un administrador de la organización pega la clave API de Granola en Ajustes, la prueba y la desconecta.
- Cualquier miembro con acceso a citas pulsa "Sincronizar ahora" y revisa el estado de la última sincronización.
- Abrir una cita y ver el resumen, las notas, los pasos y las tareas de su sesión de Granola.
- Ver la lista de sesiones sin asignar y vincular cada una a una cita, o desvincularla.
- Convertir un paso en tarea del CRM, ligada al lead o contacto de la cita.

## What result they get
Referencia: la cita abierta muestra una sección "Reunión (Granola)" con cuatro bloques (Resumen, Notas, Pasos, Tareas) y un indicador de origen y fecha de sincronización. Referencia visual: pendiente de aprobar por el dueño (boceto o captura al aprobar el plan). Respuestas de las rutas en JSON, con la organización aislada y sin exponer la clave.

## What it must respect
- Aislamiento por organización (constitución, sección de seguridad): una organización nunca ve sesiones de otra.
- La clave de Granola solo vive cifrada en el servidor; nunca se devuelve al navegador ni se escribe en logs.
- Migración SQL reversible; no se borran datos de citas existentes.
- Los vínculos de cita con lead y contacto (`appointment-links`) siguen funcionando igual.
- Sin dependencias nuevas salvo necesidad probada.
- Ninguna función envía mensajes a clientes.

## How it proves it
Pruebas de las funciones de emparejamiento (horario + correo), de cifrado y de conversión de pasos a tareas; pruebas de rutas con clave inválida (401/estado de error legible) y con otra organización (sin datos). TypeScript y build limpios. Una sincronización real contra la cuenta de Granola del dueño, con captura de la cita mostrando su resumen, queda en el archivo de verificación.

## Behaviour
- **Conectar:** al guardar la clave se valida contra Granola; si es inválida no se guarda y se muestra el motivo.
- **Sincronizar:** manual y por cron periódico. Trae sesiones nuevas o actualizadas desde la última sincronización. Es idempotente: sincronizar dos veces no duplica nada.
- **Vincular automático:** una sesión se asigna a una cita si coincide el horario (con tolerancia) y al menos un correo de asistente con el del invitado de la cita. Si hay más de una candidata o ninguna, queda "sin asignar".
- **Vincular manual:** el usuario asigna o desasigna una sesión sin asignar; una vinculación manual nunca la deshace la sincronización automática.
- **Actualización:** si Granola cambia el resumen, la cita refleja la versión nueva; las ediciones del usuario a los pasos ya convertidos en tarea no se pierden.
- **Pasos → tareas:** un paso se convierte en una Tarea ligada al lead/contacto de la cita; cada paso se convierte una sola vez y queda marcado como convertido.
- **Errores:** clave revocada o límite de Granola alcanzado se muestran como estado de conexión, sin romper la pantalla de citas.

## Acceptance criteria
- Given una clave inválida, When el administrador intenta guardarla, Then no se guarda y se muestra un error claro.
- Given una clave válida, When se pulsa "Sincronizar ahora", Then aparecen las sesiones de Granola y el estado muestra fecha y cantidad.
- Given una sesión cuyo horario y correo coinciden con exactamente una cita, When se sincroniza, Then la cita muestra su resumen, notas y pasos.
- Given una sesión con dos citas candidatas o ninguna, When se sincroniza, Then queda en "sin asignar" y no se escribe en ninguna cita.
- Given una sesión vinculada a mano, When se sincroniza de nuevo, Then el vínculo no cambia.
- Given dos sincronizaciones seguidas sin cambios en Granola, When terminan, Then no hay registros duplicados.
- Given un paso sin convertir, When el usuario pulsa convertir, Then existe una Tarea ligada al lead/contacto de la cita y el paso queda marcado; pulsar de nuevo no crea otra.
- Given un usuario de la organización B, When pide sesiones de la organización A, Then no recibe ninguna.
- Given cualquier respuesta de la API de conexión, When se inspecciona, Then no contiene la clave.
- Given el cron configurado, When corre, Then sincroniza sin intervención y un fallo de Granola no afecta a otras funciones del CRM.

## Points to clarify
- **pregunta abierta** — ¿Qué plan de Granola tiene el dueño y qué alcance tiene su clave (notas personales, públicas o ambas)? Determina si la API devuelve las reuniones que se esperan.
- **suposición tomada** — la clave es una por organización. *Base:* así se guarda hoy la conexión de Google Calendar. *Riesgo:* si cada operador usa su propia cuenta de Granola, hay que guardar una clave por usuario.
- **suposición tomada** — tolerancia de emparejamiento de ±15 minutos y coincidencia por correo del invitado. *Base:* las citas ya guardan correo e inicio. *Riesgo:* reuniones sin correo coincidente caerán siempre en "sin asignar".
- **suposición tomada** — la API de Granola solo devuelve sesiones con resumen y transcripción ya generados. *Base:* documentación pública consultada hoy. *Riesgo:* sesiones recientes tardan en aparecer.
- **suposición tomada** — "tareas" que se muestran son las acciones que Granola detecta en el resumen, no las Tareas del CRM, que aparecen aparte al convertirse. *Riesgo:* si se quiso otra cosa, cambia el bloque Tareas.
- **decisión diferida** — buscar dentro de los resúmenes desde la búsqueda global del CRM.
- **área no formulable** — cómo tratar reuniones con varios clientes en la misma sesión.
