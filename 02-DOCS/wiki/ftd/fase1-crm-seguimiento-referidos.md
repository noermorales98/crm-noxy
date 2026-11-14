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
- [x] 1. SQL up/down + schema.prisma (`prisma validate` y `generate` OK; SQL NO aplicado a la BD: falta OK de Noeli)
- [x] 2. Formulario crea deal Lead con source (5 pruebas puras OK; ruta NO probada contra BD real todavía)
- [ ] 3. Etapas + pipeline Editorial (script idempotente; prueba: dry-run lista cambios)
- [ ] 4. Ganado → proyecto + tareas base (prueba: test de plantilla e idempotencia)
- [ ] 5. Pagos vencidos + alerta 2 días (prueba: test de cálculo de fechas)
- [ ] 6. Reporte de referidos + perfil unificado (prueba: test de agregación + tsc)
- [ ] 7. Reporte de duplicados (prueba: test de normalización/agrupado)
- [ ] 8. tsc, tests y build sin regresiones vs. base (tsc 20 errores, tests 241/245 al inicio, según doc anterior)

## Evidence
- Base antes de cambiar: tsc 20 errores; `npm test` 273 pruebas, 269 OK, 4 fallan (preexistentes, no son de esta función).
- Paso 1: `npx prisma validate` → schema válido; `prisma generate` OK; tsc sigue en 20. SQL: `prisma/sql/fase1_crm.up.sql` / `.down.sql`. No ejecutado en ninguna BD.
- Paso 2: `node --test src/lib/form-lead.test.ts` → 5/5. `src/lib/form-lead.ts` (fuente, etapa Lead, título); integrado en `submit/route.ts` con try/catch. TIKTOK/FACEBOOK añadidos a UI y MCP. tsc 20.
- Riesgo: con el cliente Prisma regenerado y la BD sin migrar, las consultas a Deal/Project/Payment fallan. Aplicar el SQL ANTES de desplegar.

## Next
Aplicar `fase1_crm.up.sql` a la BD (con OK de Noeli), luego paso 3 (etapas y pipeline Editorial).
