---
type: verification
title: Verification — granola-citas — 2026-11-17
description: Veredicto con evidencia de Granola en las citas (clave API, MCP, notas manuales, Notion, página de la cita y sugerencias de IA).
tags: [sdd, verification]
timestamp: 2026-11-17T19:30:00Z
topic: sdd
slug: granola-citas
source_state: 7b73042 (dirty: cambios sin commitear que este registro describe)
---

# Verification — granola-citas — 2026-11-17

Todas las cifras salen de una corrida hecha después de la última edición de código.

## Stack gate (Next.js, sin `scripts/verify.sh` propio: gate genérico del repo)
- `npm test` → 411 pruebas, **404 pasan, 7 fallan**. Con mis cambios en archivos existentes apartados fallan las mismas 7 (navegación, formularios públicos, favicon, color de acción, `DealDetailClient`): son anteriores y ajenas.
- `tsc --noEmit` → 20 errores, igual que la base; 0 en archivos de esta función.
- `eslint` sobre lo nuevo → 0 errores. Dos avisos de `KbMarkdown` ya existían. Un `any` en `app/api/appointments/[id]/route.ts` ya existía.
- `npm run build` → correcto; compila `/appointments/[id]` y las 12 rutas API nuevas.
- `prisma validate` → válido. SQL `granola.up.sql` ejecutado en la base real: 4 tablas creadas; lectura de cada modelo con el cliente de Prisma sin error; las 5 citas existentes intactas.

## Acceptance criteria (spec)
Con prueba automática que falla si se rompe (funciones puras): detección de pasos, lectura del XML del MCP y de la API REST, emparejamiento por horario y correo (incluido el borde de 15 min), mezcla de pasos conservando los convertidos, vista sin secretos, forma de la clave API, validación del callback OAuth, reglas de edición por origen, datos de la tarea (hereda lead y contacto), normalización de lo que devuelve la IA, plan de qué se crea al agregar (tarea, cita, contacto, recomendación; cita vencida rechazada), prompt con datos de terceros delimitados, filtro de privacidad de notas, conversión de Notion a markdown, mapeo de permisos de rutas, ritmo y errores del cliente.

**SIN prueba observable (no ejecutado contra servicios reales):**
- Sincronizar dos veces sin duplicados, vínculo manual intacto, dos sincronizaciones a la vez (solo lógica con Prisma).
- Agregar una sugerencia una sola vez con dos peticiones simultáneas; aislamiento entre organizaciones en consultas y rutas.
- Que ninguna ruta devuelva la clave o tokens (solo está probada la función de vista).
- Conexión real por clave API y por MCP (OAuth), acceso revocado de punta a punta, Notion real, IA real.
- El aspecto de `/appointments/:id` y del markdown estilo `/kb`, y el clic en el título (compilan; no se vieron en un navegador).
- Cron con secreto.

## Rollback plan
- Código: `git revert <sha del commit>`.
- Base: `prisma/sql/granola.down.sql` borra `AppointmentSuggestion`, `GranolaActionItem`, `GranolaNote` y `GranolaConfig`; no toca citas ni tareas. Probado solo `up`, no `down`.
- Sin banderas.

## Capas no ejecutadas
- **NO-APLICA** — mutación de código: no hay herramienta de mutación en el repo.
- **HERRAMIENTA-AUSENTE** — pruebas de integración con base de datos: no hay base de pruebas; nada corrió en su lugar.
- **SUSTITUIDA** — cobertura: no hay umbral configurado (GAP); es un informe, no una puerta, y no detecta que la cobertura baje.
- **SUSTITUIDA** — pruebas de rutas: se sustituyeron por pruebas de las funciones puras que usan; no detectan un `organizationId` omitido en una consulta.

## Hallazgos descartados
- Revisión de seguridad: "fuga entre organizaciones en aceptar/descartar sugerencias" — descartado: todas las consultas de `suggestions-service.ts` llevan `organizationId` (líneas del `findFirst` y del `updateMany`), revisado por dos refutadores; no hay prueba con base de datos que lo demuestre.
- "El texto del proveedor de IA llega al cliente" — descartado: `generateSuggestions` captura el error y devuelve mensajes fijos (`suggestions-service.ts`).

## Verdict: FAIL (puerta estricta) — aceptado por el dueño para integrar
Hay criterios sin evidencia observable (lista arriba), y la puerta es de todo o nada. No hay fallos de pruebas, tipos, lint ni build atribuibles a esta función. El dueño pidió explícitamente ejecutar el SQL y hacer commit y push a `main` a sabiendas de estos huecos; el riesgo es nivel 2 y la aprobación humana quedó dada. Los huecos siguen en la cola de decisiones del avance (Q2 y Q10).
