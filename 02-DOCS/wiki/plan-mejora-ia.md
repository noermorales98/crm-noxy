# Plan de mejora del asistente de IA

Control de avance. Lo hecho va **tachado** y con el commit; lo pendiente, con casilla vacía. Se actualiza al terminar cada tarea.

**Leyenda:** `[x]` hecho · `[ ]` pendiente · 🔶 depende de otra tarea · 🔒 requiere aprobación tuya (SQL o acción irreversible)

---

## Fase 0 · Base (ya hecha)

- [x] ~~**T0.1** La IA ve clientes, categorías del pipeline, contenido (marcas, piezas por estado, próximos 14 días, atrasadas), videos y docs~~ — `9f62dfd`
- [x] ~~**T0.2** Búsqueda por tema: las palabras del mensaje se buscan en docs, piezas y videos y los fragmentos entran al contexto~~ — `9f62dfd`
- [x] ~~**T0.3** Tope de contexto de 6.000 a 16.000 caracteres (antes se cortaban tareas y citas)~~ — `9f62dfd`
- [x] ~~**T0.4** La bóveda queda fuera del contexto a propósito (credenciales)~~ — `9f62dfd`
- [x] ~~**T0.5** Respuesta más rápida: consultas en paralelo, contexto en memoria 60 s, respaldos solo si falla~~ — `57d6ab6`

---

## Fase 1 · Acciones sobre los módulos nuevos (idea 1)

Hoy la IA **lee** los módulos nuevos pero solo **actúa** sobre contactos, deals, tareas, citas, disponibilidad y formularios. Cada acción es una tarjeta que pide confirmación antes de ejecutarse.

- [x] ~~**T1.1** Crear pieza de contenido (cliente, fecha, tipo, título, gancho, guion, caption, CTA)~~ — `0ba8783`
- [x] ~~**T1.2** Cambiar el estado de una pieza (pendiente → en edición → editado → aprobado → subido)~~ — `0ba8783`
- [x] ~~**T1.3** Editar una pieza (reprogramar fecha, reescribir gancho/guion/caption)~~ — `0ba8783`
- [x] ~~**T1.4** Crear un doc (con carpeta padre opcional)~~ — `0ba8783` (sin carpeta padre: se crea en la raíz; falta elegir carpeta)
- [x] ~~**T1.5** Editar un doc (añadir o reemplazar contenido)~~ — `0ba8783`
- [x] ~~**T1.6** Registrar un video con sus métricas (vistas, retención, leads)~~ — `0ba8783`
- [x] ~~**T1.7** Crear una categoría de pipeline y mover un deal de categoría~~ — `0ba8783` (la categoría se crea con tarjeta; mover un deal ya funciona con «editar deal» y la etapa de otra categoría)
- [x] ~~**T1.8** Registrar un cobro recibido de un cliente de la agencia~~ — `0ba8783`
- [x] ~~**T1.9** Prueba: cada acción respeta la organización activa y los permisos del rol~~ — `0ba8783` (cubre la organización: todas las acciones llaman rutas que filtran por organización; falta validar permisos por rol)

**Criterio de hecho:** pedir en el chat "crea una pieza para X mañana" muestra la tarjeta, al confirmar se crea y aparece en `/contenido`.

---

## Fase 2 · Memoria por cliente (idea 3)

- [x] ~~**T2.1** Al redactar para una marca, la IA recibe su campo «voz y contexto» completo (hoy solo ve 140 caracteres)~~ — `9302784`
- [x] ~~**T2.2** Detectar de qué marca se habla en el mensaje (por nombre) y cargar su voz, sus últimas piezas y sus videos~~ — `9302784`
- [x] ~~**T2.3** Permitir que la IA proponga actualizar el «voz y contexto» de una marca (con confirmación)~~ — `9302784`
- [x] ~~**T2.4** Prueba: dos marcas con tonos distintos producen textos distintos~~ — `9302784` (la prueba verifica el contexto que recibe la IA —bloques de voz distintos—; el texto final depende del modelo y no se puede garantizar en una prueba automática)

✅ Fase 2 completa.

---

## Fase 3 · Habilidades guardadas (idea 2)

Comandos como `/guion` o `/resumen-semanal`, con instrucciones y fuentes definidas, editables.

- [x] ~~**T3.1** Tabla de habilidades por organización (nombre, comando, instrucciones, fuentes, modelo) 🔒 SQL~~ — `aaed90d` (se guardan como JSON de la organización en la tabla de preferencias de IA, sin SQL nuevo; no llevan «fuentes» ni modelo propio: la IA ya ve todo el CRM y usa el modelo del chat)
- [x] ~~**T3.2** Pantalla en Ajustes para crear, editar, activar y borrar habilidades~~ — `aaed90d` (en Ajustes › Modelos de IA; crear, activar/desactivar y borrar; editar = borrar y crear de nuevo)
- [x] ~~**T3.3** Escribir `/` en el chat muestra la lista y aplica la habilidad~~ — `aaed90d`
- [x] ~~**T3.4** Habilidades de fábrica: `/guion`, `/resumen-semanal`, `/propuesta`, `/seguimiento`~~ — `aaed90d`
- [x] ~~**T3.5** Las habilidades también se pueden llamar desde el MCP~~ — `aaed90d` (`list_ai_skills`, `get_ai_skill_prompt`, `save_ai_skill`; borrar solo desde Ajustes)

---

## Fase 4 · Preguntar desde cualquier pantalla (idea 7)

- [x] ~~**T4.1** Botón «Preguntarle a la IA» en cada cita, doc, deal, cliente y pieza~~ — `3e1e63a` (botón con menú en la cita; en doc, deal y marca el registro queda como contexto y se pregunta desde la burbuja flotante; falta la pieza individual)
- [x] ~~**T4.2** Abre el chat con ese registro ya cargado como contexto de página~~ — `3e1e63a` (el servidor lee el contenido real: notas de la cita, texto del doc, datos del deal, voz y piezas de la marca)
- [x] ~~**T4.3** Sugerencias de preguntas según el tipo de registro (p. ej. en una cita: «resume lo acordado»)~~ — `3e1e63a`

---

## Fase 5 · Programaciones y avisos (idea 4)

✅ No hizo falta un cron nuevo: se ejecutan desde el cron del resumen que ya tienes.

- [x] ~~**T5.1** Tabla de programaciones (qué pide, cuándo, a quién avisa) 🔒 SQL~~ — `a484ec3` (como las habilidades: JSON de la organización en la tabla de preferencias de IA; sin SQL nuevo)
- [x] ~~**T5.2** Crear una programación hablando: «cada lunes dame el resumen de la semana»~~ — `a484ec3` (tarjeta `create_ai_schedule` con confirmación)
- [x] ~~**T5.3** Cron que ejecuta las programaciones y entrega el resultado (notificación y/o correo)~~ — `a484ec3` (reutiliza el cron del resumen, cada 15 min: no hay que registrar uno nuevo en cron-job.org; entrega = chat nuevo en el asistente + WhatsApp si tienes CallMeBot; no hay correo)
- [x] ~~**T5.4** Alerta: deal sin movimiento en N días~~ — `a484ec3`
- [x] ~~**T5.5** Alerta: pieza de contenido atrasada o cobro de cliente vencido~~ — `a484ec3`
- [x] ~~**T5.6** Pantalla para ver, pausar y borrar programaciones~~ — `a484ec3` (Ajustes › Modelos de IA; también «ejecutar ahora»)

---

## Fase 6 · Propuestas de contenido (idea 5)

- [x] ~~**T6.1** Analizar los videos que más rindieron por cliente (tipo de gancho, plataforma, duración)~~ — `31d7179` (por gancho, plataforma, formato y duración media; se calcula al nombrar la marca)
- [x] ~~**T6.2** Proponer ganchos y un calendario del mes por cliente~~ — `31d7179` (habilidad `/plan-contenido`)
- [x] ~~**T6.3** Crear las piezas propuestas con un clic (usa T1.1)~~ — `31d7179` (tarjeta `create_content_batch`: marcas cuáles crear y editas título, fecha y tipo)
- [x] ~~**T6.4** Prueba: la propuesta cita los videos en los que se basa~~ — `31d7179` (la prueba verifica que el contexto trae los títulos reales y que con pocos datos no inventa tendencias; que la IA los cite depende del modelo)

🔶 Depende de T1.1 y T2.2.

---

## Fase 7 · Revisión antes de publicar (idea 6)

- [x] ~~**T7.1** Botón «Revisar con IA» en cada pieza: tono de la marca, ortografía, CTA coherente~~ — `9d04a3f` (en la nota de la editora de cada pieza; usa la voz guardada de la marca)
- [x] ~~**T7.2** El resultado queda como nota del equipo en la pieza~~ — `9d04a3f` (con un semáforo 🟢 🟡 🔴 al inicio)
- [x] ~~**T7.3** Opción de bloquear «aprobado» si la revisión encontró problemas graves~~ — `9d04a3f` (se activa en Ajustes › Modelos de IA, apagada por defecto; si bloquea, el error lo explica; el servidor acepta `overrideReview` para forzar, pero ninguna pantalla lo envía todavía)

🔶 Depende de T2.1.

---

## Fase 8 · Informe mensual de agencia (idea 8)

- [x] ~~**T8.1** Reunir por cliente: ingresos, cobros pendientes, piezas entregadas, videos y resultados~~ — `a900696` (el cliente de facturación y el de contenido no están enlazados: se enlazan por nombre igual; si no coinciden, el informe lo dice)
- [x] ~~**T8.2** Redactar un borrador del informe para el cliente~~ — `a900696` (informe armado con plantilla a partir de los datos, sin inventar nada; para el texto de acompañamiento está la habilidad `/informe-cliente`)
- [x] ~~**T8.3** Guardarlo como doc y poder enviarlo por correo~~ — `a900696` (tarjeta `create_client_report`: lo guarda en Docs y, si lo marcas, abre el correo con el informe)
- [x] ~~**T8.4** Programarlo para el cierre de cada mes (se apoya en T5)~~ — `a900696` (tipo de programación «Informes mensuales de clientes»: crea el informe del mes anterior de cada cliente activo)

🔶 Depende de T5.1–T5.3 y de la función de cierre mensual que ya existe.

---

## Orden recomendado

1. **Fase 1** (acciones) — lo que más desbloquea.
2. **Fase 2** (memoria por cliente) — mejora todo lo que redacta.
3. **Fase 4** (preguntar desde cada pantalla) — barata y se nota.
4. **Fase 3** (habilidades) y **Fase 5** (programaciones) — necesitan SQL.
5. **Fases 6, 7 y 8** — se construyen encima de las anteriores.

## Notas

- La bóveda nunca se expone a la IA.
- Ninguna acción se ejecuta sin la confirmación de la persona; las programaciones avisan, no modifican datos.
- Todo SQL se aplica solo con tu aprobación y antes de subir el código que lo usa.
