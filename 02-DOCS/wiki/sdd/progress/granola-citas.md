---
type: progress
title: Avance — Granola en las citas
slug: granola-citas
spec: 02-DOCS/wiki/sdd/specs/granola-citas.md
plan: 02-DOCS/wiki/sdd/plans/granola-citas.md
timestamp: 2026-11-17T00:00:00Z
topic: sdd
---

# Avance — Granola en las citas

Modo: autopiloto. Riesgo (`rsc risk`): **tier 2** (migración de esquema). Revisión: panel de tres refutadores + aprobación humana para integrar.

## Estado por tarea
| # | Tarea | Estado | Evidencia |
|---|-------|--------|-----------|
| 1 | Esquema Prisma + SQL up/down | hecho | `prisma validate` OK; SQL en `prisma/sql/granola.{up,down}.sql` (sin ejecutar en la BD) |
| 2 | Lectura de resumen, XML MCP y REST | hecho | `granola-parse.test.ts` 9 pruebas |
| 3 | Emparejamiento nota↔cita y mezcla de pasos | hecho | `granola-match.test.ts` 7 pruebas |
| 4 | Fuente REST | hecho | `granola-client.test.ts` 7 pruebas |
| 5 | Proveedor OAuth y fuente MCP | hecho | `granola-mcp.test.ts` 4 pruebas (OAuth real no probado) |
| 6 | Motor de sync, notas manuales, Notion | hecho | compila; sin prueba con BD |
| 7 | Rutas y permisos | hecho | build OK; `permissions.test.ts` +1 |
| 8 | UI Ajustes y diálogo de la cita | hecho | build OK; sin verificación visual (requiere BD migrada y sesión) |
| 9 | Verificación | parcial | 357/364 pruebas; las 7 fallos ya fallaban sin estos cambios |

## Verificación observada
- `npm test`: 364 pruebas, 357 pasan, 7 fallan. Con los cambios en archivos existentes apartados fallan las mismas 7 (navegación, formularios públicos, favicon, color de acción, `DealDetailClient`). No son de esta función.
- `tsc --noEmit`: 20 errores, todos en pruebas anteriores; ninguno en archivos de Granola.
- `eslint` sobre los archivos nuevos: limpio. `npm run build`: correcto, con las 9 rutas nuevas.

## Revisión del panel (tier 2)
Tres refutadores (seguridad, corrección, pruebas) revisaron la función. Corregido:
- Bloqueante: la ventana de sincronización avanzaba aunque quedaran sesiones sin traer → ahora solo avanza si la corrida se cubrió por completo.
- MCP: filtraba por fecha de reunión, no de cambio → usa `updated_after`; acceso revocado caía como error genérico → ahora pide reconectar; respuesta cortada se guardaba como definitiva → se descarta; cursor repetido y tope de 200.
- Concurrencia: bloqueo por organización (`syncingAt`); cada sesión se guarda con sus pasos en una transacción; un fallo no aborta las demás.
- Seguridad: notas privadas, sesiones sin asignar e importar de Notion solo para administradores; la conexión anterior no se destruye hasta confirmar la nueva; el callback no toca nada con un `state` ajeno y compara en tiempo constante.
- Notion: página de más de 300 bloques se rechaza (antes se recortaba y podía borrar pasos); sangría de texto anidado (bug hallado por una prueba nueva).
- Pasos: las posiciones ya no se repiten tras quitar pendientes. Sesiones sin asignar se reempatan cuando su cita se crea después.
- Pruebas: +callback, +reglas de tarea/edición, +borde de tolerancia, +ventana de 30 días, +espera tras 429, +topes y bucles de paginación, +clasificación de errores.

No corregido (queda en la cola): pruebas de rutas y del servicio con base de datos real (aislamiento entre organizaciones, una tarea por paso, vínculo manual, idempotencia de punta a punta); límite de ritmo de Notion al importar; `redirect_uri` sin variable en producción; orden y presupuesto de tiempo del cron con muchas organizaciones.

## Ampliación 2 — página de la cita y sugerencias de la IA
- Página `/appointments/:id` (datos de la cita, sugerencias y notas) y el título en la lista enlaza a ella; el diálogo anterior se sustituyó por el panel `AppointmentMeetingPanel`.
- Las notas se leen con `KbMarkdown`, el mismo componente de `/kb`.
- Sugerencias de la IA (tarea, cita de seguimiento, contacto, recomendación): se generan con `completeWithAi`, se validan en `meeting-suggestions.ts` y quedan PENDIENTES; solo se crea algo en el CRM al agregarlas, una sola vez (cierre atómico en transacción). Las descartadas y agregadas no reaparecen (huella única por cita).
- Las notas privadas de Granola no se envían a la IA.
- Evidencia: 398 pruebas (11 nuevas del módulo de sugerencias y 3 de permisos), build correcto con las rutas nuevas, lint limpio en lo nuevo, 20 errores de TypeScript = base. Las mismas 7 pruebas ajenas siguen fallando.
- Panel de revisión (tier 2) de esta ampliación: 3 refutadores, sin bloqueantes. Corregido: inyección de prompt por nombre de invitado (datos delimitados en una línea), gasto de IA (permiso del asistente + espera de 15 s), reaparición de descartadas (la IA recibe lo ya decidido; huella de cita por fecha; huellas con cualquier alfabeto), cita vencida al agregar, rescate de JSON cortado, imágenes externas y enlaces no http(s) en notas, mensajes y doble clic en la interfaz. La lógica de «qué se crea y qué hereda» se extrajo a `planAcceptance` y el filtro de privacidad a `pickNotesForAi`, ambos con pruebas.
- No corregido: `PATCH /api/appointments/:id` sigue devolviendo `cancelToken` (ya era así); el resumen de Granola puede reflejar notas privadas (limitación del origen); no hay pruebas con base de datos para «agregar una sola vez» ni aislamiento (Q10).
- Sin verificar: la IA real (no hay clave ni base migrada en esta sesión), la pantalla en el navegador y la creación en base de datos.

## Integración (2026-11-17)
- El dueño aprobó la integración (riesgo tier 2) y ordenó ejecutar el SQL y subir a `main`.
- `prisma/sql/granola.up.sql` ejecutado en la base real: 4 tablas creadas (`GranolaConfig`, `GranolaNote`, `GranolaActionItem`, `AppointmentSuggestion`); lectura de cada modelo correcta; las 5 citas existentes intactas.
- Commits en `main`: `e2e00a3` (código y SQL) y `f952a79` (documentación del método).
- La verificación quedó en FAIL de puerta estricta por criterios sin prueba observable; el dueño aceptó integrar con esos huecos (ver el registro de verificación).
- Pendiente del dueño en producción: definir `GRANOLA_MCP_REDIRECT_URI`, dar de alta el cron `/api/cron/granola` (cada 30 min) y conectar Granola desde Ajustes › Integraciones.

## Decision queue
- [blocking] Q10 — Escribir pruebas de integración con base de datos real para aislamiento entre organizaciones, una sola tarea por paso, vínculo manual intacto, idempotencia de la sincronización y «agregar una sugerencia una sola vez» (dos peticiones simultáneas → una crea, otra 409); hoy solo hay pruebas de funciones puras, evidencia: informe del refutador de pruebas, tareas 6 y 7
- [blocking] Q2 — Probar de punta a punta contra Granola real (clave API y OAuth por MCP) con la BD migrada; las pruebas solo usan datos sintéticos y fuentes falsas, evidencia: tareas 4 y 5
- [review-after] Q3 — La spec se ampló dos veces tras aprobarse en autopiloto (MCP; notas manuales y Notion), registrado en `## Revisions` de la spec, tarea spec
- [review-after] Q4 — Los pasos se detectan del resumen por encabezados y casillas porque ninguna vía de Granola trae un campo de acciones, `granola-parse.ts`, tarea 2
- [review-after] Q5 — El MCP no documenta parámetros ni formato; se usaron los del esquema real de las herramientas y una respuesta real, `granola-mcp.ts`, tarea 5
- [review-after] Q6 — Notion se integra por importación de una página por enlace, no por sincronización de una base, tarea 6
- [review-after] Q7 — El modelo conserva el nombre `GranolaNote` aunque guarda también notas manuales y de Notion (campo `source`), `prisma/schema.prisma`, tarea 1
- [review-after] Q11 — Definir `GRANOLA_MCP_REDIRECT_URI` en producción (sin ella se deriva del origen de la petición), `granola-service.ts`, tarea 7
- [review-after] Q12 — La importación de Notion no limita su ritmo (~3 peticiones/s) y es secuencial por bloque; páginas grandes pueden tardar o recibir 429, `granola-service.ts`, tarea 6
- [review-after] Q13 — Una recomendación aceptada no crea nada (solo queda marcada); si se quería convertirla en tarea, es un cambio de una línea, `suggestions-service.ts`, ampliación 2
- [review-after] Q14 — Generar sugerencias exige el permiso del asistente; agregarlas, solo acceso a citas. El texto de las notas, sin el campo privado, se envía a OpenRouter, `suggestions-service.ts`, ampliación 2
- [review-after] Q17 — `PATCH /api/appointments/:id` devuelve `cancelToken` a cualquier miembro (preexistente); conviene quitarlo, `app/api/appointments/[id]/route.ts`, ampliación 2
- [review-after] Q18 — El resumen de Granola puede reflejar notas privadas del dueño; no hay indicador por sesión para excluirla de la IA, ampliación 2
- [review-after] Q15 — Las citas de seguimiento sugeridas se crean sin tipo de cita (horario apartado) y no se puede editar una sugerencia antes de agregarla, ampliación 2
- [review-after] Q16 — Revisar con modelos reales la calidad de las sugerencias y del prompt; solo se probó la validación de lo que devuelve la IA, ampliación 2
- [review-after] Q8 — El cron `/api/cron/granola` debe darse de alta en cron-job.org (cada 30 min), `CRON.md`, tarea 7
- [review-after] Q9 — Referencia visual de la sección «Reunión» sin aprobar por el dueño; revisar la pantalla real, tarea 8
