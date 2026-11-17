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
- La cita tiene su propia página (`/appointments/:id`), a la que se llega con un clic en su título, donde las notas se leen en markdown con el mismo aspecto que los documentos de `/kb`.
- La IA lee las notas de la cita (de Granola, de Notion o escritas a mano) y propone sugerencias: tareas, citas de seguimiento, contactos nuevos y recomendaciones. Cada una se muestra en una lista y el usuario decide si la agrega o la descarta.
- Una cita también puede recibir notas escritas a mano en markdown o una página de Notion traída por su enlace, y se ven igual que las de Granola (resumen, pasos, tareas).

## Non-goals / out of scope
- Crear tareas, citas o contactos sin que el usuario lo apruebe uno por uno: la IA solo propone.
- Editar el contenido de una sugerencia antes de agregarla (por ahora se agrega tal cual o se descarta).
- Enviar mensajes a las personas que aparecen en una sugerencia o invitarlas a la cita.
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
- En una cita, escribir una nota en markdown, editarla y borrarla; o, siendo dueño o administrador, pegar el enlace de una página de Notion para importarla (y volver a importarla para actualizarla).
- Siendo dueño o administrador, ver la lista de sesiones sin asignar y vincular cada una a una cita; cualquier miembro puede desvincular una sesión de una cita.
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
- **Sincronización completa o por tramos:** la ventana de búsqueda solo avanza cuando se trajo todo. Si hubo tope, una respuesta cortada, límite de ritmo o sesiones que no se pudieron guardar, la siguiente corrida continúa desde el mismo punto sin repetir lo ya guardado. Una sola sincronización corre a la vez por organización.
- **Actualización por fecha de cambio:** se piden las sesiones actualizadas desde la última corrida, aunque la reunión sea antigua.
- **Sesiones sin asignar:** si su cita se crea después, la siguiente sincronización las empareja; un vínculo hecho a mano, incluida una desvinculación, nunca se deshace.
- **Privacidad:** las notas privadas de Granola y la lista de sesiones sin asignar solo las ven el dueño y los administradores; importar de Notion usa el acceso de toda la organización, por eso también es solo de ellos.
- **Quién genera:** generar sugerencias gasta créditos de IA, así que exige el permiso del asistente (el dueño y los administradores siempre lo tienen) y hay una espera de unos segundos entre generaciones de la misma cita. Agregar y descartar solo exige acceso a citas.
- **Sugerencias que envejecen:** una cita de seguimiento cuya fecha ya pasó al agregarla se rechaza con un mensaje; las notas se muestran sin cargar imágenes externas ni enlaces que no sean http(s).
- **Notion muy larga:** una página de más de 300 bloques se rechaza con un mensaje y no toca la nota que ya existiera.
- **Página de la cita:** `/appointments/:id` muestra datos de la cita (fecha, persona, estado, lead y contacto), las notas en markdown (estilo `/kb`), la acción de escribir o importar notas y el panel de sugerencias. El título de la cita en la lista enlaza a ella.
- **Sugerencias automáticas:** cuando entra o cambia una nota de la cita (sesión de Granola sincronizada o vinculada, nota escrita o editada, página de Notion importada), la IA genera sugerencias sola, después de responder a quien guardó la nota. Si el modelo falla, se prueba con un modelo ligero de NVIDIA (nunca uno pesado) siempre que haya clave de NVIDIA. La pantalla de la cita se actualiza sola cuando llegan. Si todo falla, solo queda en el registro y se puede generar a mano.
- **Sugerencias de la IA:** un botón genera sugerencias a partir de las notas de la cita. Cada sugerencia es de uno de cuatro tipos: *tarea*, *cita de seguimiento* (fecha y hora), *contacto nuevo* o *recomendación*. Quedan pendientes hasta que el usuario las agrega o las descarta; generar de nuevo no repite las que ya se agregaron o descartaron ni borra las pendientes que siguen vigentes.
- **Agregar una sugerencia:** una *tarea* crea una Tarea ligada al lead y contacto de la cita; una *cita de seguimiento* crea una cita con la misma persona y los mismos vínculos; un *contacto nuevo* crea el contacto (si ya existe uno con ese correo, no se duplica y la sugerencia queda ligada al existente); una *recomendación* queda marcada como aceptada, sin crear nada. Cada sugerencia se agrega una sola vez.
- **Descartar:** la sugerencia deja de mostrarse como pendiente. Al generar de nuevo, la IA recibe la lista de lo ya agregado y descartado para no repetirlo, y además una huella única por cita bloquea las repeticiones literales (una cita se identifica por su fecha). Si la IA la reformula con otras palabras, puede reaparecer.
- **Lo que lee la IA:** el título, el origen y el resumen o texto de cada nota; nunca el campo de notas privadas de Granola. El resumen que genera Granola puede reflejar lo que el dueño anotó, y eso no se puede separar. Los nombres y títulos escritos por terceros (como el nombre de quien reserva) se tratan como datos delimitados, nunca como instrucciones. Fechas relativas («el jueves») se resuelven con la fecha de la reunión y la zona de la organización. Si la IA devuelve un dato inválido: una cita sin fecha y hora válidas y futuras se omite; en una tarea o un contacto solo se omite el dato inválido (la fecha límite, el correo) y la sugerencia se conserva. Las demás sugerencias no se ven afectadas.
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
- Given una sincronización que no cubrió todas las sesiones (tope, respuesta cortada o fallo al guardar una), When termina, Then la ventana no avanza y la siguiente continúa sin perder ninguna.
- Given dos sincronizaciones a la vez en la misma organización, When se lanzan, Then solo una corre y la otra avisa que hay una en curso.
- Given un miembro que no es dueño ni administrador, When abre una cita, Then no ve notas privadas ni sesiones sin asignar y no puede importar de Notion.
- Given una sesión sin asignar cuya cita se crea después, When se sincroniza, Then queda asignada si coincide horario y correo.
- Given una cita con notas que mencionan pasos, una reunión de seguimiento y una persona nueva, When el usuario pulsa «Generar sugerencias», Then aparece una lista pendiente con tareas, citas, contactos y recomendaciones, y no se crea nada en el CRM.
- Given una cita a la que se le guarda una nota nueva, When pasan unos segundos, Then aparecen sugerencias sin pulsar nada y la respuesta de guardar la nota no esperó a la IA.
- Given que el modelo elegido falla, When hay clave de NVIDIA, Then se generan con un modelo ligero de NVIDIA y nunca con uno pesado.
- Given una sugerencia de tarea pendiente, When el usuario la agrega, Then existe una Tarea ligada al lead y contacto de la cita y la sugerencia queda aceptada; agregarla otra vez no crea otra.
- Given una sugerencia de cita de seguimiento con fecha y hora válidas, When se agrega, Then existe una cita nueva con la misma persona y vínculos.
- Given una sugerencia de contacto cuyo correo ya existe en la organización, When se agrega, Then no se duplica y se enlaza al existente.
- Given una sugerencia descartada, When se vuelve a generar, Then no reaparece.
- Given una respuesta de la IA con una cita sin fecha u hora válidas, o un contacto con un correo mal formado, When se procesa, Then la cita se omite y el contacto se conserva sin el correo; las demás sugerencias no cambian.
- Given una sugerencia de cita cuya fecha ya pasó, When el usuario la agrega, Then se rechaza con un mensaje y no se crea la cita.
- Given un miembro sin permiso del asistente y sin ser administrador, When pulsa «Generar sugerencias», Then se le niega; si es administrador, se genera.
- Given un nombre de invitado con saltos de línea o etiquetas que imitan instrucciones, When se genera, Then llega a la IA en una sola línea, como dato.
- Given una cita con notas privadas de Granola, When se generan sugerencias, Then el texto enviado a la IA no las contiene.
- Given una nota en markdown con títulos, listas, tablas y código, When se abre la página de la cita, Then se ve con el estilo de los documentos de `/kb`.
- Given la lista de citas, When el usuario hace clic en el título de una cita, Then se abre `/appointments/:id` de esa cita.
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
- **suposición tomada** — el cron recorre las organizaciones en serie y cada sincronización trae hasta 40 sesiones por corrida; con muchas organizaciones o historial grande, tarda varias corridas en ponerse al día. *Base:* el límite de 60 s por ejecución y de ~5 peticiones por segundo. *Riesgo:* a mayor escala hay que repartir el cron.
- **suposición tomada** — una *recomendación* aceptada no crea nada: queda como registro de que el usuario la tomó. *Base:* no hay un objeto del CRM natural para «consejos». *Riesgo:* si se esperaba que cada recomendación se vuelva una tarea, se cambia con una línea.
- **suposición tomada** — la IA usa el modelo preferido de quien genera (el del resumen diario) o el por defecto, y generar exige el permiso del asistente. *Riesgo:* un modelo caro elegido por un miembro consume más créditos.
- **suposición tomada** — el texto de las notas se envía a OpenRouter igual que otras funciones de IA del CRM, salvo las notas privadas de Granola. *Riesgo:* las notas pueden contener datos de clientes; es una decisión de privacidad del dueño.
- **suposición tomada** — las citas de seguimiento sugeridas se crean sin tipo de cita (horario apartado), con la persona de la cita original. *Riesgo:* si se quieren con un tipo de agenda, hay que elegirlo al agregar.
- **decisión diferida** — buscar dentro de los resúmenes desde la búsqueda global del CRM.
- **área no formulable** — cómo tratar reuniones con varios clientes en la misma sesión.

## Revisions
- 2026-11-17 — Tras el panel de revisión de la ampliación 2: generar exige el permiso del asistente; la IA recibe lo ya decidido; el nombre del invitado y los títulos se delimitan como datos; las notas no cargan imágenes externas; una cita vencida no se agenda; un dato inválido en tarea o contacto omite el dato y no la sugerencia (se ajustó el criterio de aceptación a esto).
- 2026-11-17 — El dueño pidió página propia de la cita, markdown estilo `/kb` y sugerencias de la IA (tareas, citas, contactos, recomendaciones) que él decide agregar o descartar. Se añaden sus comportamientos y criterios; se retira de la lista de «fuera de alcance» la creación de tareas desde pasos solo si hay aprobación uno por uno.
- 2026-11-17 — Tras el panel de revisión (tier 2): sincronización por tramos con ventana que solo avanza si se cubrió todo, bloqueo por organización, privacidad de notas privadas y sesiones sin asignar, e importación de Notion solo para administradores.
- 2026-11-17 — El dueño pidió además notas manuales en markdown e importar desde Notion (por enlace). Se añaden sus comportamientos y criterios.
- 2026-11-17 — El dueño pidió también conectar por MCP. Se retira "solo clave API" de fuera de alcance y se añaden la vía MCP (OAuth), sus criterios y supuestos. La spec ya estaba aprobada en autopiloto; esta ampliación se registra como `review-after`.
