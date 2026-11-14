---
author: Noeli
branch: main
status: in-progress
---

# Fase 1 CRM: formularios→deal, referidos, etapas, proyecto al ganar, pagos, duplicados

## Intent
Que ningún contacto de formulario se pierda (hoy crea Contact + Task, nunca Deal), saber quién refiere a quién, cubrir el ciclo completo de un servicio (cotizado → entregado) y cobrar a tiempo. Meta: 10 clientes recurrentes en 6 meses; todos los leads vienen de referidos.

## Scope
Dentro (decisiones aprobadas por Noeli):
- Migración aditiva con SQL `.up.sql`/`.down.sql` en `prisma/sql/` + `schema.prisma` al día. No borra nada.
- Formulario → Contact + Deal en etapa "Lead" con `source`.
- `Deal.referredBy` (contacto o cliente) + reporte de referidos por cliente.
- Etapas: Lead → Contactado → Cotizado (reemplaza "Propuesta") → Anticipo pagado → En producción → Entregado → Perdido. Las tres del medio son `isWon`; "Anticipo pagado" crea el proyecto. "Ganado" desaparece como etapa aparte. Segundo pipeline "Noxy Editorial".
- Deal en etapa ganada → proyecto + tareas base (plantilla por servicio), idempotente.
- Pagos: "Vencido" calculado (PENDIENTE con fecha pasada); alerta 2 días antes por WhatsApp.
- Perfil unificado del cliente. Reporte de duplicados (solo lectura).
Fuera: Fases 2-5; deals retroactivos de los 230 contactos (solo reporte); borrar/fusionar sin confirmación; dependencias nuevas.

## Checklist
- [x] 1. SQL up/down + schema.prisma — APLICADO a la BD (14 sentencias OK); `down` no ejecutado ni probado
- [x] 2. Formulario crea deal Lead con source (5 pruebas puras; la ruta no se ejercitó con un envío real)
- [x] 3. Etapas + pipeline Editorial — aplicado a «Noxy Digital»; 2.º dry-run sin cambios (idempotente)
- [x] 4. Ganado → proyecto + tareas base (4 pruebas de plantillas; `ensureProjectForWonDeal` NO probada contra BD)
- [x] 5. Pagos Vencido (calculado) + alerta 2 días (5 pruebas); cron `/api/cron/payment-alerts` creado, FALTA darlo de alta en cron-job.org
- [x] 6. «Referido por» (API, MCP y selector de clientes en el lead) + `/api/reports/referrals` + ficha del cliente (referidos, proyectos, tareas)
- [x] 7. Reporte de duplicados de solo lectura (`/api/reports/duplicates`, 4 pruebas)
- [x] 8. tsc 20 (= base), tests 297: 293 OK y 4 fallan (= base), `next build` OK

## Evidence
- Base inicial: tsc 20; `npm test` 273 pruebas, 269 OK, 4 fallan (preexistentes: contratos de diseño/formularios públicos/favicon).
- Cierre: tsc 20; `npm test` 297 pruebas, 293 OK, 4 fallan (los mismos); `npx next build` termina sin error.
- Un fallo propio detectado y corregido: el color `slate` de TikTok rompía el contrato de tokens de `redesign-screens-contract`; ahora `cyan`.
- BD (Hostinger, `u627288392_noxybd`): SQL aplicado; columnas y tabla nuevas verificadas (11 objetos); etapas de «Noxy Digital» verificadas por consulta. 3 deals siguen en «Ganado» (etapa legado, sin mover).
- Duplicados (corrida de solo lectura): 2 grupos de formularios («Agenda tu demo para tu website», «Solicita información») y 22 grupos de contactos (30 sobrantes).
- NO probado: envío real de formulario → deal; mover un deal a ganado → proyecto; envío de alerta de pago; UI en navegador (no se levantó el servidor).

## Pendientes / decisiones abiertas
- Mover los 3 deals de «Ganado» (legado) a «Entregado» o «En producción».
- La segunda organización «Test Agency» NO se tocó.
- Contenido/videos por cliente no está ligado a `Client` (se resuelve en la Fase 3).
- Selector «Referido por» solo lista clientes; contactos solo por API/MCP.
- «Vencido» en pagos de deal (no mensualidades) aún sin chip en la UI.

## Next
Probar de punta a punta en la app (formulario → deal, ganar → proyecto), dar de alta el cron de alertas y luego arrancar la Fase 2.
