---
type: spec
title: Granola en las citas — resúmenes, notas y pasos
slug: granola-citas
status: approved en autopiloto (no punto por punto)
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
- Una cita también puede recibir notas escritas a mano en markdown o una página de Notion traída por su enlace, y se ven igual que las de Granola (resumen, pasos, tareas).

## Non-goals / out of scope
- Crear tareas automáticamente sin aprobación.
- Enviar mensajes o correos a clientes con el contenido de la reunión.
- Escribir de vuelta en Granola (editar notas, títulos, carpetas).
- Guardar la transcripción completa palabra por palabra (solo resumen, notas y pasos).
- Crear citas nuevas a partir de sesiones sin cita.
- Usar las herramientas de escritura del MCP de Granola (carpetas, notas privadas, regenerar resumen): el CRM solo lee.
- Conectar varias cuentas de Granola por organización: una conexión activa, por clave API o por MCP.
- Sincronizar automáticamente una base de datos de Notion o escribir de vuelta en Notion: solo se importa una página por enlace.

## Users & context
Operadores de Noxy (Cancún) que hacen llamadas con leads y clientes, graban con Granola y trabajan el seguimiento desde el CRM.

## What the user can do
- Un administrador de la organización conecta Granola de una de dos formas: pegando una clave API en Ajustes, o por MCP iniciando sesión en Granola (autorización OAuth). Puede probar la conexión y desconectarla.
- Cualquier miembro con acceso a citas pulsa "Sincronizar ahora" y revisa el estado de la última sincronización.
- Abrir una cita y ver el resumen, las notas, los pasos y las tareas de su sesión de Granola.
- En una cita, escribir una nota en markdown, editarla y borrarla; o pegar el enlace de una página de Notion para importarla (y volver a importarla para actualizarla).
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
- **Conectar con clave:** al guardar la clave se valida contra Granola; si es inválida no se guarda y se muestra el motivo.
- **Conectar por MCP:** el botón lleva al usuario a Granola para autorizar; al volver, el CRM queda conectado y lo muestra como "Conectado por MCP". Si la autorización se cancela o falla, no queda conexión a medias. Si el acceso caduca o se revoca, el estado pide "Reconectar" sin romper las citas.
- **Nota manual:** el usuario escribe markdown en la cita; se guarda como resumen de esa cita y de ahí se detectan los pasos con las mismas reglas. Solo las notas manuales o de Notion se pueden editar o borrar; las de Granola se actualizan solo desde Granola.
- **Notion:** con la conexión de Notion ya guardada en Ajustes, un enlace o id de página se convierte a markdown y se guarda en la cita. Reimportar la misma página actualiza esa nota sin duplicarla. Si la página no existe o no está compartida con la integración, se explica el motivo.
- **Misma experiencia:** sin importar la vía, las sesiones, el emparejamiento, los pasos y las tareas se comportan igual.
- **Sincronizar:** manual y por cron periódico. Trae sesiones nuevas o actualizadas desde la última sincronización. Es idempotente: sincronizar dos veces no duplica nada.
- **Vincular automático:** una sesión se asigna a una cita si coincide el horario (con tolerancia) y al menos un correo de asistente con el del invitado de la cita. Si hay más de una candidata o ninguna, queda "sin asignar".
- **Vincular manual:** el usuario asigna o desasigna una sesión sin asignar; una vinculación manual nunca la deshace la sincronización automática.
- **Actualización:** si Granola cambia el resumen, la cita refleja la versión nueva; las ediciones del usuario a los pasos ya convertidos en tarea no se pierden.
- **Pasos → tareas:** un paso se convierte en una Tarea ligada al lead/contacto de la cita; cada paso se convierte una sola vez y queda marcado como convertido.
- **Errores:** clave revocada o límite de Granola alcanzado se muestran como estado de conexión, sin romper la pantalla de citas.

## Acceptance criteria
- Given una clave inválida, When el administrador intenta guardarla, Then no se guarda y se muestra un error claro.
- Given el administrador elige conectar por MCP, When completa la autorización en Granola, Then el CRM muestra "Conectado por MCP" y "Sincronizar ahora" trae sesiones.
- Given una autorización MCP cancelada o con estado inválido, When el navegador vuelve al CRM, Then no queda conexión guardada y se explica el motivo.
- Given una conexión MCP cuyo acceso fue revocado, When se sincroniza, Then el estado pide reconectar y las citas siguen funcionando.
- Given dos organizaciones con conexión MCP, When una se desconecta, Then la otra no se afecta y ningún token se devuelve al navegador.
- Given una clave válida, When se pulsa "Sincronizar ahora", Then aparecen las sesiones de Granola y el estado muestra fecha y cantidad.
- Given una sesión cuyo horario y correo coinciden con exactamente una cita, When se sincroniza, Then la cita muestra su resumen, notas y pasos.
- Given una sesión con dos citas candidatas o ninguna, When se sincroniza, Then queda en "sin asignar" y no se escribe en ninguna cita.
- Given una sesión vinculada a mano, When se sincroniza de nuevo, Then el vínculo no cambia.
- Given dos sincronizaciones seguidas sin cambios en Granola, When terminan, Then no hay registros duplicados.
- Given un paso sin convertir, When el usuario pulsa convertir, Then existe una Tarea ligada al lead/contacto de la cita y el paso queda marcado; pulsar de nuevo no crea otra.
- Given una nota escrita en markdown con una sección «Siguientes pasos», When se guarda en la cita, Then aparecen sus pasos y se pueden convertir en tareas como los de Granola.
- Given una nota manual, When se edita el texto, Then los pasos nuevos se agregan, los pendientes que ya no están se quitan y los ya convertidos en tarea se conservan.
- Given una nota de Granola, When se intenta editar o borrar a mano, Then se rechaza.
- Given el enlace de una página de Notion accesible, When se importa dos veces, Then la cita tiene una sola nota de esa página, actualizada.
- Given que Notion no está conectado o la página no es accesible, When se intenta importar, Then se explica el motivo y no se crea nada.
- Given un usuario de la organización B, When pide sesiones de la organización A, Then no recibe ninguna.
- Given cualquier respuesta de la API de conexión, When se inspecciona, Then no contiene la clave.
- Given el cron configurado, When corre, Then sincroniza sin intervención y un fallo de Granola no afecta a otras funciones del CRM.

## Points to clarify
- **pregunta abierta** — ¿Qué plan de Granola tiene el dueño y qué alcance tiene su clave (notas personales, públicas o ambas)? Determina si la API devuelve las reuniones que se esperan.
- **suposición tomada** — la clave es una por organización. *Base:* así se guarda hoy la conexión de Google Calendar. *Riesgo:* si cada operador usa su propia cuenta de Granola, hay que guardar una clave por usuario.
- **suposición tomada** — tolerancia de emparejamiento de ±15 minutos y coincidencia por correo del invitado. *Base:* las citas ya guardan correo e inicio. *Riesgo:* reuniones sin correo coincidente caerán siempre en "sin asignar".
- **suposición tomada** — la API de Granola solo devuelve sesiones con resumen y transcripción ya generados. *Base:* documentación pública consultada hoy. *Riesgo:* sesiones recientes tardan en aparecer.
- **suposición tomada** — "tareas" que se muestran son las acciones que Granola detecta en el resumen, no las Tareas del CRM, que aparecen aparte al convertirse. *Riesgo:* si se quiso otra cosa, cambia el bloque Tareas.
- **suposición tomada** — el MCP de Granola solo admite OAuth (sin clave API) y devuelve XML con resumen en markdown. *Base:* documentación pública y una lectura real de una respuesta. *Riesgo:* si Granola cambia el formato, el lector del MCP debe ajustarse; la vía de clave API no depende de él.
- **suposición tomada** — el MCP actúa como la cuenta de quien autoriza, con la ventana de historia de su plan (el plan gratis solo da 30 días) y un límite aproximado de 100 peticiones por minuto. *Riesgo:* historias anteriores a esa ventana no se traen.
- **suposición tomada** — los pasos no vienen como campo en ninguna de las dos vías; se detectan en el resumen por encabezados como "Siguientes pasos" o "Action items" y por casillas `- [ ]`. *Riesgo:* resúmenes sin esa estructura muestran cero pasos.
- **suposición tomada** — Notion se integra por importación de una página por enlace, usando el token de Notion que ya guarda el CRM, y no como sincronización automática. *Base:* es lo que cabe sin base de datos de reuniones definida. *Riesgo:* si se quería sincronizar una base completa, es otra iteración. La página debe estar compartida con la integración de Notion.
- **decisión diferida** — buscar dentro de los resúmenes desde la búsqueda global del CRM.
- **área no formulable** — cómo tratar reuniones con varios clientes en la misma sesión.

## Revisions
- 2026-11-17 — El dueño pidió además notas manuales en markdown e importar desde Notion (por enlace). Se añaden sus comportamientos y criterios.
- 2026-11-17 — El dueño pidió también conectar por MCP. Se retira "solo clave API" de fuera de alcance y se añaden la vía MCP (OAuth), sus criterios y supuestos. La spec ya estaba aprobada en autopiloto; esta ampliación se registra como `review-after`.
